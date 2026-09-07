import type { Finding } from '../types.js'

/**
 * TC Kimlik No algoritması: 11 hane, ilk hane 0 olamaz,
 * d10 = ((d1+d3+d5+d7+d9)*7 - (d2+d4+d6+d8)) mod 10,
 * d11 = (d1+...+d10) mod 10.
 * Seed verisinde checksum'ı GEÇMEYEN numaralar kullanılmalı — geçenler gerçek
 * bir kimlik numarasıyla çakışma riski taşıdığı için bulgu olarak işaretlenir.
 */
function isValidTcChecksum(digits: string): boolean {
  if (digits.length !== 11) return false
  if (digits[0] === '0') return false

  const d = digits.split('').map(Number)
  const oddSum = (d[0] ?? 0) + (d[2] ?? 0) + (d[4] ?? 0) + (d[6] ?? 0) + (d[8] ?? 0)
  const evenSum = (d[1] ?? 0) + (d[3] ?? 0) + (d[5] ?? 0) + (d[7] ?? 0)
  const d10 = (((oddSum * 7 - evenSum) % 10) + 10) % 10
  if (d10 !== d[9]) return false

  const sumFirst10 = d.slice(0, 10).reduce((sum, digit) => sum + digit, 0)
  const d11 = sumFirst10 % 10
  return d11 === d[10]
}

const TC_CANDIDATE_PATTERN = /(?<!\d)\d{11}(?!\d)/g
// Başlangıçta da `(?<!\d)` gerekir: aksi halde minified JS'teki uzun
// ondalık sabitler (ör. bezier easing eğrileri, "0.545454545454...") içinden
// rastgele bir 10 haneli pencere "telefon numarası" gibi eşleşebilir.
const PHONE_CANDIDATE_PATTERN = /(?<!\d)(?:\+90|0)?[\s-]?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/g
// Son etiket (TLD) en az bir harf içermeli — yoksa `pnpm@11.1.2` gibi
// paket-sürüm dizgeleri (ör. package.json/CI script'lerinde) e-posta sanılır.
// `@` sonrası `<sayı>x.<görsel-uzantısı>` ise retina asset adı sayılır
// (`icon@2x.png`, `logo@3x.jpg`) ve e-posta adayı olarak değerlendirilmez.
const EMAIL_CANDIDATE_PATTERN =
  /[\w.+-]+@(?!\d+x\.(?:png|jpe?g|webp|gif|svg)\b)[\w-]+(?:\.[\w-]+)*\.[A-Za-z][A-Za-z0-9-]*/g

/** Rezerve test aralığı: +90 555 000 XX XX (10 haneli, ülke kodsuz). */
const RESERVED_PHONE_PATTERN = /^555000\d{4}$/

const ALLOWED_EMAIL_DOMAINS = new Set(['example.com', 'example.org'])

function maskDigits(value: string): string {
  if (value.length <= 4) return '*'.repeat(value.length)
  return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`
}

function buildExcerpt(line: string, matchIndex: number, matchLength: number, replacement: string): string {
  const start = Math.max(0, matchIndex - 15)
  const end = Math.min(line.length, matchIndex + matchLength + 15)
  const before = line.slice(start, matchIndex)
  const after = line.slice(matchIndex + matchLength, end)
  return `${start > 0 ? '…' : ''}${before}${replacement}${after}${end < line.length ? '…' : ''}`
}

export interface ScanPiiOptions {
  /**
   * false ise TC/telefon (sayısal) kuralları atlanır — e-posta kuralı
   * etkilenmez. Minified/bundled `.js` çıktısında font hash'leri, bezier
   * easing katsayıları ve worklet hash'leri TC/telefon kalıplarıyla
   * çakışabiliyor (gerçek olay); bu tür dosyalarda `scanDirectory` bunu
   * otomatik `false` geçer (bkz. `scanner.ts` satır-uzunluğu sezgiseli).
   */
  includeNumericRules?: boolean
}

/**
 * Kişisel veri kurallarını tarar. Yanlış pozitif tuzağına dikkat: ham
 * regex yerine TC checksum doğrulaması, telefon rezerve aralığı ve e-posta
 * izinli domain listesi kullanılır — böylece seed verisi serbest kalırken
 * gerçek görünen veri yakalanır.
 */
export function scanPii(content: string, filePath: string, options: ScanPiiOptions = {}): Finding[] {
  const includeNumericRules = options.includeNumericRules ?? true
  const findings: Finding[] = []
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    let match: RegExpExecArray | null

    if (includeNumericRules) {
      TC_CANDIDATE_PATTERN.lastIndex = 0
      while ((match = TC_CANDIDATE_PATTERN.exec(line)) !== null) {
        if (isValidTcChecksum(match[0])) {
          findings.push({
            rule: 'pii-tc-kimlik',
            file: filePath,
            line: index + 1,
            excerpt: buildExcerpt(line, match.index, match[0].length, maskDigits(match[0]))
          })
        }
      }

      PHONE_CANDIDATE_PATTERN.lastIndex = 0
      while ((match = PHONE_CANDIDATE_PATTERN.exec(line)) !== null) {
        const normalized = match[0].replace(/\D/g, '').slice(-10)
        if (!RESERVED_PHONE_PATTERN.test(normalized)) {
          findings.push({
            rule: 'pii-phone',
            file: filePath,
            line: index + 1,
            excerpt: buildExcerpt(line, match.index, match[0].length, maskDigits(normalized))
          })
        }
      }
    }

    EMAIL_CANDIDATE_PATTERN.lastIndex = 0
    while ((match = EMAIL_CANDIDATE_PATTERN.exec(line)) !== null) {
      const domain = match[0].split('@')[1]?.toLowerCase() ?? ''
      const isAllowed = ALLOWED_EMAIL_DOMAINS.has(domain) || domain.endsWith('.demo')
      if (!isAllowed) {
        findings.push({
          rule: 'pii-email',
          file: filePath,
          line: index + 1,
          excerpt: buildExcerpt(line, match.index, match[0].length, '[REDACTED_EMAIL]')
        })
      }
    }
  })

  return findings
}
