# @tmob/sandbox-bridge

B2C satış sandbox demoları (KONU-08 · MOD-025) için ortak altyapı: iframe köprü
protokolü, React yardımcıları, `sandbox.manifest.json` şeması ve marka/sır/PII
tarama kapısı (`sandbox-gate`). Bu repo demo repolarının (`sandbox-<demo>`)
tükettiği tek doğruluk kaynağıdır — protokolü veya kural setini kopyalamayın.

> **Gizlilik notu:** Bu repo **public**'tir ve bilinçli olarak hiçbir kaynak
> müşteri/marka adı barındırmaz — ne kodda ne dökümanda. `sandbox-gate`'in
> varsayılan marka deny-list'i (`src/gate/rules/brand.ts` → `DENY_TERMS`)
> yalnızca marka-bağımsız, TMOB'un kendi iç ortam adlandırma kalıplarından
> (bkz. `DENY_TERMS`) oluşur. Somut marka isimleri her **private**
> demo reposunun kendi `sandbox-gate.config.json` → `extraDenyTerms`
> alanına gider — bkz. `templates/sandbox-gate.config.example.json` ve
> aşağıdaki "sandbox-gate" bölümü.

## Kurulum

Demo repoları bu paketi **GitHub Release tarball'ı** olarak tüketir (önceden
derlenmiş `dist/` içerir; Docker imajında git, `prepare` ya da devDependency
kurulumu gerekmez — repo public olduğu için token da gerekmez):

```json
{
  "dependencies": {
    "@tmob/sandbox-bridge": "https://github.com/thinksmobility/sandbox-bridge/releases/download/v0.3.5/tmob-sandbox-bridge-0.3.5.tgz"
  }
}
```

Yeni sürüm çıkarma: `package.json` sürümünü artır → commit + `git tag vX.Y.Z` →
`git push origin main --tags` → `npm run release:github` (`npm pack` + `gh release
create` ile tarball'ı release'e ekler). Demolar URL'deki sürümü güncelleyip
`npm install` / `pnpm add` ile geçer.

Alternatif (yerel geliştirme): `"@tmob/sandbox-bridge": "file:../sandbox-bridge"` —
npm symlink kurar; demoların `metro.config.js`'i bu durumu algılayıp
`watchFolders`/symlink ayarlarını açar (tarball kurulumunda atlanır). Git tag
bağımlılığı (`github:thinksmobility/sandbox-bridge#vX.Y.Z`) da çalışır ama
kurulumda `prepare` (tsup) koşar; **pnpm**'de `pnpm approve-builds` gerekebilir.

`react` **peer dependency**'dir (`>=18 <20`, opsiyonel) ve asla bundle
edilmez — kendi `react`'inizi getirirsiniz, çift kopya/`Invalid hook call` riski oluşmaz.

## Giriş noktaları

| Import | İçerik |
|---|---|
| `@tmob/sandbox-bridge` | Protokol tipleri, zod şemaları, `parseMessage`/`createEnvelope`/`isFromAllowedOrigin` |
| `@tmob/sandbox-bridge/react` | `SandboxProvider`, `useSandbox`, `SandboxSelectable`, `useVirtualClock`, `useStateSync` |
| `@tmob/sandbox-bridge/manifest` | `sandbox.manifest.json` zod şeması + `validateManifest` |
| `@tmob/sandbox-bridge/gate` | Tarama kuralları + `scanDirectory` + `runGate` (programatik API) |
| `sandbox-gate` (bin) | CLI — `npx sandbox-gate --src . --out dist` |

## Protokol (v1)

Her mesaj aynı zarfı taşır: `{ v: 1, demoId, sessionId, msgId, ts, type, payload }`.

**demo → CP:** `sandbox:ready` · `sandbox:navigate` · `sandbox:component-selected` ·
`sandbox:event` · `sandbox:state-sync` · `sandbox:error`

**CP → demo:** `sandbox:init` · `sandbox:feedback-mode` · `sandbox:highlight` ·
`sandbox:persona` · `sandbox:scenario` · `sandbox:reset`

