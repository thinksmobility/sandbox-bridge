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
})
