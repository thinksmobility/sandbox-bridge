import { describe, expect, it } from 'vitest'
import { scanCredentials } from '../../src/gate/rules/credentials.js'

describe('gate/rules/credentials', () => {
  it('Google API anahtarını yakalar ve maskeler', () => {
    const findings = scanCredentials("const key = 'AIzaSyD1234567890abcdefghijklmnopqrstuv'", 'src/config.ts')
    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('credential-google-api-key')
    expect(findings[0]?.excerpt).not.toContain('AIzaSyD1234567890abcdefghijklmnopqrstuv')
    expect(findings[0]?.excerpt).toContain('[REDACTED]')
  })

  it('AWS access key imzasını yakalar', () => {
    const findings = scanCredentials('AWS_KEY=AKIAABCDEFGHIJKLMNOP', 'src/.env.example')
    expect(findings.some((f) => f.rule === 'credential-aws-access-key')).toBe(true)
  })

  it('private key bloğunu yakalar (RSA/EC varyantları dahil)', () => {
    expect(scanCredentials('-----BEGIN PRIVATE KEY-----', 'a.pem')).toHaveLength(1)
    expect(scanCredentials('-----BEGIN RSA PRIVATE KEY-----', 'b.pem')).toHaveLength(1)
  })

  it('Basic auth başlığını yakalar', () => {
    const findings = scanCredentials('Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQxMjM0NTY=', 'src/http.ts')
    expect(findings.some((f) => f.rule === 'credential-basic-auth')).toBe(true)
  })

  it('JWT imzasını yakalar', () => {
    const findings = scanCredentials(
      'token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      'src/auth.ts'
    )
    expect(findings.some((f) => f.rule === 'credential-jwt')).toBe(true)
  })

  it('hex sır atamasını yakalar (SECRET/HMAC/API_KEY/XApiKey)', () => {
    const findings = scanCredentials(
      "const HMAC_SECRET = '3f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c'",
      'src/api/core/request.ts'
    )
    expect(findings.some((f) => f.rule === 'credential-secret-assignment')).toBe(true)
  })

  it('sır içermeyen temiz kodda bulgu üretmez', () => {
    const findings = scanCredentials("const apiKey = process.env.API_KEY ?? ''", 'src/config.ts')
    expect(findings).toHaveLength(0)
  })

  it('bilinen sağlayıcı önekli anahtarları yakalar (Stripe/OpenAI-tarzı/GitHub/Slack/Resend)', () => {
    expect(scanCredentials("key='sk_live_1234567890abcdefghijkl'", 'a.ts')).toHaveLength(1)
    expect(scanCredentials("key='sk-1234567890abcdefghijklmnop'", 'a.ts')).toHaveLength(1)
    expect(scanCredentials("token='ghp_1234567890abcdefghijklmn'", 'a.ts')).toHaveLength(1)
    expect(scanCredentials("token='xoxb-1234567890-abcdef'", 'a.ts')).toHaveLength(1)
    expect(scanCredentials("key='re_1234567890abcdefghijkl'", 'a.ts')).toHaveLength(1)
  })

  it('hex-olmayan (alfanümerik+tire) 20+ karakterli sır atamasını da yakalar', () => {
    const findings = scanCredentials("const API_KEY = 'AbC123-XyZ789_qWeRtY0987'", 'src/config.ts')
    expect(findings.some((f) => f.rule === 'credential-secret-assignment')).toBe(true)
  })
})
