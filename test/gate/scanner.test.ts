import { describe, expect, it } from 'vitest'
import { scanDirectory } from '../../src/gate/scanner.js'

const CLEAN_REPO = 'test/fixtures/gate/clean-repo'
const VIOLATION_REPO = 'test/fixtures/gate/violation-repo'

describe('gate/scanner scanDirectory', () => {
  it('temiz depoda hiç bulgu üretmez', () => {
    const result = scanDirectory(CLEAN_REPO)
    expect(result.findings).toEqual([])
    expect(result.scannedFiles).toBeGreaterThan(0)
  })

  it('.gitignore\'daki dizini tarama dışı bırakır (içinde marka+sır olsa da)', () => {
    const result = scanDirectory(CLEAN_REPO)
    const fromIgnoredDir = result.findings.filter((f) => f.file.startsWith('ignored-dir/'))
    expect(fromIgnoredDir).toEqual([])
  })

  it('ikili dosyaları içerik taramasından atlar (uzantıya göre)', () => {
    const result = scanDirectory(CLEAN_REPO)
    const fromBinary = result.findings.filter((f) => f.file.includes('logo.png'))
    expect(fromBinary).toEqual([])
  })

  it('ihlal deposunda marka + credential + PII + yasak dosya bulgularının hepsini üretir', () => {
    const result = scanDirectory(VIOLATION_REPO)
    const rules = new Set(result.findings.map((f) => f.rule))
    expect(rules.has('brand-denylist')).toBe(true)
    expect(rules.has('credential-google-api-key')).toBe(true)
    expect(rules.has('pii-tc-kimlik')).toBe(true)
    expect(rules.has('forbidden-file')).toBe(true)
  })

  it('yasak uzantılı ikili dosyayı içerik taramadan bağımsız olarak yine de işaretler', () => {
    const result = scanDirectory(VIOLATION_REPO)
    const p12Finding = result.findings.find((f) => f.file.endsWith('service-account.p12'))
    expect(p12Finding).toBeDefined()
    expect(p12Finding?.rule).toBe('forbidden-file')
  })

  it('ignorePrefixes opsiyonuyla belirli bir alt dizini hariç tutar', () => {
    const result = scanDirectory(VIOLATION_REPO, { ignorePrefixes: ['src'] })
    expect(result.findings.every((f) => !f.file.startsWith('src/'))).toBe(true)
  })

  it('sembolik link döngüsünde sonsuz döngüye girmeden sonlanır (döngü koruması)', () => {
    const result = scanDirectory('test/fixtures/gate/symlink-cycle')
    expect(result.scannedFiles).toBe(1)
    expect(result.findings).toEqual([])
  })

  it('maxFileSizeBytes aşan dosyayı sessizce atlamaz, scan-skipped-large-file bulgusu üretir', () => {
    const result = scanDirectory(CLEAN_REPO, { maxFileSizeBytes: 10 })
    const largeFileFindings = result.findings.filter((f) => f.rule === 'scan-skipped-large-file')
    expect(largeFileFindings.length).toBeGreaterThan(0)
    expect(largeFileFindings.some((f) => f.file === 'src/index.ts')).toBe(true)
    // Büyük dosya için normal içerik-taraması bulguları (brand/credential/pii) üretilmez.
    expect(result.findings.some((f) => f.file === 'src/index.ts' && f.rule !== 'scan-skipped-large-file')).toBe(false)
  })

  it('var olmayan dizin için boş sonuç döner (fırlatmaz)', () => {
    const result = scanDirectory('test/fixtures/gate/does-not-exist')
    expect(result).toEqual({ findings: [], scannedFiles: 0 })
  })

  it('paket kilit dosyalarını (package-lock.json vb.) varsayılan olarak atlar', () => {
    const result = scanDirectory(CLEAN_REPO, { skipDirs: [] })
    expect(result.findings.every((f) => !f.file.endsWith('package-lock.json') && !f.file.endsWith('yarn.lock'))).toBe(
      true
    )
  })

  it('bulunan dosya yolları root\'a göre görelidir', () => {
    const result = scanDirectory(VIOLATION_REPO)
    for (const finding of result.findings) {
      expect(finding.file.startsWith('/')).toBe(false)
    }
  })
})
