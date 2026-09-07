const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const projectRoot = __dirname
// `@tmob/sandbox-bridge` `file:../..` bağımlılığı npm tarafından sembolik
// link olarak kurulur (gerçek yolu proje kökünün dışında). Metro'nun
// varsayılan çözümleyicisi bunu izleyip `exports` alt-yollarını
// bulamıyor — hem sembolik link takibini hem paket `exports` desteğini
// açıkça etkinleştirip gerçek yolu `watchFolders`a eklemek gerekiyor.
const bridgeRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [...(config.watchFolders ?? []), bridgeRoot]
config.resolver.unstable_enableSymlinks = true
config.resolver.unstable_enablePackageExports = true

module.exports = withNativeWind(config, { input: './global.css' })
