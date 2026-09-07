import type { SandboxManifest } from '@tmob/sandbox-bridge/manifest'

/**
 * `sandbox.manifest.json` için kaynak veri. Demo repoları bu dosyayı kendi
 * ekran/bileşen envanterleriyle değiştirir; `scripts/build-manifest.mjs`
 * bunu okuyup doğrulanmış JSON üretir.
 */
export function buildManifestSource(): Omit<SandboxManifest, 'build'> {
  return {
    manifestVersion: '1.0',
    demo: {
      id: 'sandbox-expo-kit-ornek',
      name: 'Örnek Demo',
      brand: 'Örnek Marka',
      locale: 'tr-TR',
      frame: { w: 375, h: 812 }
    },
    personas: [{ id: 'ornek-persona', label: 'Örnek persona', default: true }],
    scenarios: [{ id: 'ornek-senaryo', label: 'Örnek senaryo', key: 'ORNEK-1' }],
    flows: [{ id: 'ornek-akis', label: 'Örnek akış', screenIds: ['scr-example-list', 'scr-example-map'] }],
    screens: [
      { id: 'scr-example-list', title: 'Örnek Ekran', route: '/', order: 1, flowId: 'ornek-akis' },
      { id: 'scr-example-map', title: 'Örnek Harita', route: '/harita', order: 2, flowId: 'ornek-akis' }
    ],
    components: [
      {
        id: 'cmp-example-card',
        screenId: 'scr-example-list',
        label: 'Örnek liste kartı',
        selector: "[data-sb-component='cmp-example-card']",
        feedbackEnabled: true,
        requirementRefs: [],
        taskRefs: []
      },
      {
        id: 'cmp-example-map',
        screenId: 'scr-example-map',
        label: 'Örnek harita',
        selector: "[data-sb-component='cmp-example-map']",
        feedbackEnabled: true,
        requirementRefs: [],
        taskRefs: []
      }
    ]
  }
}
