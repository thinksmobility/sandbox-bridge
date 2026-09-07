import { execFileSync, execSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const BIN_PATH = resolve('dist/gate/bin.js')

/**
 * Regresyon: VoltGo `@tmob/sandbox-bridge`'i `file:../sandbox-bridge` ile
 * kurduğunda `npx sandbox-gate` hiçbir çıktı üretmeden sessizce çıkıyordu.
 * Kök neden: eski CLI, `import.meta.url === file://${process.argv[1]}`
 * karşılaştırmasıyla "ben mi doğrudan çalıştırıldım" kontrolü yapıyordu —
 * paket bir symlink üzerinden kurulduğunda argv[1] (symlink yolu) ile
 * import.meta.url (Node'un çözdüğü gerçek yol) asla eşleşmiyordu. Fix:
 * `bin/` girişi (`src/gate/bin.ts`) artık koşulsuz çalışır, hiç böyle bir
 * karşılaştırma yapmaz. Bu test gerçek bir `node <symlink> ...` alt süreci
 * çalıştırarak bunu uçtan uca kanıtlar.
 */
describe('gate/bin — symlink kurulum regresyonu', () => {
  beforeAll(() => {
    if (!existsSync(BIN_PATH)) {
      execSync('npm run build', { stdio: 'ignore' })
    }
  })

  it('bin dosyası bir symlink üzerinden çalıştırıldığında sessizce çıkmaz, gerçekten koşar', () => {
    const workDir = mkdtempSync(join(tmpdir(), 'sandbox-gate-symlink-'))
    try {
      const symlinkedBin = join(workDir, 'sandbox-gate-symlinked.js')
      symlinkSync(BIN_PATH, symlinkedBin)

      const srcDir = join(workDir, 'src')
      mkdirSync(srcDir, { recursive: true })
      writeFileSync(join(srcDir, 'index.ts'), "export const clean = 'ok'\n")

      const reportPath = join(workDir, 'gate-report.json')
      const stdout = execFileSync('node', [symlinkedBin, '--src', srcDir, '--report', reportPath], {
        encoding: 'utf8'
      })

      expect(stdout).toContain('sandbox-gate: PASS')
      expect(existsSync(reportPath)).toBe(true)
      const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { pass: boolean; scannedFiles: number }
      expect(report.pass).toBe(true)
      expect(report.scannedFiles).toBeGreaterThan(0)
    } finally {
      rmSync(workDir, { recursive: true, force: true })
    }
  })

  it('var olmayan --src dizini için sessizce çıkmaz: stderr mesajı + exit 2', () => {
    const workDir = mkdtempSync(join(tmpdir(), 'sandbox-gate-missing-'))
    try {
      const symlinkedBin = join(workDir, 'sandbox-gate-symlinked.js')
      symlinkSync(BIN_PATH, symlinkedBin)
      const reportPath = join(workDir, 'gate-report.json')

      let threw = false
      try {
        execFileSync('node', [symlinkedBin, '--src', join(workDir, 'does-not-exist'), '--report', reportPath], {
          encoding: 'utf8'
        })
      } catch (error) {
        threw = true
        const err = error as { status: number; stderr: string }
        expect(err.status).toBe(2)
        expect(err.stderr).toContain('bulunamadı')
      }
      expect(threw).toBe(true)
    } finally {
      rmSync(workDir, { recursive: true, force: true })
    }
  })
})
