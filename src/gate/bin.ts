#!/usr/bin/env node
/**
 * Gerçek CLI giriş noktası (`package.json` → `bin.sandbox-gate`). Bilinçli
 * olarak "main module" kontrolü İÇERMEZ (`import.meta.url === file://argv[1]`
 * gibi) — böyle bir kontrol paket bir git/`file:` bağımlılığı olarak
 * sembolik link üzerinden kurulduğunda argv[1] (symlink yolu) ile
 * import.meta.url (Node'un çözdüğü gerçek yol) birbirini asla tutmayıp
 * CLI'ın sessizce hiçbir şey yapmadan çıkmasına yol açıyordu (gerçek olay,
 * VoltGo'nun `file:../sandbox-bridge` kurulumunda). Bu dosya YALNIZCA `bin`
 * girişi olarak çağrılır, hiçbir zaman kütüphane olarak import edilmez —
 * dolayısıyla koşulsuz çalıştırma güvenlidir.
 */
import { runGate } from './cli.js'

process.exit(runGate(process.argv.slice(2)))
