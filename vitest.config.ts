import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      // gate/bin.ts: yalnızca gerçek `node <symlink>` alt süreciyle test
      // edilebilen 3 satırlık koşulsuz entry (bkz. test/gate/bin-symlink.test.ts)
      // — dist üzerinden ayrı süreçte koşar, in-process v8 coverage'a girmez.
      exclude: ['src/**/index.ts', 'src/**/*.d.ts', 'src/gate/bin.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
})
