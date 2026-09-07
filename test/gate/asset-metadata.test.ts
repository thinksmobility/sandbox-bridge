import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { scanAssetMetadata } from '../../src/gate/rules/asset-metadata.js'

const FIXTURE_DIR = 'test/fixtures/gate/asset-metadata'

function loadFixture(name: string): Buffer {
  return readFileSync(`${FIXTURE_DIR}/${name}`)
}

describe('gate/rules/asset-metadata — PNG', () => {
  it('temiz PNG (tEXt var ama şüpheli marker yok) bulgu üretmez', () => {
    expect(scanAssetMetadata(loadFixture('clean.png'), 'clean.png')).toHaveLength(0)
  })

  it("tEXt chunk'ında 'urn:c2pa' köken metadata'sını yakalar", () => {
    const findings = scanAssetMetadata(loadFixture('dirty-c2pa.png'), 'dirty-c2pa.png')
    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('asset-metadata')
    expect(findings[0]?.excerpt).toContain('tEXt')
  })

  it("iTXt chunk'ında Adobe XMP + OriginalDocumentID metadata'sını yakalar", () => {
    const findings = scanAssetMetadata(loadFixture('dirty-xmp.png'), 'dirty-xmp.png')
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]?.excerpt).toContain('iTXt')
  })

  it('PNG olmayan (imza uymayan) bir dosyada bulgu üretmez', () => {
    expect(scanAssetMetadata(Buffer.from('PNGFAKE not a real png'), 'fake.png')).toHaveLength(0)
  })
})

describe('gate/rules/asset-metadata — JPEG', () => {
  it('temiz JPEG (APP1 var ama şüpheli marker yok) bulgu üretmez', () => {
    expect(scanAssetMetadata(loadFixture('clean.jpg'), 'clean.jpg')).toHaveLength(0)
  })

  it('APP1 segmentinde Adobe XMP + OriginalDocumentID metadata\'sını yakalar', () => {
    const findings = scanAssetMetadata(loadFixture('dirty-xmp.jpg'), 'dirty-xmp.jpg')
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]?.excerpt).toContain('APP1')
  })

  it("APP11 (JUMBF/C2PA) segmentinde 'c2pa' metadata'sını yakalar", () => {
    const findings = scanAssetMetadata(loadFixture('dirty-c2pa.jpg'), 'dirty-c2pa.jpg')
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]?.excerpt).toContain('APP11')
  })

  it('bozuk/kesik JPEG buffer\'ında sonsuz döngüye girmez, hata fırlatmaz', () => {
    const truncated = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00])
    expect(() => scanAssetMetadata(truncated, 'broken.jpg')).not.toThrow()
  })
})

describe('gate/rules/asset-metadata — ilgisiz dosya türleri', () => {
  it('düz metin/kod içeriğinde bulgu üretmez (PNG/JPEG imzası yok)', () => {
    expect(scanAssetMetadata(Buffer.from("const x = 'c2pa adobe xmp'"), 'a.ts')).toHaveLength(0)
  })
})
