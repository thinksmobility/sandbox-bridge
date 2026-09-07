import { sandboxManifestSchema, type SandboxManifest } from './schema.js'

export interface ValidateManifestOk {
  ok: true
  manifest: SandboxManifest
}

export interface ValidateManifestError {
  ok: false
  errors: string[]
}

export type ValidateManifestResult = ValidateManifestOk | ValidateManifestError

/**
 * `sandbox.manifest.json` içeriğini doğrular. CI'da `manifest:validate` adımı
 * ve BE'nin şablon import script'i bu fonksiyonu kullanır.
 */
export function validateManifest(data: unknown): ValidateManifestResult {
  const result = sandboxManifestSchema.safeParse(data)
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    }
  }
  return { ok: true, manifest: result.data }
}
