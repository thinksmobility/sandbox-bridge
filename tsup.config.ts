import { defineConfig } from 'tsup'

export default defineConfig([
  {
    // CJS + ESM ikisi de üretilir: Jest'in (jest-expo) CJS çözümleyicisi
    // yalnız `import` koşulu olan exports alt yollarını bulamıyordu — demo
    // repoları manuel mock yazmak zorunda kalıyordu (gerçek olay, VoltGo).
    entry: {
      'protocol/index': 'src/protocol/index.ts',
      'manifest/index': 'src/manifest/index.ts',
      'gate/index': 'src/gate/index.ts',
      'gate/cli': 'src/gate/cli.ts'
    },
    format: ['esm', 'cjs'],
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
    // `bin` girişi bilinçli olarak ESM-only kalır (shebang'li tek çalıştırılabilir
    // dosya, `package.json` `bin` alanı yalnızca bunu gösterir — CJS varyantına
    // gerek yok).
    entry: {
      'gate/bin': 'src/gate/bin.ts'
    },
    format: ['esm'],
    dts: true,
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
    format: ['esm', 'cjs'],
    dts: true,
    clean: false,
    platform: 'browser',
    target: 'es2022',
    sourcemap: true,
    splitting: false,
    // `react` (kullanılıyor) + `react-dom`/`react-native` (kullanılmasa da
    // olası tüketici bundler'ları için) HİÇBİR ZAMAN bundle edilmez — çift
    // React kopyası + "Invalid hook call" riski (gerçek olay, VoltGo).
    // Peer olarak sağlanmalı; bkz. `peerDependencies`.
    external: ['react', 'react-dom', 'react-native']
  }
])
