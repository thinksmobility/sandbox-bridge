import { describe, expect, it } from 'vitest'
import { scanPii } from '../../src/gate/rules/pii.js'

describe('gate/rules/pii — TC Kimlik No', () => {
  it('checksum\'ı GEÇEN 11 haneli numarayı yakalar (gerçek görünen veri)', () => {
    const findings = scanPii('tc: 12345678950', 'seed/customers.json')
    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('pii-tc-kimlik')
    expect(findings[0]?.excerpt).not.toContain('12345678950')
  })

  it('checksum\'ı GEÇMEYEN seed numarasını serbest bırakır', () => {
    const findings = scanPii('tc: 12345678999', 'seed/customers.json')
    expect(findings).toHaveLength(0)
  })

  it("ilk hanesi '0' olan 11 haneyi asla geçerli saymaz", () => {
    const findings = scanPii('tc: 01234567890', 'seed/customers.json')
    expect(findings).toHaveLength(0)
  })

  it('11 haneden uzun/kısa dizileri TC olarak değerlendirmez', () => {
    const findings = scanPii('order: 123456789501234', 'seed/orders.json')
    expect(findings).toHaveLength(0)
  })
})

describe('gate/rules/pii — telefon', () => {
  it('rezerve test aralığındaki numarayı (+90 555 000 XX XX) serbest bırakır', () => {
    const findings = scanPii('tel: +90 555 000 12 34', 'seed/customers.json')
    expect(findings).toHaveLength(0)
  })

  it('rezerve aralık dışındaki gerçek görünen numarayı yakalar', () => {
    const findings = scanPii('tel: +90 532 123 45 67', 'seed/customers.json')
    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('pii-phone')
  })

  it('0 önekli yerel formatı da değerlendirir', () => {
    const findings = scanPii('tel: 0532 123 45 67', 'seed/customers.json')
    expect(findings).toHaveLength(1)
  })

  it('minified JS içindeki uzun ondalık sabitlerde (bezier easing vb.) yanlış pozitif üretmez', () => {
    const findings = scanPii('var e=t-.54545454545454;return 7.5625*e*e', 'dist/entry.js')
    expect(findings).toHaveLength(0)
  })

  it('uzun rastgele basamak dizisi içinden 10 haneli bir pencereyi telefon sanmaz', () => {
    const findings = scanPii('const k=123455512345678901234;', 'dist/entry.js')
    expect(findings).toHaveLength(0)
  })
})

describe('gate/rules/pii — e-posta', () => {
  it('@example.com alan adını serbest bırakır', () => {
    expect(scanPii('mail: deniz@example.com', 'seed/customers.json')).toHaveLength(0)
  })

  it('*.demo alan adını serbest bırakır', () => {
    expect(scanPii('mail: deniz@voltgo.demo', 'seed/customers.json')).toHaveLength(0)
  })

  it('izinli olmayan gerçek görünen alan adını yakalar', () => {
    const findings = scanPii('mail: deniz.yilmaz@gmail.com', 'seed/customers.json')
    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('pii-email')
    expect(findings[0]?.excerpt).not.toContain('deniz.yilmaz@gmail.com')
  })

  it('paket-sürüm dizgesini (pnpm@11.1.2 gibi) e-posta sanmaz', () => {
    expect(scanPii('corepack prepare pnpm@11.1.2 --activate', 'package.json')).toHaveLength(0)
    expect(scanPii('"packageManager": "pnpm@11.1.2"', 'package.json')).toHaveLength(0)
  })

  it('harfle biten kısa alan adını (a@b.co) yakalar', () => {
    const findings = scanPii('mail: a@b.co', 'seed/customers.json')
    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('pii-email')
  })

  it('izinli olmayan gerçek görünen alan adını (harfli TLD) yakalar', () => {
    const findings = scanPii('mail: ali@ornekfirma.com', 'seed/customers.json')
    expect(findings).toHaveLength(1)
  })

  it('retina asset adlarını (icon@2x.png, logo@3x.jpg) e-posta sanmaz', () => {
    expect(scanPii("<img src='./icon@2x.png' />", 'src/App.tsx')).toHaveLength(0)
    expect(scanPii('background: url(logo@3x.jpg)', 'src/App.tsx')).toHaveLength(0)
    expect(scanPii('photo@2x.jpeg photo@2x.webp photo@2x.gif photo@2x.svg', 'a.tsx')).toHaveLength(0)
  })

  it('gerçek e-posta hâlâ yakalanır (regresyon: retina muafiyeti aşırı geniş değil)', () => {
    expect(scanPii('mail: ali@example.com', 'a.ts')).toHaveLength(0) // izinli domain
    expect(scanPii('mail: ali@ornekfirma.com', 'a.ts')).toHaveLength(1) // izinli değil, yakalanır
  })

  it('pnpm@11.1.2 hâlâ eşleşmez (regresyon)', () => {
    expect(scanPii('"packageManager": "pnpm@11.1.2"', 'package.json')).toHaveLength(0)
  })
})

describe('gate/rules/pii — includeNumericRules:false (minified bundle muafiyeti)', () => {
  it('checksum geçerli TC ve rezerve-dışı telefon numarasını atlar', () => {
    const content = 'tc: 12345678950 tel: +90 532 123 45 67'
    expect(scanPii(content, 'dist/entry.js', { includeNumericRules: false })).toHaveLength(0)
  })

  it('e-posta kuralı etkilenmez (yalnızca sayısal kurallar kapanır)', () => {
    const findings = scanPii('mail: deniz.yilmaz@gmail.com', 'dist/entry.js', { includeNumericRules: false })
    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('pii-email')
  })

  it('varsayılan (parametre verilmezse) sayısal kurallar açıktır', () => {
    expect(scanPii('tc: 12345678950', 'a.ts')).toHaveLength(1)
  })
})
