import { describe, expect, it } from 'vitest'
import { isFromAllowedOrigin } from '../../src/protocol/index.js'
import { resolveAllowedOrigins } from '../../src/react/resolveAllowedOrigins.js'

describe('resolveAllowedOrigins', () => {
  it('runtime geçerliyse build-time\'a bakmadan runtime\'ı kullanır (runtime öncelikli)', () => {
    const result = resolveAllowedOrigins({
      runtime: { allowedOrigins: ['https://hello.tmobstudio.ai'] },
      buildTime: 'http://localhost:3000'
    })
    expect(result).toEqual(['https://hello.tmobstudio.ai'])
  })

  it('runtime içindeki geçersiz origin\'leri (path/query içeren, "*") filtreler, geçerlileri korur', () => {
    const result = resolveAllowedOrigins({
      runtime: { allowedOrigins: ['https://hello.tmobstudio.ai', 'https://evil.example/path', '*', 'not-a-url'] }
    })
    expect(result).toEqual(['https://hello.tmobstudio.ai'])
  })

  it('runtime tanımsız/geçersiz şekilse (obje değil, allowedOrigins dizi değil) atlanır, build-time\'a düşer', () => {
    expect(resolveAllowedOrigins({ runtime: undefined, buildTime: 'https://hello.tmobstudio.ai' })).toEqual([
      'https://hello.tmobstudio.ai'
    ])
    expect(resolveAllowedOrigins({ runtime: 'garbage-string', buildTime: 'https://hello.tmobstudio.ai' })).toEqual([
      'https://hello.tmobstudio.ai'
    ])
    expect(resolveAllowedOrigins({ runtime: { allowedOrigins: 'not-an-array' }, buildTime: 'https://hello.tmobstudio.ai' })).toEqual([
      'https://hello.tmobstudio.ai'
    ])
  })

  it('runtime tüm geçersizse (hiç geçerli origin kalmazsa) build-time\'a düşer', () => {
    const result = resolveAllowedOrigins({
      runtime: { allowedOrigins: ['*', 'not-a-url'] },
      buildTime: 'https://hello.tmobstudio.ai'
    })
    expect(result).toEqual(['https://hello.tmobstudio.ai'])
  })

  it('build-time tek string olarak boşluk/virgülle ayrılmış listeyi ayrıştırır', () => {
    expect(resolveAllowedOrigins({ buildTime: 'https://a.example https://b.example' })).toEqual([
      'https://a.example',
      'https://b.example'
    ])
    expect(resolveAllowedOrigins({ buildTime: 'https://a.example,https://b.example' })).toEqual([
      'https://a.example',
      'https://b.example'
    ])
  })

  it('build-time dizi olarak da kabul edilir, geçersizler filtrelenir', () => {
    expect(resolveAllowedOrigins({ buildTime: ['https://a.example', '*', 'invalid'] })).toEqual(['https://a.example'])
  })

  it('ikisi de yoksa/geçersizse fail-closed boş dizi döner', () => {
    expect(resolveAllowedOrigins()).toEqual([])
    expect(resolveAllowedOrigins({ runtime: null, buildTime: undefined })).toEqual([])
    expect(resolveAllowedOrigins({ buildTime: '*' })).toEqual([])
  })

  it('boş dizi sonucu isFromAllowedOrigin ile birleştiğinde her origin\'i reddeder (fail-closed uçtan uca)', () => {
    const origins = resolveAllowedOrigins()
    expect(isFromAllowedOrigin({ origin: 'https://hello.tmobstudio.ai' }, origins)).toBe(false)
  })

  it('"*" hiçbir zaman geçerli origin sayılmaz (runtime ya da build-time fark etmez)', () => {
    expect(resolveAllowedOrigins({ runtime: { allowedOrigins: ['*'] } })).toEqual([])
    expect(resolveAllowedOrigins({ buildTime: '*' })).toEqual([])
  })
})
