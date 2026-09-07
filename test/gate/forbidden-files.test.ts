import { describe, expect, it } from 'vitest'
import { scanForbiddenFile } from '../../src/gate/rules/forbidden-files.js'

describe('gate/rules/forbidden-files', () => {
  it.each([
    'google-services.json',
    'GoogleService-Info.plist',
    'eas.json',
    '.env',
    '.env.local',
    '.env.production',
    'secrets.keystore',
    'AuthKey_ABC123.p8',
    'cert.p12',
    'app.mobileprovision'
  ])('%s yasaklı olarak işaretlenir', (basename) => {
    const finding = scanForbiddenFile(`android/app/${basename}`)
    expect(finding).not.toBeNull()
    expect(finding?.rule).toBe('forbidden-file')
  })

  it('.env.example açık istisnadır', () => {
    expect(scanForbiddenFile('.env.example')).toBeNull()
  })

  it('sıradan kaynak dosyaları için null döner', () => {
    expect(scanForbiddenFile('src/app/index.tsx')).toBeNull()
    expect(scanForbiddenFile('package.json')).toBeNull()
  })
})
