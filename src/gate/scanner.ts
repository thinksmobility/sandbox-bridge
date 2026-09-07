import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { scanBrand } from './rules/brand.js'
import { scanCredentials } from './rules/credentials.js'
import { scanForbiddenFile } from './rules/forbidden-files.js'
import { scanPii } from './rules/pii.js'
import type { Finding } from './types.js'

const DEFAULT_SKIP_DIRS = new Set(['node_modules', '.git', '.turbo', '.cache', '.expo', 'web-build'])

/**
 * Paket yöneticisi kilit dosyaları: üçüncü taraf bağımlılıkların registry
 * metadata'sını (ör. bakımcı e-postaları) taşıyabilir — bunlar bizim
 * markamız/sırrımız/verimiz değildir, varsayılan olarak taranmaz.
 */
const DEFAULT_SKIP_FILE_BASENAMES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'])

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.bmp',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp4',
  '.mov',
  '.zip',
  '.gz',
  '.pdf',
  '.jar',
  '.wasm',
  '.map'
])

const DEFAULT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/** Bu uzunluğu aşan bir satır varsa dosya "minified/bundled" sayılır. */
const MINIFIED_LINE_LENGTH_THRESHOLD = 1000

export interface ScannerOptions {
  /** Marka deny-list'ine eklenecek ek terimler (allow-list istisnası DEĞİL). */
  extraDenyTerms?: readonly string[]
  /** `root`'a göre yol öneki bazlı yok-say listesi (basit glob değil). */
  ignorePrefixes?: readonly string[]
  skipDirs?: readonly string[]
  /** Dosya adına (basename) göre ek atlama listesi — varsayılan kilit dosyalarına eklenir. */
  skipFiles?: readonly string[]
  /** Bu boyuttan büyük dosyalar içerik taramadan atlanır (varsayılan 5 MB) — sessizce değil, `scan-skipped-large-file` bulgusuyla. */
  maxFileSizeBytes?: number
}

export interface ScanResult {
  findings: Finding[]
  scannedFiles: number
}

function loadGitignorePrefixes(root: string): string[] {
  const gitignorePath = join(root, '.gitignore')
  if (!existsSync(gitignorePath)) return []
  return readFileSync(gitignorePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.replace(/^\/+/, '').replace(/\/+$/, ''))
}

function isLikelyBinary(filePath: string, buffer: Buffer): boolean {
  if (BINARY_EXTENSIONS.has(extname(filePath).toLowerCase())) return true
  const sampleLength = Math.min(buffer.length, 8000)
  for (let i = 0; i < sampleLength; i += 1) {
    if (buffer[i] === 0) return true
  }
  return false
}

function isIgnored(relativePath: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => prefix.length > 0 && (relativePath === prefix || relativePath.startsWith(`${prefix}/`)))
}

type EntryKind = { kind: 'dir' | 'file'; realPath: string } | { kind: 'skip' }

/**
 * Bir dizin girdisinin türünü çözer. Sembolik linkler `realpathSync` ile
 * çözülür (kırık link → skip); gerçek hedefin türüne göre 'dir'/'file'
 * döner. Döngü koruması çağıran `walk()`'taki `visitedRealDirs` kümesiyle
 * yapılır — buradaki `realPath` o kümeye eklenecek anahtardır.
 */
function resolveEntry(fullPath: string): EntryKind {
  let lst: ReturnType<typeof lstatSync>
  try {
    lst = lstatSync(fullPath)
  } catch {
    return { kind: 'skip' }
  }

  if (lst.isSymbolicLink()) {
    let realPath: string
    let target: ReturnType<typeof statSync>
    try {
      realPath = realpathSync(fullPath)
      target = statSync(realPath)
    } catch {
      return { kind: 'skip' } // kırık sembolik link
    }
    if (target.isDirectory()) return { kind: 'dir', realPath }
    if (target.isFile()) return { kind: 'file', realPath }
    return { kind: 'skip' }
  }

  if (lst.isDirectory()) return { kind: 'dir', realPath: fullPath }
  if (lst.isFile()) return { kind: 'file', realPath: fullPath }
  return { kind: 'skip' }
}

