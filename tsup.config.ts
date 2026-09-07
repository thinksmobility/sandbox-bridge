import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      'protocol/index': 'src/protocol/index.ts',
      'manifest/index': 'src/manifest/index.ts',
      'gate/index': 'src/gate/index.ts',
      'gate/cli': 'src/gate/cli.ts'
    },
    format: ['esm'],
    dts: true,
    // NOT: clean burada YAPILMAZ — tsup, config dizisindeki her girdiyi ayrı
    // bir process olarak PARALEL çalıştırır. clean:true burada olsaydı, bu
    // process dist/'i silerken diğer (react) process'in DTS çıktısını
    // yarış durumuyla silebiliyordu (build log "başarılı" dese bile dosya
    // diskte kalmıyordu — gerçek build'de gözlemlendi). Tekilleştirme
    // `npm run build` script'inde tek seferlik `rm -rf dist` ile yapılır.
    clean: false,
    platform: 'node',
    target: 'es2022',
    sourcemap: true,
    splitting: false
  },
  {
    entry: {
      'react/index': 'src/react/index.ts'
    },
    format: ['esm'],
    dts: true,
    clean: false,
    platform: 'browser',
    target: 'es2022',
    sourcemap: true,
    splitting: false,
    external: ['react', 'react-dom', 'react-native']
  }
])
