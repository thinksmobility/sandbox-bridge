import { describe, expect, it } from 'vitest'
import { validateManifest } from '../src/manifest/index.js'

function buildValidManifest(): Record<string, unknown> {
  return {
    manifestVersion: '1.0',
    demo: {
      id: 'voltgo',
      name: 'VoltGo',
      brand: 'Meridyen Sigorta A.Ş.',
      locale: 'tr-TR',
      frame: { w: 375, h: 812 }
    },
    build: { repo: 'sandbox-voltgo', commit: 'abc123', builtAt: '2026-09-07T00:00:00.000Z', gate: 'pass' },
    personas: [{ id: 'deniz', label: 'Deniz — üye, 2 poliçe', default: true }],
    scenarios: [{ id: 'kasko-s1', label: 'Başarılı teklif', key: '34ABC123' }],
    flows: [{ id: 'kasko', label: 'Kasko teklif', screenIds: ['scr-kasko-form', 'scr-kasko-price'] }],
    screens: [
      { id: 'scr-kasko-price', title: 'Kasko fiyat ekranı', route: '/kasko/price', order: 4, flowId: 'kasko' }
    ],
    components: [
      {
        id: 'cmp-price-card',
        screenId: 'scr-kasko-price',
        label: 'Fiyat kartı',
        selector: "[data-sb-component='cmp-price-card']",
        feedbackEnabled: true,
        requirementRefs: ['REQ-D1-M11-03'],
        taskRefs: ['VG-142']
      }
    ]
  }
}

describe('manifest/validateManifest', () => {
  it('geçerli örneği kabul eder', () => {
    const result = validateManifest(buildValidManifest())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.manifest.demo.id).toBe('voltgo')
      expect(result.manifest.components).toHaveLength(1)
    }
  })

  it('eksik zorunlu alan varsa reddeder ve hata listesi döner', () => {
    const manifest = buildValidManifest()
    delete (manifest as { demo?: unknown }).demo
    const result = validateManifest(manifest)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((error) => error.startsWith('demo'))).toBe(true)
    }
  })

  it('tamamen geçersiz kök değer için "(root)" hata anahtarı üretir', () => {
    const result = validateManifest(null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((error) => error.startsWith('(root)'))).toBe(true)
    }
  })

  it('screens boş dizi olamaz', () => {
    const manifest = buildValidManifest()
    manifest.screens = []
    const result = validateManifest(manifest)
    expect(result.ok).toBe(false)
  })

  it('AirNova için screens[].variants ve components[].variantScope kabul edilir', () => {
    const manifest = buildValidManifest()
    manifest.screens = [
      {
        id: 'scr-r1-search',
        title: 'Arama formu',
        route: '/ara',
        order: 1,
        flowId: 'booking',
        variants: ['original', 'improved']
      }
    ]
    manifest.components = [
      {
        id: 'cmp-search-btn',
        screenId: 'scr-r1-search',
        label: 'Ara butonu',
        selector: "[data-sb-component='cmp-search-btn']",
        feedbackEnabled: true,
        requirementRefs: [],
        taskRefs: [],
        variantScope: ['improved']
      }
    ]
    const result = validateManifest(manifest)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.manifest.screens[0]?.variants).toEqual(['original', 'improved'])
      expect(result.manifest.components[0]?.variantScope).toEqual(['improved'])
    }
  })

  it('variants listesinde geçersiz değer olursa reddeder', () => {
    const manifest = buildValidManifest()
    manifest.screens = [
      {
        id: 'scr-r1-search',
        title: 'Arama formu',
        route: '/ara',
        order: 1,
        flowId: 'booking',
        variants: ['legacy']
      }
    ]
    const result = validateManifest(manifest)
    expect(result.ok).toBe(false)
  })
})
