import type { Finding } from '../types.js'

/**
 * Varsayılan deny-list — bilinçli olarak MARKA-BAĞIMSIZDIR. Bu paket (public
 * repo) hiçbir kaynak müşteri/marka adı barındırmaz; yalnızca TMOB'un kendi
 * iç ortam adlandırma kalıplarını (staging/preprod host'ları) yakalar —
 * bunlar demo bundle'larına yanlışlıkla sızarsa marka bağımsız bir hijyen
 * sorunudur. Büyük/küçük harf ve Türkçe karakter (İ/I/ı/i, ç, ş, ğ, ö, ü)
 * duyarsız eşleşir.
 *
 * Somut kaynak marka isimleri (beyaz etiketleme kaynağı) her PRIVATE demo
 * reposunun kendi `sandbox-gate.config.json` → `extraDenyTerms` alanına
 * gider — bkz. `templates/sandbox-gate.config.example.json` ve README.
 */
export const DENY_TERMS: readonly string[] = ['tmoblabs.com', 'ssotest', 'preprod']

/**
 * Türkçe'ye özgü nokta(sız) I/İ/ı ayrımını (`toLocaleLowerCase('tr-TR')` "I" harfini
 * "ı" yapar, ASCII büyük harfli kısaltmalarla — ör. "ACME" — asla eşleşmez) devre dışı bırakan
 * normalize: tüm I varyantlarını 'i'ye indirger, ardından standart küçük harfe
 * çevirir (Ç/Ş/Ğ/Ö/Ü için `toLowerCase()` zaten doğru sonucu verir).
 */
function toComparable(value: string): string {
  return value.replace(/[İIı]/g, 'i').toLowerCase()
}

function maskExcerpt(line: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - 20)
  const end = Math.min(line.length, matchIndex + matchLength + 20)
  const before = line.slice(start, matchIndex)
  const after = line.slice(matchIndex + matchLength, end)
  return `${start > 0 ? '…' : ''}${before}${'*'.repeat(matchLength)}${after}${end < line.length ? '…' : ''}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * ≤4 karakterlik alfasayısal terimler (ör. 3 harfli kısaltmalar) minified
 * kodda `pushDiff` gibi metod/tanımlayıcı adları içinde substring olarak
 * yanlış pozitif üretiyordu (gerçek olay). Bu uzunluk ve altındaki terimler
 * için sınır kontrolü (`[a-z0-9]` komşusu olmama) uygulanır; daha uzun
 * terimler (marka adları genelde birleşik/bitişik geçebilir) mevcut
 * substring eşleşmesini korur.
 */
const SHORT_TERM_MAX_LENGTH = 4

function findMatches(comparable: string, term: string): Array<{ index: number }> {
  if (term.length <= SHORT_TERM_MAX_LENGTH) {
    const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(term)}(?![a-z0-9])`, 'g')
    const matches: Array<{ index: number }> = []
    let match: RegExpExecArray | null
    while ((match = pattern.exec(comparable)) !== null) {
      matches.push({ index: match.index })
      if (match[0].length === 0) pattern.lastIndex += 1
    }
    return matches
  }

  const matches: Array<{ index: number }> = []
  let searchIndex = 0
  while (searchIndex <= comparable.length) {
    const matchIndex = comparable.indexOf(term, searchIndex)
    if (matchIndex === -1) break
    matches.push({ index: matchIndex })
    searchIndex = matchIndex + term.length
  }
  return matches
}

/**
 * Verilen içerikte satır satır marka deny-list eşleşmesi arar. `extraDenyTerms`
 * demo-özel somut marka isimlerinin (kaynak müşteri adları vb.) eklendiği
 * ASIL mekanizmadır — bu paket kendisi hiçbir marka adı barındırmaz (bkz.
 * `DENY_TERMS`). Allow-list istisnası DEĞİLDİR, yalnızca ek yasak terim
 * eklemek içindir.
 */
export function scanBrand(content: string, filePath: string, extraDenyTerms: readonly string[] = []): Finding[] {
  const findings: Finding[] = []
  const terms = [...DENY_TERMS, ...extraDenyTerms.map(toComparable)].filter((term) => term.length > 0)
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    const comparable = toComparable(line)
    for (const term of terms) {
      for (const { index: matchIndex } of findMatches(comparable, term)) {
        findings.push({
          rule: 'brand-denylist',
          file: filePath,
          line: index + 1,
          excerpt: maskExcerpt(line, matchIndex, term.length)
        })
      }
    }
  })

  return findings
}
