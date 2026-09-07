#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateManifest } from '@tmob/sandbox-bridge/manifest'
import { buildManifestSource } from '../src/sandbox/manifest.source.ts'

function log(message) {
  process.stdout.write(`${message}\n`)
}

function logError(message) {
  process.stderr.write(`${message}\n`)
}

const source = buildManifestSource()
const manifest = {
  ...source,
  build: {
    repo: process.env.SANDBOX_MANIFEST_REPO ?? 'sandbox-expo-kit',
    commit: process.env.SANDBOX_MANIFEST_COMMIT ?? 'dev',
    builtAt: new Date().toISOString(),
    gate: 'pending'
  }
}

const result = validateManifest(manifest)
if (!result.ok) {
  logError('sandbox.manifest.json geçersiz:')
  for (const error of result.errors) {
    logError(`  - ${error}`)
  }
  process.exit(1)
}

const outputPath = resolve('sandbox.manifest.json')
writeFileSync(outputPath, `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8')
log(`sandbox.manifest.json yazıldı (${outputPath})`)
