import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GateReport } from '../../src/gate/report.js'
import { parseArgs, runGate } from '../../src/gate/cli.js'

const CLEAN_REPO = 'test/fixtures/gate/clean-repo'
const VIOLATION_REPO = 'test/fixtures/gate/violation-repo'

describe('gate/cli parseArgs', () => {
  it('varsayılanları doldurur', () => {
    expect(parseArgs([])).toEqual({ src: '.', report: 'gate-report.json', help: false })
  })

  it('tüm bayrakları ayrıştırır', () => {
    const options = parseArgs(['--src', 'a', '--out', 'b', '--report', 'c.json', '--config', 'd.json'])
    expect(options).toEqual({ src: 'a', out: 'b', report: 'c.json', config: 'd.json', help: false })
  })

  it('--help bayrağını tanır', () => {
    expect(parseArgs(['--help']).help).toBe(true)
    expect(parseArgs(['-h']).help).toBe(true)
  })
})

describe('gate/cli runGate', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'sandbox-gate-cli-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  it('temiz depoda PASS döner, exit code 0, rapor dosyası yazılır', () => {
    const reportPath = join(workDir, 'gate-report.json')
    const exitCode = runGate(['--src', CLEAN_REPO, '--report', reportPath])

    expect(exitCode).toBe(0)
    expect(existsSync(reportPath)).toBe(true)

    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as GateReport
    expect(report.pass).toBe(true)
    expect(report.findings).toEqual([])
  })

  it('ihlal deposunda FAIL döner, exit code 1, bulgular maskeli rapora yazılır', () => {
    const reportPath = join(workDir, 'gate-report.json')
    const exitCode = runGate(['--src', VIOLATION_REPO, '--report', reportPath])

    expect(exitCode).toBe(1)
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as GateReport
    expect(report.pass).toBe(false)
    expect(report.findings.length).toBeGreaterThan(0)

    for (const finding of report.findings) {
      expect(finding.excerpt).not.toContain('AIzaSyD1234567890abcdefghijklmnopqrstuv')
      expect(finding.excerpt).not.toContain('12345678950')
    }
  })

  it('--out verilirse build çıktısı da taranır ve dosya yolu önekiyle raporlanır', () => {
    const reportPath = join(workDir, 'gate-report.json')
    const exitCode = runGate(['--src', CLEAN_REPO, '--out', VIOLATION_REPO, '--report', reportPath])

    expect(exitCode).toBe(1)
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as GateReport
    expect(report.findings.some((f) => f.file.startsWith(`${VIOLATION_REPO}/`))).toBe(true)
  })

  it('--config ile extraDenyTerms uygulanır', () => {
    const configPath = join(workDir, 'sandbox-gate.config.json')
    const reportPath = join(workDir, 'gate-report.json')
    const fixtureDir = join(workDir, 'src')
    mkdirSync(fixtureDir, { recursive: true })
    writeFileSync(join(fixtureDir, 'index.ts'), "const x = 'preprod-only-host'\n")
    writeFileSync(configPath, JSON.stringify({ extraDenyTerms: ['preprod-only-host'] }))

    const exitCode = runGate(['--src', fixtureDir, '--report', reportPath, '--config', configPath])
    expect(exitCode).toBe(1)
  })

  it('var olmayan --src dizini için sessizce çıkmaz: exit 2, rapor yazmaz', () => {
    const reportPath = join(workDir, 'gate-report.json')
    const exitCode = runGate(['--src', join(workDir, 'does-not-exist'), '--report', reportPath])
    expect(exitCode).toBe(2)
    expect(existsSync(reportPath)).toBe(false)
  })

  it('var olmayan --out dizini için sessizce çıkmaz: exit 2', () => {
    const reportPath = join(workDir, 'gate-report.json')
    const exitCode = runGate(['--src', CLEAN_REPO, '--out', join(workDir, 'does-not-exist'), '--report', reportPath])
    expect(exitCode).toBe(2)
  })

  it('0 dosya taranırsa (boş dizin) sessizce PASS gibi görünmez: exit 2', () => {
    const emptyDir = join(workDir, 'empty')
    mkdirSync(emptyDir, { recursive: true })
    const reportPath = join(workDir, 'gate-report.json')
    const exitCode = runGate(['--src', emptyDir, '--report', reportPath])
    expect(exitCode).toBe(2)
    // Denetim izi için rapor yine de yazılır, ama exit code PASS değildir.
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as GateReport
    expect(report.scannedFiles).toBe(0)
  })

  it('--help ile 0 döner ve rapor dosyası yazmaz', () => {
    const reportPath = join(workDir, 'gate-report.json')
    const exitCode = runGate(['--help', '--report', reportPath])
    expect(exitCode).toBe(0)
    expect(existsSync(reportPath)).toBe(false)
  })
})
