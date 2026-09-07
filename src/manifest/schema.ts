import { z } from 'zod'

/**
 * `sandbox.manifest.json` şeması — her demo repo build çıktısında kök dizine
 * bu şekli üretir. AirNova'da `screens[].variants` ve `components[].variantScope`
 * `original|improved` değerleriyle doldurulur; VoltGo/Rentigo'da boş bırakılır.
 */

export const sandboxManifestVariantSchema = z.enum(['original', 'improved'])

export const sandboxManifestDemoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  locale: z.string().min(1),
  frame: z.object({
    w: z.number().int().positive(),
    h: z.number().int().positive()
  })
})

export const sandboxManifestBuildSchema = z.object({
  repo: z.string().min(1),
  commit: z.string().min(1),
  builtAt: z.string().min(1),
  gate: z.enum(['pass', 'fail', 'pending'])
})

export const sandboxManifestPersonaSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  default: z.boolean().optional()
})

export const sandboxManifestScenarioSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  key: z.string().min(1)
})

export const sandboxManifestFlowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  screenIds: z.array(z.string().min(1)).min(1)
})

export const sandboxManifestScreenSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  route: z.string().min(1),
  order: z.number().int().nonnegative(),
  flowId: z.string().min(1),
  variants: z.array(sandboxManifestVariantSchema).optional(),
  thumb: z.string().min(1).optional()
})

export const sandboxManifestComponentSchema = z.object({
  id: z.string().min(1),
  screenId: z.string().min(1),
  label: z.string().min(1),
  // Yalnızca `data-sb-component` attribute selector'ı — CP bunu ham
  // querySelector olarak KULLANICI GİRDİSİNE vermez, yalnızca kendi
  // `SandboxSelectable`'ın bastığı attribute ile eşleşen sabit bir desendir.
  selector: z.string().regex(/^\[data-sb-component=['"][a-z0-9-]+['"]\]$/),
  feedbackEnabled: z.boolean(),
  requirementRefs: z.array(z.string().min(1)).default([]),
  taskRefs: z.array(z.string().min(1)).default([]),
  variantScope: z.array(sandboxManifestVariantSchema).optional()
})

export const sandboxManifestSchema = z.object({
  manifestVersion: z.literal('1.0'),
  demo: sandboxManifestDemoSchema,
  build: sandboxManifestBuildSchema,
  personas: z.array(sandboxManifestPersonaSchema).min(1),
  scenarios: z.array(sandboxManifestScenarioSchema).min(1),
  flows: z.array(sandboxManifestFlowSchema).min(1),
  screens: z.array(sandboxManifestScreenSchema).min(1),
  components: z.array(sandboxManifestComponentSchema).default([])
})

export type SandboxManifestVariant = z.infer<typeof sandboxManifestVariantSchema>
export type SandboxManifestScreen = z.infer<typeof sandboxManifestScreenSchema>
export type SandboxManifestComponent = z.infer<typeof sandboxManifestComponentSchema>
export type SandboxManifest = z.infer<typeof sandboxManifestSchema>
