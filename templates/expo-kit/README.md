# sandbox-expo-kit

VoltGo/Rentigo gibi Expo tabanlı sandbox demoları için başlangıç şablonu
(Expo 54 · RN 0.81 · expo-router 6 · nativewind v4 · reanimated 4 ·
react-native-web · react-leaflet web harita). `expo export -p web`
spike'ı bu kit üzerinde **PASS** olarak doğrulanmıştır — detay için ana
repo README'sindeki F0 raporuna bakın.

## Kopyalama adımları

1. Bu dizini yeni demo reposunun köküne kopyalayın (`rsync -a --exclude node_modules --exclude dist --exclude .expo templates/expo-kit/ <hedef>/`).
2. `package.json` → `@tmob/sandbox-bridge` bağımlılığını `"file:../.."`'ten gerçek etikete çevirin: `"github:thinksmobility/sandbox-bridge#v0.1.0"`. **Bunu yaptıktan sonra `metro.config.js`'teki `watchFolders`/`unstable_enableSymlinks`/bridge `blockList` ayarları GEREKMEZ** (yalnızca yerel `file:../..` geliştirmesi için var — `github:` kurulumu normal bir `node_modules` kopyası indirir, sembolik link olmaz) — isterseniz kaldırabilirsiniz, kalırsa da zararsızdır.
3. `app.json` → `expo.name`/`slug`/`scheme`'i demo'ya özel yapın (marka adı GİRMEZ, ör. `"voltgo-sandbox"`).
4. `.env`/`app.json`'a **değil**, ortam değişkenlerine: `EXPO_PUBLIC_SANDBOX_DEMO_ID`, `EXPO_PUBLIC_SANDBOX_ALLOWED_ORIGINS`, `EXPO_PUBLIC_SANDBOX_MANIFEST_DIGEST` (build-time inline edilir, bkz. `app/_layout.tsx`).
5. `src/sandbox/manifest.source.ts`'i kendi ekran/persona/senaryo envanterinizle değiştirin; `npm run manifest:build` `sandbox.manifest.json`'u üretir ve doğrular.
6. `app/index.tsx` + `src/mock/apiAdapter.ts`'i kendi ekranlarınız ve seed verinizle değiştirin; `SandboxSelectable` ile feedback'e açık bileşenleri işaretleyin.
7. `npm install` → `npm run build:web` (`expo export -p web`, çıktı `dist/`) → `npx sandbox-gate --src . --out dist` (kendi private `sandbox-gate.config.json`'unuzla, bkz. `../sandbox-gate.config.example.json`) → `../docker/Dockerfile.static` ile paketleyin.

## Bilinen kısıtlar

- `src/map/Map.tsx` native'de yalnızca yer tutucu — gerçek native harita gerekiyorsa değiştirin.
- Leaflet'in varsayılan marker ikonları (`node_modules/leaflet/dist/images/*.png`) Metro'nun web export'unda otomatik kopyalanmaz (`Importing local resources in CSS is not supported yet` uyarısı) — özel bir `L.Icon` (uzak URL veya `import`lu asset) ile değiştirin.
- `jest-expo` Expo SDK 54 ile eşleşecek şekilde `^54.0.18`'e sabitlendi (ilk kurulumda yanlışlıkla `^57.0.5` çekilmişti — `npm ls jest-expo expo` ile eşleştiğini doğrulayın).
- Bağımlılık sürümleri `npx expo install --check` ile Expo SDK 54'e göre pinlendi (`react`/`react-dom` 19.1.0, `@types/react` `~19.1.10`, `@types/jest` 29.5.14) ve babel.config.js'in kullandığı ama devDependencies'te eksik olan `babel-preset-expo` eklendi. Bu şablonu kopyaladıktan sonra `npx expo install --check` çalıştırıp "Dependencies are up to date" çıktığını doğrulayın — SDK güncellendikçe bu sürümler yeniden kayabilir.
- `metro.config.js` bridge kökünü `watchFolders`'a ekliyor (yalnız `file:../..` yerel geliştirmesinde) — bridge'in `jsdom`/`vitest`/`tsup`/`typescript`/`eslint` gibi geliştirme bağımlılıkları Metro'nun dosya izleyicisini bozabildiği için (`TreeFS: Could not add directory .../node_modules/jsdom`) dar bir `resolver.blockList` ile hariç tutulur; `react`/`react-dom`/`zod` (gerçek runtime bağımlılıkları) etkilenmez.

## Çift React kopyası koruması

`file:../..` ile yerel kurulumda Metro, bridge'in kendi `node_modules/react`'ini
ikinci bir React olarak bundle'a alabilir (beyaz sayfa, `Cannot read properties
of null (reading 'useMemo')`). `metro.config.js` `react`/`react-dom`/`scheduler`
isteklerini uygulama kökünden çözer; `npm run check:single-react` (release
zincirinde) bundle'daki React kopya işaretinin tam 1 olduğunu doğrular.