function walk(
  root: string,
  current: string,
  skipDirs: ReadonlySet<string>,
  skipFiles: ReadonlySet<string>,
  ignorePrefixes: readonly string[],
  out: string[],
  visitedRealDirs: Set<string>
): void {
  let entries: string[]
  try {
    entries = readdirSync(current)
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(current, entry)
    const rel = relative(root, fullPath)
    const resolved = resolveEntry(fullPath)
    if (resolved.kind === 'skip') continue

    if (resolved.kind === 'dir') {
      if (skipDirs.has(entry)) continue
      if (isIgnored(rel, ignorePrefixes)) continue
      // Sembolik link döngüsü (ya da aynı dizine çoklu link) koruması:
      // gerçek yol daha önce ziyaret edildiyse tekrar girilmez.
      if (visitedRealDirs.has(resolved.realPath)) continue
      visitedRealDirs.add(resolved.realPath)
      walk(root, fullPath, skipDirs, skipFiles, ignorePrefixes, out, visitedRealDirs)
    } else {
      if (skipFiles.has(entry)) continue
      if (isIgnored(rel, ignorePrefixes)) continue
      out.push(fullPath)
    }
  }
}

/**
 * Bir dizini (kaynak veya build çıktısı) yürüyerek tüm gate kurallarını
 * uygular. `.gitignore`'a saygı gösterir (basit satır-öneki eşleşmesi),
 * ikili dosyaları atlar, sembolik link döngülerine karşı korumalıdır.
 * Dönen dosya yolları `root`'a görelidir.
 */
export function scanDirectory(root: string, options: ScannerOptions = {}): ScanResult {
  const findings: Finding[] = []
  if (!existsSync(root)) return { findings, scannedFiles: 0 }

  const skipDirs = new Set([...DEFAULT_SKIP_DIRS, ...(options.skipDirs ?? [])])
  const skipFiles = new Set([...DEFAULT_SKIP_FILE_BASENAMES, ...(options.skipFiles ?? [])])
  const ignorePrefixes = [...loadGitignorePrefixes(root), ...(options.ignorePrefixes ?? [])]
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES

  const visitedRealDirs = new Set<string>()
  try {
    visitedRealDirs.add(realpathSync(root))
  } catch {
    return { findings, scannedFiles: 0 }
  }

  const files: string[] = []
  walk(root, root, skipDirs, skipFiles, ignorePrefixes, files, visitedRealDirs)

  let scannedFiles = 0
  for (const filePath of files) {
    const relativePath = relative(root, filePath)

    const forbidden = scanForbiddenFile(relativePath)
    if (forbidden) findings.push(forbidden)

    let stats: ReturnType<typeof statSync>
    try {
      stats = statSync(filePath)
    } catch {
      continue
    }

    if (stats.size > maxFileSizeBytes) {
      // Sessizce atlanmaz: büyük dosya taranmadığı için bir bulgu üretilir,
      // gerektiğinde `ignore`/`skipFiles` ile bilinçli olarak susturulur.
      findings.push({
        rule: 'scan-skipped-large-file',
        file: relativePath,
        line: 0,
        excerpt: `${(stats.size / (1024 * 1024)).toFixed(1)} MB (limit ${(maxFileSizeBytes / (1024 * 1024)).toFixed(1)} MB) — içerik taranmadı`
      })
      continue
    }

    let buffer: Buffer
    try {
      buffer = readFileSync(filePath)
    } catch {
      continue
    }
    if (isLikelyBinary(filePath, buffer)) continue

    const content = buffer.toString('utf8')
    scannedFiles += 1
    // Minified/bundled çıktıda (tek satırda binlerce karakter — font hash,
    // bezier easing katsayısı, worklet hash vb.) TC/telefon sayısal
    // kuralları yanlış pozitif üretiyor (gerçek olay). Marka ve credential
    // kuralları böyle dosyalarda da aynen uygulanmaya devam eder.
    const isMinifiedLike = content.split('\n').some((line) => line.length > MINIFIED_LINE_LENGTH_THRESHOLD)
    findings.push(...scanBrand(content, relativePath, options.extraDenyTerms))
    findings.push(...scanCredentials(content, relativePath))
    findings.push(...scanPii(content, relativePath, { includeNumericRules: !isMinifiedLike }))
  }

  return { findings, scannedFiles }
}
