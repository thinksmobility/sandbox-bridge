import type { Finding } from '../types.js'

/**
 * Görsel varlıklara (PNG/JPEG) gömülü köken/kimlik metadata'sı — bir görsel
 * kaynak müşterinin varlık setinden GELDİ mi diye "parmak izi" verebilir
 * (C2PA content credentials, Adobe XMP `OriginalDocumentID` vb.). Binary
 * dosyalar normal `scanBrand`/`scanCredentials`/`scanPii` metin taramasından
 * atlanır (`isLikelyBinary`) — bu kural PNG chunk'larını / JPEG segmentlerini
 * yapısal olarak gezip yalnızca METADATA taşıyan bölümleri (piksel verisi
 * DEĞİL) denetler, hem `--src` hem `--out` taramasında çalışır.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const PNG_METADATA_CHUNK_TYPES = new Set(['iTXt', 'tEXt', 'zTXt', 'eXIf'])
const JPEG_METADATA_MARKERS = new Set([0xe1, 0xeb]) // APP1 (Exif/XMP), APP11 (JUMBF/C2PA)

const SUSPICIOUS_MARKERS: readonly string[] = [
  'c2pa',
  'jumb',
  'xmp',
  'adobe',
  'originaldocumentid',
  'urn:c2pa'
]

function findMarker(buffer: Buffer): string | null {
  const lower = buffer.toString('latin1').toLowerCase()
  for (const marker of SUSPICIOUS_MARKERS) {
    if (lower.includes(marker)) return marker
  }
  return null
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)
}

function scanPngChunks(buffer: Buffer, filePath: string): Finding[] {
  const findings: Finding[] = []
  let offset = 8
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    if (length < 0 || dataEnd + 4 > buffer.length) break // bozuk/kesik dosya — güvenli çık

    if (PNG_METADATA_CHUNK_TYPES.has(type)) {
      const marker = findMarker(buffer.subarray(dataStart, dataEnd))
      if (marker) {
        findings.push({
          rule: 'asset-metadata',
          file: filePath,
          line: 0,
          excerpt: `PNG "${type}" chunk'ında köken/kimlik metadata'sı ('${marker}')`
        })
      }
    }
    offset = dataEnd + 4 // +4 = CRC
  }
  return findings
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8
}

function scanJpegSegments(buffer: Buffer, filePath: string): Finding[] {
  const findings: Finding[] = []
  let offset = 2
  while (offset + 2 <= buffer.length) {
    if (buffer[offset] !== 0xff) break
    const marker = buffer[offset + 1]
    if (marker === undefined) break
    // SOI/EOI ve RST0-7 (0xd0-0xd7) uzunluk taşımaz, doğrudan geç.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    if (marker === 0xda) break // Start of Scan — header sonu, entropy-coded veri başlar

    if (offset + 4 > buffer.length) break
    const segmentLength = buffer.readUInt16BE(offset + 2)
    if (segmentLength < 2) break
    const dataStart = offset + 4
    const dataEnd = offset + 2 + segmentLength
    if (dataEnd > buffer.length) break

    if (JPEG_METADATA_MARKERS.has(marker)) {
      const markerHit = findMarker(buffer.subarray(dataStart, dataEnd))
      if (markerHit) {
        findings.push({
          rule: 'asset-metadata',
          file: filePath,
          line: 0,
          excerpt: `JPEG APP${(marker - 0xe0).toString()} segmentinde köken/kimlik metadata'sı ('${markerHit}')`
        })
      }
    }
    offset = dataEnd
  }
  return findings
}

/**
 * PNG/JPEG imza kontrolü ile başlar; eşleşmezse boş dizi döner (diğer
 * dosya türlerine dokunmaz).
 */
export function scanAssetMetadata(buffer: Buffer, filePath: string): Finding[] {
  if (isPng(buffer)) return scanPngChunks(buffer, filePath)
  if (isJpeg(buffer)) return scanJpegSegments(buffer, filePath)
  return []
}
