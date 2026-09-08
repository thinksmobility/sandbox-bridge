#!/usr/bin/env node
/**
 * BUG-12 koruması (UI E2E 4. tur, 2026-09-08): web bundle'ında React'in TEK
 * kopyası olmalı. İki kopya (ör. `file:../sandbox-bridge` symlink'inin kendi
 * `node_modules/react`'i) bridge hook'larını null dispatcher'da patlatır →
 * beyaz sayfa. İşaret: `react` paketinin `exports.__CLIENT_INTERNALS…=` ATAMASI
 * (react-dom yalnız OKUR, atamaz) → kopya başına tam 1 eşleşme.
 *
 * Kullanım: node scripts/check-single-react.mjs [bundle-dizini=dist/_expo/static/js/web]
 * Çıkış: 0 tek kopya · 1 aksi (bundle yok / ≠1 kopya).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MARKER = /__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE\s*=(?!=)/g
const dir = process.argv[2] ?? 'dist/_expo/static/js/web'

function countReactCopies(bundleDir) {
  const bundles = readdirSync(bundleDir).filter((name) => /^entry-.*\.js$/.test(name))
  const counts = bundles.map((name) => ({
    name,
    copies: (readFileSync(join(bundleDir, name), 'utf8').match(MARKER) ?? []).length
  }))
  return { bundles, total: counts.reduce((sum, c) => sum + c.copies, 0), counts }
}

const { bundles, total, counts } = countReactCopies(dir)
if (bundles.length === 0) {
  process.stderr.write(`check-single-react: FAIL — ${dir} altında entry-*.js yok (önce build)\n`)
  process.exit(1)
}
if (total !== 1) {
  process.stderr.write(
    `check-single-react: FAIL — React kopya işareti ${total} (beklenen 1)\n` +
      counts.map((c) => `  - ${c.name}: ${c.copies}`).join('\n') +
      '\n  Bkz. metro.config.js SINGLETON_PACKAGES (çift React kopyası → beyaz sayfa)\n'
  )
  process.exit(1)
}
process.stdout.write(`check-single-react: OK (${bundles[0]} — tek React kopyası)\n`)
