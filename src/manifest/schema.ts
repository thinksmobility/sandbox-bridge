import { z } from 'zod'

/**
 * `sandbox.manifest.json` şeması — her demo repo build çıktısında kök dizine
 * bu şekli üretir. `screens[].variants` / `components[].variantScope` genel
 * amaçlı bir varyant etiketi listesidir — demo kendi anlamını belirler:
 * AirNova `['original','improved']` (before/after redesign) kullanır,
 * Rentigo `['gecikme','bulunamadi']` gibi senaryo/durum etiketleri kullanır,
 * VoltGo boş bırakır. Şema belirli bir değer kümesine kilitlenmez (yalnızca
 * küçük harf/rakam/tire biçimini zorunlu kılar) — yeni demo türleri kendi
 * varyant sözlüğünü serbestçe tanımlayabilir. AirNova'nın `original|improved`
 * anlamı yalnızca KONVANSİYONDUR (dokümantasyon), şema tarafından
 * zorlanmaz.
 */

export const sandboxManifestVariantSchema = z.string().min(1).max(40).regex(/^[a-z0-9-]+$/)

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
  gate: z.enum(['pass', 'fail', 'pending']),
  // Opsiyonel — geriye uyumlu. İçerik digest'i (sha256 hex, 64 karakter):
  // demolar bunu `sandbox:ready`'nin `manifestDigest`'i olarak da kullanabilir,
  // ayrı bir `src/generated/*-meta.json` yardımcı dosyasına gerek kalmaz.
  digest: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional()
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
  variants: z.array(sandboxManifestVariantSchema).max(8).optional(),
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
  variantScope: z.array(sandboxManifestVariantSchema).max(8).optional()
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
