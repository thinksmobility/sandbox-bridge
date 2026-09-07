/**
 * Statik export'larda (Next `output:'export'` / Expo web) `NEXT_PUBLIC_*`/
 * `EXPO_PUBLIC_*` gibi build-time env değişkenleri BUNDLE'A GÖMÜLÜR — aynı
 * imaj farklı ortamlarda (staging/prod) farklı CP origin'leriyle
 * çalıştırılamaz (gerçek olay: imaj `http://localhost:3000` ile üretime
 * çıktı, köprü ölü kaldı). Çözüm: konteyner başlarken üretilen
 * `/sandbox-runtime.js` (`window.__SANDBOX_RUNTIME__`) — bu fonksiyon
 * runtime değeri build-time değerinden ÖNCELİKLİ sayar, ikisi de yoksa/
 * geçersizse fail-closed boş dizi döner (`'*'` asla).
 */

export interface ResolveAllowedOriginsOptions {
  /** Genelde `typeof window !== 'undefined' ? window.__SANDBOX_RUNTIME__ : undefined`. */
  runtime?: unknown
  /** Build-time env değeri — tek origin, boşluk/virgülle ayrılmış liste, ya da dizi. */
  buildTime?: string | readonly string[]
}

function isValidOrigin(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value === '*') return false
  try {
    const url = new URL(value)
    // `url.origin` yalnızca scheme+host+port'u yeniden üretir — girdi path/query/hash
    // içeriyorsa eşitlik bozulur, böyle girdiler reddedilir (yalnızca saf origin kabul).
    return url.origin === value
  } catch {
    return false
  }
}

function splitBuildTimeString(value: string): string[] {
  return value.split(/[\s,]+/).filter((entry) => entry.length > 0)
}

function extractRuntimeOrigins(runtime: unknown): string[] {
  if (typeof runtime !== 'object' || runtime === null) return []
  const allowedOrigins = (runtime as { allowedOrigins?: unknown }).allowedOrigins
  if (!Array.isArray(allowedOrigins)) return []
  return allowedOrigins.filter(isValidOrigin)
}

function extractBuildTimeOrigins(buildTime: ResolveAllowedOriginsOptions['buildTime']): string[] {
  if (typeof buildTime === 'string') {
    return splitBuildTimeString(buildTime).filter(isValidOrigin)
  }
  if (Array.isArray(buildTime)) {
    return buildTime.filter(isValidOrigin)
  }
  return []
}

/**
 * Runtime → build-time → boş dizi (fail-closed) sırasıyla geçerli allow-list
 * origin'lerini döner. Geçersiz/eksik runtime değeri sessizce atlanır (hata
 * fırlatmaz), build-time'a düşülür.
 */
export function resolveAllowedOrigins(options: ResolveAllowedOriginsOptions = {}): string[] {
  const runtimeOrigins = extractRuntimeOrigins(options.runtime)
  if (runtimeOrigins.length > 0) return runtimeOrigins

  return extractBuildTimeOrigins(options.buildTime)
}
