import { describe, expect, it } from 'vitest'
import { createEnvelope, isFromAllowedOrigin, parseMessage, sandboxMessageSchema } from '../src/protocol/index.js'

describe('protocol/schemas', () => {
  it('geçerli bir sandbox:ready zarfını kabul eder', () => {
    const result = sandboxMessageSchema.safeParse({
      v: 1,
      demoId: 'voltgo',
      sessionId: '',
      msgId: 'm-1',
      ts: 1000,
      type: 'sandbox:ready',
      payload: { manifestDigest: 'abc123', screens: 12, protocol: 1 }
    })
    expect(result.success).toBe(true)
  })

  it('geçerli bir sandbox:component-selected zarfını kabul eder', () => {
    const result = sandboxMessageSchema.safeParse({
      v: 1,
      demoId: 'voltgo',
      sessionId: 'sess-1',
      msgId: 'm-2',
      ts: 1000,
      type: 'sandbox:component-selected',
      payload: {
        screenId: 'scr-1',
        componentId: 'cmp-1',
        label: 'Fiyat kartı',
        rect: { x: 0, y: 0, w: 10, h: 10 },
        thumbRef: '/sb-thumbs/scr-1.png'
      }
    })
    expect(result.success).toBe(true)
  })

  it('v alanı 1 değilse reddeder', () => {
    const result = sandboxMessageSchema.safeParse({
      v: 2,
      demoId: 'voltgo',
      sessionId: '',
      msgId: 'm-1',
      ts: 1000,
      type: 'sandbox:ready',
      payload: { manifestDigest: 'abc123', screens: 12, protocol: 1 }
    })
    expect(result.success).toBe(false)
  })

  it('eksik zorunlu alan varsa reddeder', () => {
    const result = sandboxMessageSchema.safeParse({
      v: 1,
      demoId: 'voltgo',
      sessionId: '',
      msgId: 'm-1',
      ts: 1000,
      type: 'sandbox:navigate',
      payload: { route: '/kasko' }
    })
    expect(result.success).toBe(false)
  })

  it('sandbox:reset payload fazladan alan içeremez', () => {
    const result = sandboxMessageSchema.safeParse({
      v: 1,
      demoId: 'voltgo',
      sessionId: 'sess-1',
      msgId: 'm-1',
      ts: 1000,
      type: 'sandbox:reset',
      payload: { unexpected: true }
    })
    expect(result.success).toBe(false)
  })
})

describe('protocol/parseMessage', () => {
  it('bilinmeyen type için {ok:false} döner', () => {
    const result = parseMessage({
      v: 1,
      demoId: 'voltgo',
      sessionId: '',
      msgId: 'm-1',
      ts: 1000,
      type: 'sandbox:unknown-type',
      payload: {}
    })
    expect(result.ok).toBe(false)
  })

  it('tamamen alakasız veri için {ok:false} döner', () => {
    const result = parseMessage('not-an-object')
    expect(result.ok).toBe(false)
  })

  it('geçerli zarf için {ok:true, message} döner', () => {
    const result = parseMessage({
      v: 1,
      demoId: 'voltgo',
      sessionId: 'sess-1',
      msgId: 'm-1',
      ts: 1000,
      type: 'sandbox:reset',
      payload: {}
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.message.type).toBe('sandbox:reset')
    }
  })
})

describe('protocol/createEnvelope', () => {
  it('msgId ve ts verilmezse otomatik doldurur', () => {
    const envelope = createEnvelope({
      type: 'sandbox:event',
      demoId: 'airnova',
      sessionId: 'sess-2',
      payload: { type: 'flight-selected', payload: { flightId: 'F1' } }
    })
    expect(envelope.v).toBe(1)
    expect(envelope.demoId).toBe('airnova')
    expect(envelope.msgId.length).toBeGreaterThan(0)
    expect(typeof envelope.ts).toBe('number')
    expect(sandboxMessageSchema.safeParse(envelope).success).toBe(true)
  })

  it('verilen msgId/ts değerlerini korur', () => {
    const envelope = createEnvelope({
      type: 'sandbox:reset',
      demoId: 'rentigo',
      sessionId: 'sess-3',
      payload: {},
      msgId: 'fixed-id',
      ts: 42
    })
    expect(envelope.msgId).toBe('fixed-id')
    expect(envelope.ts).toBe(42)
  })
})

describe('protocol/isFromAllowedOrigin', () => {
  it('allow-list içindeki origin için true döner', () => {
    const event = { origin: 'https://hello.tmobstudio.ai' }
    expect(isFromAllowedOrigin(event, ['https://hello.tmobstudio.ai', 'http://localhost:3000'])).toBe(true)
  })

  it('allow-list dışındaki origin için false döner', () => {
    const event = { origin: 'https://evil.example' }
    expect(isFromAllowedOrigin(event, ['https://hello.tmobstudio.ai'])).toBe(false)
  })

  it('boş allow-list için false döner', () => {
    expect(isFromAllowedOrigin({ origin: 'https://hello.tmobstudio.ai' }, [])).toBe(false)
  })

  it('"*" asla joker olarak eşleşmez', () => {
    expect(isFromAllowedOrigin({ origin: '*' }, ['*'])).toBe(false)
    expect(isFromAllowedOrigin({ origin: 'https://anything.example' }, ['*'])).toBe(false)
  })
})
