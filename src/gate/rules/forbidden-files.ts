import type { Finding } from '../types.js'

const EXACT_FORBIDDEN_NAMES = new Set(['google-services.json', 'GoogleService-Info.plist', 'eas.json'])

const FORBIDDEN_EXTENSIONS = ['.keystore', '.p8', '.p12', '.mobileprovision']

function isEnvFile(basename: string): boolean {
  if (!basename.startsWith('.env')) return false
  return basename !== '.env.example'
}

function basenameOf(relativePath: string): string {
  const parts = relativePath.split('/')
  return parts[parts.length - 1] ?? relativePath
}

/**
 * Tek bir dosya yolunu yasak dosya listesine göre kontrol eder. Eşleşme yoksa
 * `null` döner. `.env.example` açık istisnadır; diğer `.env*` dosyaları
 * (`.env`, `.env.local`, `.env.production` vb.) yasaktır.
 */
export function scanForbiddenFile(relativePath: string): Finding | null {
  const basename = basenameOf(relativePath)

  if (EXACT_FORBIDDEN_NAMES.has(basename)) {
    return { rule: 'forbidden-file', file: relativePath, line: 0, excerpt: basename }
  }
  if (isEnvFile(basename)) {
    return { rule: 'forbidden-file', file: relativePath, line: 0, excerpt: basename }
  }
  if (FORBIDDEN_EXTENSIONS.some((ext) => basename.toLowerCase().endsWith(ext))) {
    return { rule: 'forbidden-file', file: relativePath, line: 0, excerpt: basename }
  }
  return null
}
