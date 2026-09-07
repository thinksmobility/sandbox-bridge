# sandbox-expo-kit

VoltGo/Rentigo gibi Expo tabanlı sandbox demoları için başlangıç şablonu
(Expo 54 · RN 0.81 · expo-router 6 · nativewind v4 · reanimated 4 ·
react-native-web · react-leaflet web harita). `expo export -p web`
spike'ı bu kit üzerinde **PASS** olarak doğrulanmıştır — detay için ana
repo README'sindeki F0 raporuna bakın.

## Kopyalama adımları

1. Bu dizini yeni demo reposunun köküne kopyalayın (`rsync -a --exclude node_modules --exclude dist --exclude .expo templates/expo-kit/ <hedef>/`).
2. `package.json` → `@tmob/sandbox-bridge` bağımlılığını `"file:../.."`'ten gerçek etikete çevirin: `"github:thinksmobility/sandbox-bridge#v0.1.0"`.
3. `app.json` → `expo.name`/`slug`/`scheme`'i demo'ya özel yapın (marka adı GİRMEZ, ör. `"voltgo-sandbox"`).
4. `.env`/`app.json`'a **değil**, ortam değişkenlerine: `EXPO_PUBLIC_SANDBOX_DEMO_ID`, `EXPO_PUBLIC_SANDBOX_ALLOWED_ORIGINS`, `EXPO_PUBLIC_SANDBOX_MANIFEST_DIGEST` (build-time inline edilir, bkz. `app/_layout.tsx`).
5. `src/sandbox/manifest.source.ts`'i kendi ekran/persona/senaryo envanterinizle değiştirin; `npm run manifest:build` `sandbox.manifest.json`'u üretir ve doğrular.
6. `app/index.tsx` + `src/mock/apiAdapter.ts`'i kendi ekranlarınız ve seed verinizle değiştirin; `SandboxSelectable` ile feedback'e açık bileşenleri işaretleyin.
7. `npm install` → `npm run build:web` (`expo export -p web`, çıktı `dist/`) → `npx sandbox-gate --src . --out dist` (kendi private `sandbox-gate.config.json`'unuzla, bkz. `../sandbox-gate.config.example.json`) → `../docker/Dockerfile.static` ile paketleyin.

## Bilinen kısıtlar

- `src/map/Map.tsx` native'de yalnızca yer tutucu — gerçek native harita gerekiyorsa değiştirin.
- Leaflet'in varsayılan marker ikonları (`node_modules/leaflet/dist/images/*.png`) Metro'nun web export'unda otomatik kopyalanmaz (`Importing local resources in CSS is not supported yet` uyarısı) — özel bir `L.Icon` (uzak URL veya `import`lu asset) ile değiştirin.
- `jest-expo` Expo SDK 54 ile eşleşecek şekilde `^54.0.18`'e sabitlendi (ilk kurulumda yanlışlıkla `^57.0.5` çekilmişti — `npm ls jest-expo expo` ile eşleştiğini doğrulayın).
