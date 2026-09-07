import type { Finding } from '../types.js'

interface CredentialSignature {
  rule: string
  pattern: RegExp
}

const SIGNATURES: readonly CredentialSignature[] = [
  { rule: 'credential-google-api-key', pattern: /AIza[0-9A-Za-z_-]{35}/g },
  { rule: 'credential-aws-access-key', pattern: /AKIA[0-9A-Z]{16}/g },
  { rule: 'credential-private-key-block', pattern: /-----BEGIN\s+(?:[A-Z0-9]+\s+)?PRIVATE KEY-----/g },
  { rule: 'credential-basic-auth', pattern: /Basic [A-Za-z0-9+/=]{20,}/g },
  { rule: 'credential-jwt', pattern: /eyJ[A-Za-z0-9_-]{20,}\./g },
  {
    // Hex'e ek olarak base62-benzeri (harf/rakam/-/_) 20+ karakterli token'ları
    // da yakalar — birçok gerçek sağlayıcı anahtarı yalnızca hex değildir.
    rule: 'credential-secret-assignment',
    pattern: /(SECRET|HMAC|API_KEY|XApiKey)[^\n]{0,40}['"][0-9a-zA-Z_-]{20,}['"]/gi
  },
  // Bilinen sağlayıcı önekli anahtar imzaları.
  { rule: 'credential-stripe-live-key', pattern: /sk_live_[0-9a-zA-Z]{20,}/g },
  { rule: 'credential-generic-sk-prefix', pattern: /\bsk-[0-9a-zA-Z]{20,}/g },
  { rule: 'credential-github-token', pattern: /ghp_[0-9a-zA-Z]{20,}/g },
  { rule: 'credential-slack-token', pattern: /xox[baprs]-[0-9A-Za-z-]{10,}/g },
  { rule: 'credential-resend-key', pattern: /re_[0-9a-zA-Z]{20,}/g }
]

function maskMatch(line: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - 15)
  const end = Math.min(line.length, matchIndex + matchLength + 5)
  const before = line.slice(start, matchIndex)
  const after = line.slice(matchIndex + matchLength, end)
  return `${start > 0 ? '…' : ''}${before}[REDACTED]${after}${end < line.length ? '…' : ''}`
}

/**
 * Bilinen kimlik bilgisi imzalarını (Google/AWS anahtarları, private key
 * bloğu, Basic auth, JWT, hex sır ataması) satır satır arar. Eşleşen kısım
 * raporda `[REDACTED]` ile maskelenir — ham sır asla rapora yazılmaz.
 */
export function scanCredentials(content: string, filePath: string): Finding[] {
  const findings: Finding[] = []
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    for (const signature of SIGNATURES) {
      signature.pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = signature.pattern.exec(line)) !== null) {
        findings.push({
          rule: signature.rule,
          file: filePath,
          line: index + 1,
          excerpt: maskMatch(line, match.index, match[0].length)
        })
        if (match[0].length === 0) {
          signature.pattern.lastIndex += 1
        }
      }
    }
  })

  return findings
}
