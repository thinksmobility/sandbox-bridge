import { sandboxMessageSchema } from './schemas.js'
import type { SandboxMessage, SandboxMessageType, SandboxPayloadMap } from './types.js'

export * from './types.js'
export * from './schemas.js'

export interface ParseMessageOk {
  ok: true
  message: SandboxMessage
}

export interface ParseMessageError {
  ok: false
  error: string
}

export type ParseMessageResult = ParseMessageOk | ParseMessageError

/**
 * Gelen `postMessage` verisini zarf şemasına göre doğrular. Bilinmeyen `type`
 * veya şema dışı yük her zaman `{ ok: false }` döner — asla fırlatmaz.
 */
export function parseMessage(data: unknown): ParseMessageResult {
  const result = sandboxMessageSchema.safeParse(data)
  if (!result.success) {
    return { ok: false, error: result.error.message }
  }
  return { ok: true, message: result.data as SandboxMessage }
}

function generateMessageId(): string {
  const globalWithCrypto = globalThis as { crypto?: { randomUUID?: () => string } }
  if (typeof globalWithCrypto.crypto?.randomUUID === 'function') {
    return globalWithCrypto.crypto.randomUUID()
  }
  return `sb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export interface CreateEnvelopeParams<T extends SandboxMessageType> {
  type: T
  demoId: string
  sessionId: string
  payload: SandboxPayloadMap[T]
  ts?: number
  msgId?: string
}

/**
 * Standart zarfı (`{v, demoId, sessionId, msgId, ts, type, payload}`) üretir.
 * `msgId`/`ts` verilmezse otomatik doldurulur.
 */
export function createEnvelope<T extends SandboxMessageType>(
  params: CreateEnvelopeParams<T>
): Extract<SandboxMessage, { type: T }> {
  return {
    v: 1,
    demoId: params.demoId,
    sessionId: params.sessionId,
    msgId: params.msgId ?? generateMessageId(),
    ts: params.ts ?? Date.now(),
    type: params.type,
    payload: params.payload
  } as Extract<SandboxMessage, { type: T }>
}

export interface MessageEventLike {
  origin: string
}

/**
 * `event.origin` verilen allow-list içinde mi kontrol eder. Liste boşsa ya da
 * yalnızca `'*'` içeriyorsa daima `false` döner — joker karakter asla eşleşmez.
 */
export function isFromAllowedOrigin(event: MessageEventLike, allowList: readonly string[]): boolean {
  return allowList.some((origin) => origin !== '*' && origin === event.origin)
}
