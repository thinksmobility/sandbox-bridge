import { z } from 'zod'

/**
 * `types.ts` ile birebir uyumlu zod şemaları. CP ve demo repoları aynı şemaları
 * `parseMessage` üzerinden veya doğrudan import ederek kullanır.
 */

const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number()
})

const sessionInfoSchema = z.object({
  id: z.string().min(1),
  expiresAt: z.string().min(1)
})

const readyPayloadSchema = z.object({
  manifestDigest: z.string().min(1),
  screens: z.number().int().nonnegative(),
  protocol: z.literal(1)
})

const navigatePayloadSchema = z.object({
  screenId: z.string().min(1),
  route: z.string().min(1),
  variant: z.string().min(1).optional()
})

const componentSelectedPayloadSchema = z.object({
  screenId: z.string().min(1),
  componentId: z.string().min(1),
  label: z.string().min(1),
  rect: rectSchema,
  thumbRef: z.string().min(1).optional()
})

const eventPayloadSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.unknown())
})

const stateSyncPayloadSchema = z.object({
  snapshot: z.record(z.unknown())
})

const errorPayloadSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1)
})

const initPayloadSchema = z.object({
  session: sessionInfoSchema,
  persona: z.string().min(1).optional(),
  scenario: z.string().min(1).optional(),
  feedbackMode: z.boolean(),
  snapshot: z.record(z.unknown()).optional(),
  allowedOrigin: z.string().min(1)
})

const feedbackModePayloadSchema = z.object({
  on: z.boolean()
})

const highlightPayloadSchema = z.object({
  componentId: z.string().min(1).nullable()
})

const personaPayloadSchema = z.object({
  id: z.string().min(1)
})

const scenarioPayloadSchema = z.object({
  id: z.string().min(1)
})

const resetPayloadSchema = z.object({}).strict()

const envelopeBase = {
  v: z.literal(1),
  demoId: z.string().min(1),
  sessionId: z.string(),
  msgId: z.string().min(1),
  ts: z.number()
}

export const readyEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:ready'),
  payload: readyPayloadSchema
})

export const navigateEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:navigate'),
  payload: navigatePayloadSchema
})

export const componentSelectedEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:component-selected'),
  payload: componentSelectedPayloadSchema
})

export const eventEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:event'),
  payload: eventPayloadSchema
})

export const stateSyncEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:state-sync'),
  payload: stateSyncPayloadSchema
})

export const errorEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:error'),
  payload: errorPayloadSchema
})

export const initEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:init'),
  payload: initPayloadSchema
})

export const feedbackModeEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:feedback-mode'),
  payload: feedbackModePayloadSchema
})

export const highlightEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:highlight'),
  payload: highlightPayloadSchema
})

export const personaEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:persona'),
  payload: personaPayloadSchema
})

export const scenarioEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:scenario'),
  payload: scenarioPayloadSchema
})

export const resetEnvelopeSchema = z.object({
  ...envelopeBase,
  type: z.literal('sandbox:reset'),
  payload: resetPayloadSchema
})

export const sandboxMessageSchema = z.discriminatedUnion('type', [
  readyEnvelopeSchema,
  navigateEnvelopeSchema,
  componentSelectedEnvelopeSchema,
  eventEnvelopeSchema,
  stateSyncEnvelopeSchema,
  errorEnvelopeSchema,
  initEnvelopeSchema,
  feedbackModeEnvelopeSchema,
  highlightEnvelopeSchema,
  personaEnvelopeSchema,
  scenarioEnvelopeSchema,
  resetEnvelopeSchema
])
