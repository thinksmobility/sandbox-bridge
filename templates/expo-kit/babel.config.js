// nativewind v4 kurulum dokümanındaki standart config: babel-preset-expo +
// nativewind/babel preset, reanimated plugin listenin SONUNDA olmalı.
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: ['react-native-reanimated/plugin']
  }
}
