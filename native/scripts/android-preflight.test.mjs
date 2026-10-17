import { test } from 'node:test'
import assert from 'node:assert/strict'
import { androidReadiness } from './android-preflight.mjs'
const ready = { sdk: true, java21: true, platform36: true, buildTools: true, adb: true, licenseRecord: true, emulator: true, systemImage: true }
test('installation readiness is not an APK, device test or accepted license claim', () => {
  assert.deepEqual(androidReadiness(ready), { version: 'android-preflight/v1', buildReady: true, emulatorReady: true,
    buildMissing: [], emulatorMissing: [], apkBuilt: false, deviceTested: false, licensesAcceptedByThisScript: false })
})
for (const key of ['sdk', 'java21', 'platform36', 'buildTools', 'adb', 'licenseRecord']) test(`missing ${key} blocks builds and emulator readiness`, () => {
  const result = androidReadiness({ ...ready, [key]: false })
  assert.equal(result.buildReady, false); assert.equal(result.emulatorReady, false); assert.deepEqual(result.buildMissing, [key])
})
for (const key of ['emulator', 'systemImage']) test(`missing ${key} does not pretend an emulator exists`, () => {
  const result = androidReadiness({ ...ready, [key]: false })
  assert.equal(result.buildReady, true); assert.equal(result.emulatorReady, false); assert.deepEqual(result.emulatorMissing, [key])
})
