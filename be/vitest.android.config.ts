import { defineConfig, mergeConfig } from 'vitest/config'
import baseline from './vitest.config'
// Explicit opt-in only. Requires the owned EmCoin_API36 emulator, SDK and JDK21.
export default mergeConfig(baseline, defineConfig({ test: {
  include: ['tests/android/*.android.ts'], fileParallelism: false,
  testTimeout: 900_000, hookTimeout: 60_000,
} }))
