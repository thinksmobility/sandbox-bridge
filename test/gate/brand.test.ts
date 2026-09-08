import { describe, expect, it } from 'vitest'
import { DENY_TERMS, scanBrand } from '../../src/gate/rules/brand.js'

describe('gate/rules/brand — varsayılan (marka-bağımsız) deny-list', () => {
  it('DENY_TERMS hiçbir somut marka adı içermez, yalnızca ortam kalıpları taşır', () => {
    expect(DENY_TERMS).toEqual(['ssotest', 'preprod'])
    // v0.3.6: demoların kendi hosting alan adı (tmoblabs.com) yerleşik listede OLAMAZ
    expect(DENY_TERMS).not.toContain('tmoblabs.com')
  })

  it('bilinen iç ortam host kalıbını (ssotest) büyük/küçük harf duyarsız yakalar', () => {
    const findings = scanBrand("const host = 'admin.SSOTEST.example.internal'", 'src/config.ts')
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ rule: 'brand-denylist', file: 'src/config.ts', line: 1 })
  })

  it('eşleşen kısmı maskeler, tamamını rapora yazmaz', () => {
    const findings = scanBrand("const host = 'preprod.internal'", 'src/config.ts')
    expect(findings[0]?.excerpt).not.toContain('preprod')
    expect(findings[0]?.excerpt).toContain('*******')
  })

  it('deny-list dışı temiz içerikte bulgu üretmez', () => {
    const findings = scanBrand('VoltGo, sürdürülebilir şarj ağı sunar.', 'src/copy.ts')
    expect(findings).toHaveLength(0)
  })
})

describe('gate/rules/brand — extraDenyTerms (somut marka isimleri BURADAN eklenir)', () => {
  it('extraDenyTerms ile eklenen kurgusal marka adını yakalar', () => {
    const findings = scanBrand("const brand = 'AcmeSigorta'", 'src/theme.ts', ['AcmeSigorta'])
    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('brand-denylist')
  })

  it('extraDenyTerms olmadan aynı kurgusal marka adı bulgu üretmez (paket kendi başına marka bilmez)', () => {
    const findings = scanBrand("const brand = 'AcmeSigorta'", 'src/theme.ts')
    expect(findings).toHaveLength(0)
  })

  it('extraDenyTerms de Türkçe karakter duyarsız eşleşir (İ/I/ı/i, ç)', () => {
    const findings = scanBrand('ACME OTOKİRALAMA filosu', 'src/copy.ts', ['otokiralama'])
    expect(findings).toHaveLength(1)
  })

  it('birden fazla satırda birden fazla eşleşmeyi ayrı ayrı raporlar', () => {
    const content = ['AcmeCorp logosu', 'temiz satır', 'ExampleBank ile anlaşma'].join('\n')
    const findings = scanBrand(content, 'src/copy.ts', ['AcmeCorp', 'ExampleBank'])
    expect(findings.map((f) => f.line)).toEqual([1, 3])
  })

  it('≤4 karakterlik kısa terim, minified kodda başka bir tanımlayıcının içine gömülüyse eşleşmez', () => {
    const findings = scanBrand('function pushAbcDiff(){}', 'dist/entry.js', ['abc'])
    expect(findings).toHaveLength(0)
  })

  it('≤4 karakterlik kısa terim tek başına/sınırlı geçtiğinde eşleşir', () => {
    expect(scanBrand('const abc = brand', 'a.ts', ['abc'])).toHaveLength(1)
    expect(scanBrand("id: 'abc-item'", 'a.ts', ['abc'])).toHaveLength(1)
    expect(scanBrand('(abc)', 'a.ts', ['abc'])).toHaveLength(1)
  })

  it('5+ karakterlik terimler için mevcut substring davranışı korunur (birleşik geçebilir)', () => {
    const findings = scanBrand('brandnameSuffix', 'a.ts', ['brandname'])
    expect(findings).toHaveLength(1)
  })
})
