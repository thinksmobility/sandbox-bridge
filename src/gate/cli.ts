#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { buildReport, formatReportJson } from './report.js'
import { scanDirectory } from './scanner.js'
import type { Finding } from './types.js'

interface CliOptions {
  src: string
  out?: string
  report: string
  config?: string
  help: boolean
}

interface GateConfig {
  extraDenyTerms?: string[]
  ignore?: string[]
  skipDirs?: string[]
  skipFiles?: string[]
  maxFileSizeBytes?: number
}

function log(message: string): void {
  process.stdout.write(`${message}\n`)
}

function logError(message: string): void {
  process.stderr.write(`${message}\n`)
}

export function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = { src: '.', report: 'gate-report.json', help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    switch (arg) {
      case '--src':
        options.src = argv[i + 1] ?? options.src
        i += 1
        break
      case '--out':
        options.out = argv[i + 1]
        i += 1
        break
      case '--report':
        options.report = argv[i + 1] ?? options.report
        i += 1
        break
      case '--config':
        options.config = argv[i + 1]
        i += 1
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        break
    }
  }
  return options
}

function loadConfig(configPath: string | undefined): GateConfig {
  if (!configPath || !existsSync(configPath)) return {}
  const raw = readFileSync(configPath, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null) return {}
  const candidate = parsed as Record<string, unknown>
  return {
    extraDenyTerms: Array.isArray(candidate.extraDenyTerms) ? candidate.extraDenyTerms.map(String) : undefined,
    ignore: Array.isArray(candidate.ignore) ? candidate.ignore.map(String) : undefined,
    skipDirs: Array.isArray(candidate.skipDirs) ? candidate.skipDirs.map(String) : undefined,
    skipFiles: Array.isArray(candidate.skipFiles) ? candidate.skipFiles.map(String) : undefined,
    maxFileSizeBytes: typeof candidate.maxFileSizeBytes === 'number' ? candidate.maxFileSizeBytes : undefined
  }
}

function prefixFindings(findings: readonly Finding[], rootLabel: string): Finding[] {
  return findings.map((finding) => ({ ...finding, file: join(rootLabel, finding.file) }))
}

function printHelp(): void {
  log('sandbox-gate — marka/sır/PII tarama kapısı')
  log('')
  log('Kullanım: sandbox-gate --src <dizin> [--out <build-dizini>] [--report <dosya>] [--config <dosya>]')
  log('')
  log('  --src      Taranacak kaynak dizini (varsayılan: .)')
  log('  --out      Taranacak build çıktısı dizini (opsiyonel)')
  log('  --report   Rapor dosyası yolu (varsayılan: gate-report.json)')
  log('  --config   sandbox-gate.config.json yolu (opsiyonel)')
}

/**
 * Gate'i çalıştırır, raporu diske yazar ve exit code döner (0 = PASS, 1 = FAIL).
 * Doğrudan test edilebilir olsun diye `process.exit` çağırmaz.
 */
export function runGate(argv: readonly string[]): number {
  const options = parseArgs(argv)
  if (options.help) {
    printHelp()
    return 0
  }

  const config = loadConfig(options.config)
  const scannerOptions = {
    extraDenyTerms: config.extraDenyTerms,
    ignorePrefixes: config.ignore,
    skipDirs: config.skipDirs,
    skipFiles: config.skipFiles,
    maxFileSizeBytes: config.maxFileSizeBytes
  }

  const srcRoot = resolve(options.src)
  const srcResult = scanDirectory(srcRoot, scannerOptions)
  let findings: Finding[] = prefixFindings(srcResult.findings, options.src)
  let scannedFiles = srcResult.scannedFiles

  if (options.out) {
    const outRoot = resolve(options.out)
    const outResult = scanDirectory(outRoot, scannerOptions)
    findings = [...findings, ...prefixFindings(outResult.findings, options.out)]
    scannedFiles += outResult.scannedFiles
  }

  const report = buildReport(findings, scannedFiles)
  writeFileSync(resolve(options.report), formatReportJson(report), 'utf8')

  if (report.pass) {
    log(`sandbox-gate: PASS (${scannedFiles} dosya tarandı, ${options.report} yazıldı)`)
    return 0
  }

  logError(`sandbox-gate: FAIL — ${report.findings.length} bulgu (${options.report} yazıldı)`)
  for (const finding of report.findings.slice(0, 20)) {
    logError(`  [${finding.rule}] ${finding.file}:${finding.line} ${finding.excerpt}`)
  }
  if (report.findings.length > 20) {
    logError(`  … ve ${report.findings.length - 20} bulgu daha (${options.report} içinde tamamı)`)
  }
  return 1
}

const isMainModule = typeof process.argv[1] === 'string' && import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  process.exit(runGate(process.argv.slice(2)))
}
