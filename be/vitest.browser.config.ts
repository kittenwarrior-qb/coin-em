import { defineConfig, mergeConfig } from 'vitest/config'
import baseline from './vitest.config'

// Opt-in only. Default backend discovery does not match the .browser.ts suffix.
export default mergeConfig(baseline, defineConfig({ test: {
  include: ['tests/browser/*.browser.ts'],
  fileParallelism: false,
  testTimeout: 180_000,
  hookTimeout: 60_000,
} }))
