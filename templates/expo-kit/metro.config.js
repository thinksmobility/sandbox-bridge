const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const projectRoot = __dirname
// `@tmob/sandbox-bridge` `file:../..` bağımlılığı npm tarafından sembolik
// link olarak kurulur (gerçek yolu proje kökünün dışında). Metro'nun
// varsayılan çözümleyicisi bunu izleyip `exports` alt-yollarını
// bulamıyor — hem sembolik link takibini hem paket `exports` desteğini
// açıkça etkinleştirip gerçek yolu `watchFolders`a eklemek gerekiyor.
//
// NOT: bridge'i gerçek kullanımda `github:thinksmobility/sandbox-bridge#vX.Y.Z`
// etiketiyle kurarsanız (bkz. ana repo README'si) npm normal bir kopya
// indirir — sembolik link OLMAZ, bu `watchFolders`/`unstable_enableSymlinks`
// ayarına GEREK KALMAZ (Metro paketi zaten kendi `node_modules` altında
// normal bir dizin olarak bulur). Bu ayarlar yalnızca `file:../..` ile
// YEREL geliştirme sırasında gereklidir.
const bridgeRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [...(config.watchFolders ?? []), bridgeRoot]
config.resolver.unstable_enableSymlinks = true
config.resolver.unstable_enablePackageExports = true

// `watchFolders` bridge kökünün TAMAMINI (kendi `node_modules`'ü dahil)
// Metro'nun TreeFS'ine ekliyor. Bridge'in geliştirme/test bağımlılıkları
// (jsdom, vitest, tsup, typescript, eslint...) Metro'nun dosya izleyicisini
// bozan yapılar içerebiliyor (gerçek olay: `expo export -p web`
// `TreeFS: Could not add directory .../sandbox-bridge/node_modules/jsdom`
// ile patlıyordu). Bu paketler demo bundle'ında ASLA kullanılmaz (yalnızca
// bridge'in KENDİ test suite'i için) — dar bir regex ile bloklanır.
// `react`/`react-dom`/`zod` (bridge'in gerçek runtime bağımlılıkları)
// bilinçli olarak bu listede DEĞİLDİR, çözümlenmeye devam eder.
const BRIDGE_DEV_ONLY_PACKAGES = [
  'jsdom',
  'vitest',
  '@vitest',
  '@testing-library',
  'tsup',
  'esbuild',
  'typescript',
  'eslint'
]
const escapedBridgeRoot = bridgeRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const bridgeDevOnlyBlockList = new RegExp(
  `^${escapedBridgeRoot}/node_modules/(?:${BRIDGE_DEV_ONLY_PACKAGES.join('|')})/.*$`
)

const existingBlockList = config.resolver.blockList
  ? [config.resolver.blockList].flat()
  : []
config.resolver.blockList = [...existingBlockList, bridgeDevOnlyBlockList]

// ÇİFT REACT KOPYASI (gerçek olay, 2026-09-08): `bridgeRoot` altındaki
// `node_modules/react` — bridge'in KENDİ devDependency kopyası — Metro
// tarafından ikinci bir React olarak bundle'a girer; bridge hook'ları ikinci
// kopyanın null dispatcher'ında patlar (`Cannot read properties of null
// (reading 'useMemo')`) → beyaz sayfa. Tek-kopya olması gereken paketler
// origin ne olursa olsun UYGULAMA kökünden çözülür (hiyerarşik arama proje
// kökündeki sanal bir origin'den başlatılır). `react-native`/`react-native-web`
// bilinçli olarak listede DEĞİL — web'de `react-native` → `react-native-web`
// takma adını Expo'nun kendi çözümleyicisi yapar. Koruma:
// `scripts/check-single-react.mjs` (release zinciri, işaret === 1).
const SINGLETON_PACKAGES = ['react', 'react-dom', 'scheduler']
const projectOrigin = path.join(projectRoot, 'index.js')

function isSingletonRequest(moduleName) {
  return SINGLETON_PACKAGES.some((name) => moduleName === name || moduleName.startsWith(`${name}/`))
}

const upstreamResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest
  if (!isSingletonRequest(moduleName)) return resolve(context, moduleName, platform)
  return resolve({ ...context, originModulePath: projectOrigin }, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
