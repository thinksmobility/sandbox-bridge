/**
 * Sandbox iframe köprü protokolü — mesaj tipleri.
 *
 * Zarf her mesajda aynıdır: { v, demoId, sessionId, msgId, ts, type, payload }.
 * `type` alanı ayırt edici (discriminant) olduğu için `payload` tipini belirler.
 */

export const PROTOCOL_VERSION = 1 as const

export interface SandboxRect {
  x: number
  y: number
  w: number
  h: number
}

export interface SandboxSessionInfo {
  id: string
  expiresAt: string
}

// demo → CP

export interface ReadyPayload {
  manifestDigest: string
  screens: number
  protocol: 1
}

export interface NavigatePayload {
  screenId: string
  route: string
  variant?: string
}

export interface ComponentSelectedPayload {
  screenId: string
  componentId: string
  label: string
  rect: SandboxRect
  thumbRef?: string
}

export interface EventPayload {
  type: string
  payload: Record<string, unknown>
}

export interface StateSyncPayload {
  snapshot: Record<string, unknown>
}

export interface ErrorPayload {
  code: string
  message: string
}

// CP → demo

export interface InitPayload {
  session: SandboxSessionInfo
  persona?: string
  scenario?: string
  feedbackMode: boolean
  snapshot?: Record<string, unknown>
  allowedOrigin: string
}

export interface FeedbackModePayload {
  on: boolean
}

export interface HighlightPayload {
  componentId: string | null
}

export interface PersonaPayload {
  id: string
}

export interface ScenarioPayload {
  id: string
}

export type ResetPayload = Record<string, never>

export interface SandboxPayloadMap {
  'sandbox:ready': ReadyPayload
  'sandbox:navigate': NavigatePayload
  'sandbox:component-selected': ComponentSelectedPayload
  'sandbox:event': EventPayload
  'sandbox:state-sync': StateSyncPayload
  'sandbox:error': ErrorPayload
  'sandbox:init': InitPayload
  'sandbox:feedback-mode': FeedbackModePayload
  'sandbox:highlight': HighlightPayload
  'sandbox:persona': PersonaPayload
  'sandbox:scenario': ScenarioPayload
  'sandbox:reset': ResetPayload
}

export type SandboxMessageType = keyof SandboxPayloadMap

export interface SandboxEnvelope<T extends SandboxMessageType = SandboxMessageType> {
  v: 1
  demoId: string
  sessionId: string
  msgId: string
  ts: number
  type: T
  payload: SandboxPayloadMap[T]
}

export type SandboxMessage = {
  [K in SandboxMessageType]: SandboxEnvelope<K>
}[SandboxMessageType]

export const DEMO_TO_CP_TYPES = [
  'sandbox:ready',
  'sandbox:navigate',
  'sandbox:component-selected',
  'sandbox:event',
  'sandbox:state-sync',
  'sandbox:error'
] as const satisfies readonly SandboxMessageType[]

export const CP_TO_DEMO_TYPES = [
  'sandbox:init',
  'sandbox:feedback-mode',
  'sandbox:highlight',
  'sandbox:persona',
  'sandbox:scenario',
  'sandbox:reset'
] as const satisfies readonly SandboxMessageType[]