Güvenlik: `isFromAllowedOrigin` `'*'`'ı asla joker olarak eşleştirmez — allow-list
her zaman açık origin'lerden oluşmalı. Giden `postMessage` hedefi de asla
`'*'` olmamalı; `SandboxProvider` el sıkışma öncesi yalnızca yapılandırılan
`allowedOrigins` listesine (joker hariç), el sıkışma sonrası CP'nin
`sandbox:init` ile bildirdiği tek origin'e yazar.

## React kullanımı

```tsx
import { SandboxProvider, SandboxSelectable, useSandbox } from '@tmob/sandbox-bridge/react'

function App() {
  return (
    <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest={digest} screens={12}>
      <KaskoPriceScreen />
    </SandboxProvider>
  )
}

function PriceCard() {
  return (
    <SandboxSelectable screenId="scr-kasko-price" componentId="cmp-price-card" label="Fiyat kartı">
      <PriceCardContent />
    </SandboxSelectable>
  )
}
```

**Çalışma zamanı origin config'i:** statik export'ta (`expo export -p web` /
Next `output:'export'`) build-time env'ler bundle'a gömülür ve deploy'lar
arası donar — `allowedOrigins` düz dizi yerine bir fonksiyon da kabul eder,
böylece `resolveAllowedOrigins` ile konteyner-zamanı `window.__SANDBOX_RUNTIME__`
(bkz. `templates/docker` → `40-generate-sandbox-runtime.sh`) build-time
değerinden ÖNCELİKLİ kullanılabilir (ikisi de yoksa fail-closed boş dizi):

```tsx
import { SandboxProvider, resolveAllowedOrigins } from '@tmob/sandbox-bridge/react'

<SandboxProvider
  allowedOrigins={() =>
    resolveAllowedOrigins({
      runtime: typeof window !== 'undefined' ? (window as { __SANDBOX_RUNTIME__?: unknown }).__SANDBOX_RUNTIME__ : undefined,
      buildTime: process.env.EXPO_PUBLIC_SANDBOX_ALLOWED_ORIGINS
    })
  }
  /* ... */
/>
```

Tam kurulum (nginx entrypoint script'i + Next/Expo `<script>` etiketi) için
`templates/docker/README.md`'ye bakın.

Demo kendi store'unu (booking/kasko form state'i vb.) sıfırlamak isterse
`onReset`/`onInit` kullanır; `resetCount` `key={resetCount}` remount deseni
için uygundur:

```tsx
<SandboxProvider
  /* ... */
  onInit={(payload) => hydrateFromSnapshot(payload.snapshot)}
  onReset={() => bookingStore.getState().reset()}
>
  <RootScreen key={useSandbox().resetCount} />
</SandboxProvider>
```

`sandbox:ready` zarfı, CP iframe URL'sindeki `?sbSession=<opak>` değerini
`sessionId` olarak taşır (URL'den otomatik okunur; `initialSessionId` prop'u
ile açıkça da verilebilir). `sandbox:init` geldiğinde CP'nin bildirdiği
`session.id` her zaman bunun üzerine yazar.

`sandbox:highlight` görsel vurgusu feedback modundan **bağımsız** çalışır
(ör. `?focus=` derin bağlantısı feedback modu kapalıyken de bileşeni
gösterir); feedback modu yalnız tıklanabilirliği/klavye erişimini belirler.
Vurgu kısa süre sonra söner, `prefers-reduced-motion` tercihinde
animasyonsuz ve statik kalır.

Feedback modunda tıklama/Enter **capture aşamasında** yakalanır: sarmalanan
iç butonlar/`Pressable`'lar (ör. sipariş kartları) tıklamayı yutamaz, kartın
üstüne tıklamak da bileşeni seçer; feedback modu kapalıyken çocuklar normal
davranır. İç içe selectable'larda tıklama EN İÇTEKİ bileşeni seçer (dış wrapper
hedef daha içteki bir selectable'a aitse dokunmaz).

