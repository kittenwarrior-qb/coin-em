import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { stagingApi, stagingRoot, stagingConfig, validateStagingReceipt } from './staging-policy.mjs'
import { validateReceipt } from './policy.mjs'
const config = JSON.parse(await readFile(new URL('../capacitor.config.json', import.meta.url), 'utf8'))
const files = [{ file: 'index.html', bytes: 1, sha256: 'a'.repeat(64) }]
const receipt = { format: 'emcoin-native-bundle/v1', profile: 'emcoin-local-android/v1', applicationId: 'cloud.emcoin.app.staging',
  api: stagingApi(10443), sourceDigest: 'a'.repeat(64), files, hashRouter: true, native: true, serviceWorker: false }
test('separate staging config does not mutate or loosen production configuration', () => {
  assert.equal(stagingConfig(config).appId, 'cloud.emcoin.app.staging')
  assert.equal(config.appId, 'cloud.emcoin.app')
  assert.equal(stagingConfig(config).server.cleartext, false)
  assert.equal(stagingConfig(config).android.webContentsDebuggingEnabled, false)
  assert.throws(() => validateReceipt(receipt, files))
  assert.doesNotThrow(() => validateStagingReceipt(receipt, files, 10443))
})
for (const port of [0, 443, 65536, 10443.5, NaN]) test(`rejects unowned QA port ${port}`, () => assert.throws(() => stagingApi(port)))
test('requires an allocated absolute QA temp root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'emcoin-native-stage-'))
  assert.equal(await stagingRoot(root), root)
  await assert.rejects(stagingRoot(os.tmpdir()))
  await assert.rejects(stagingRoot('relative-root'))
})
for (const change of [{ api: 'http://10.0.2.2:10443' }, { api: 'https://evil.example:10443' }, { applicationId: 'cloud.emcoin.app' }, { profile: 'release' }, { files: [] }]) {
  test(`rejects unsafe staging receipt ${JSON.stringify(change)}`, () => assert.throws(() => validateStagingReceipt({ ...receipt, ...change }, files, 10443)))
}