`SandboxSelectable` web'de sarmaladığı öğeye `data-sb-screen`/`data-sb-component`
basar ve feedback modunda tıklamayı `sandbox:component-selected` mesajına
çevirir. **React Native ağacında** (`typeof document === 'undefined'`) hiçbir
ek bağımlılık gerektirmeden no-op'a düşer — çocuklarını aynen render eder.
Expo/React Native demo ekranlarında da aynı bileşen kullanılabilir; web export
build'inde otomatik olarak web davranışına geçer.

Oturum state'i **bellekte** tutulur (çapraz-origin iframe'de `localStorage`
Safari ITP tarafından engellenebilir). `useStateSync` snapshot'ı 500ms
debounce ile `sandbox:state-sync` üzerinden CP'ye yazar; CP bunu saklar ve
`sandbox:init.snapshot` ile geri verir. `sandbox:reset` demo'yu seed'e
birebir döndürür.

## Manifest

Her demo repo build'de kökte `sandbox.manifest.json` üretir
(`templates/expo-kit/scripts/build-manifest.mjs` referans script'tir).
`validateManifest` CI'da `manifest:validate` adımında ve BE'nin şablon
import script'inde kullanılır. `components[].selector` yalnızca
`[data-sb-component='...']` biçimindeki sabit deseni kabul eder (zod regex) —
CP bunu asla ham `querySelector` girdisi olarak kullanıcıya vermez, yalnızca
kendi `SandboxSelectable`'ının bastığı attribute ile eşleştirir.

`screens[].variants` / `components[].variantScope` genel amaçlı varyant
etiketleridir (küçük harf/rakam/tire, en fazla 8 öğe) — belirli bir enum'a
kilitli DEĞİLDİR. AirNova bunu `['original','improved']` (before/after
redesign) KONVANSİYONUYLA kullanır; Rentigo `['gecikme','bulunamadi']` gibi
senaryo/durum etiketleri kullanır. `original|improved` anlamı yalnızca
dokümantasyondur, şema tarafından zorlanmaz.

`build.digest` opsiyoneldir (sha256 hex, 64 karakter) — demolar içerik
digest'ini buraya yazabilir, ayrı bir `src/generated/*-meta.json` yardımcı
dosyasına gerek kalmaz; `sandbox:ready`'nin `manifestDigest`'i için de
kaynak olarak kullanılabilir.

## `sandbox-gate` — tarama kapısı

```bash
npx sandbox-gate --src . --out dist --report gate-report.json --config sandbox-gate.config.json
```

Kaynak dizini **ve** build çıktısını tarar; `.gitignore`'a saygı gösterir
(basit satır-öneki eşleşmesi), ikili dosyaları ve paket kilit dosyalarını
(`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) varsayılan olarak
atlar. FAIL ⇒ exit code 1, Docker image üretilmemeli / CI kırmızı olmalı.

**Kural setleri:**
- **Marka deny-list** — büyük/küçük harf ve Türkçe karakter (İ/I/ı/i, ç, ş, ğ,
  ö, ü) duyarsız. Paketin kendi varsayılan listesi (`DENY_TERMS`,
  `src/gate/rules/brand.ts`) **hiçbir somut marka adı içermez** — yalnızca
  TMOB'un kendi marka-bağımsız iç ortam host kalıpları. **Somut kaynak marka isimlerini siz
  eklersiniz:** her demo reposunun kendi (private, bu pakete commit'lenmeyen)
  `sandbox-gate.config.json` → `extraDenyTerms` alanına yazın — başlangıç
  için `templates/sandbox-gate.config.example.json`'u kopyalayın. Bu bir
  allow-list istisnası **değildir**, yalnızca ek yasak terim eklemektir.
- **Kimlik bilgisi imzaları** — Google/AWS anahtarları, private key bloğu,
  Basic auth, JWT, hex sır ataması (`SECRET`/`HMAC`/`API_KEY`/`XApiKey`
  yakınında 32+ hex karakter). Rapordaki `excerpt` her zaman maskelenir.
- **Yasak dosyalar** — `google-services.json`, `GoogleService-Info.plist`,
  `eas.json`, `.env*` (`.env.example` hariç), `*.keystore`, `*.p8`, `*.p12`,
  `*.mobileprovision`.
- **Kişisel veri** — yanlış pozitif tuzağına karşı: 11 haneli bir dizi yalnızca
  **TC Kimlik No checksum'ından geçerse** işaretlenir (seed verisi bilinçli
  olarak checksum'ı geçmeyen numaralar kullanmalı); telefonlar yalnızca
  rezerve test aralığı (`+90 555 000 XX XX`) dışındaysa işaretlenir;
  e-postalar yalnızca `@example.com`, `@example.org` veya `*.demo` alan
  adları dışındaysa işaretlenir.

**Konfigürasyon** (`sandbox-gate.config.json`, opsiyonel):

```json
{
  "extraDenyTerms": ["staging-host-adi"],
  "ignore": ["path/prefix/to/skip"],
  "skipDirs": ["ek-dizin-adi"],
  "skipFiles": ["ek-dosya-adi"]
}
```

`ignore` yol-öneki eşleşmesidir (tam glob değil) — `root`'a göre görelidir.

`templates/sandbox-gate.config.example.json` marka adı İÇERMEYEN bir başlangıç
şablonudur — her demo reposu bunu kendi köküne `sandbox-gate.config.json`
olarak kopyalayıp `extraDenyTerms`'i kendi kaynak marka terimleriyle doldurur.
Bu dosya demo reposunun **kendi** (bu pakete commit'lenmeyen, gerekirse
`.gitignore`'a alınabilen) sorumluluğundadır.

## Docker/nginx şablonu

`templates/docker/` — statik SPA'lar için çok aşamalı build (Node → nginx:alpine).
`nginx.conf` `frame-ancestors` başlığını `SANDBOX_ALLOWED_ORIGINS` env'inden
`envsubst` ile üretir; `X-Frame-Options` **gönderilmez** (allow-list ifade
edemez, `frame-ancestors` onu geçersizleştirir).

## `sandbox-expo-kit` şablonu

`templates/expo-kit/` — Expo 54 + expo-router + nativewind v4 +
react-native-reanimated + react-native-web + `react-leaflet` (web harita)
başlangıç şablonu. Kopyalama adımları için `templates/expo-kit/README.md`.

## Web (Next.js/Vite) demo repoları için önerilen test toolchain

AirNova (Next.js) dilimi, `vitest@5` + `@vitejs/plugin-react@6` + `vite@8`
kombinasyonunda coverage text-reporter'ın bazı dosyaları sessizce rapordan
düşürdüğünü tespit etti (kapsam sayıları gerçek dışı yüksek/eksik
görünüyordu). Şu kombinasyon bunu düzeltiyor ve doğrulandı:

```json
{
  "devDependencies": {
    "vitest": "^4.1.11",
    "@vitest/coverage-istanbul": "^4.1.11",
    "@vitejs/plugin-react": "^5.2.0",
    "vite": "^7.0.0"
  }
}
```

`@vitest/coverage-v8` yerine `@vitest/coverage-istanbul` kullanın. Bu kısıt
yalnızca **web (Next.js/Vite tabanlı) demo repoları** için geçerlidir —
`templates/expo-kit` `jest-expo` kullanır, etkilenmez. Bu paketin kendi
kök testleri de `@vitest/coverage-v8` ile çalışır (Node/React kütüphane
kodu, aynı sorunu tetiklemiyor); yalnızca web demo repoları için yukarıdaki
kombinasyonu önerin.

## Geliştirme

```bash
npm install       # bağımlılıkları kurar, prepare ile build eder
npm test          # vitest + kapsam (≥%80 dal/satır/fonksiyon/ifade)
npm run typecheck # tsc --noEmit
npm run build     # tsup → dist/
npm run gate:self # kendi kaynak+dist'ine karşı gate koşar (PASS olmalı)
```
