import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./android-cli.ps1', import.meta.url))
const options = { skip: process.platform !== 'win32', timeout: 20000 }
const run = (args = [], shell = 'pwsh.exe') => spawnSync(shell, ['-NoProfile', '-NonInteractive', '-File', script, ...args], { encoding: 'utf8', windowsHide: true, timeout: 15000 })
const output = result => `${result.stdout}${result.stderr}`
test('PowerShell parses the helper and default Inspect installs nothing', options, () => {
  const result = run()
  assert.equal(result.status, 0, output(result))
  const state = JSON.parse(result.stdout)
  assert.equal(state.java21, true)
  assert.equal(state.installedByThisAction, false)
  assert.equal(state.licensesAcceptedByScript, false)
})
test('helper also supports Windows PowerShell5 native Java stderr behavior', options, () => {
  const result = run(['-Action', 'Inspect'], 'powershell.exe')
  assert.equal(result.status, 0, output(result))
  assert.equal(JSON.parse(result.stdout).java21, true)
})
for (const target of ['D:\\', 'relative-sdk']) test(`refuses broad or relative SDK target ${target}`, options, () => {
  const result = run(['-SdkRoot', target])
  assert.notEqual(result.status, 0)
  assert.match(output(result), /drive root|absolute SDK path/)
})
test('requires the manually downloaded archive and does not silently fetch it', options, () => {
  const result = run(['-Action', 'Prepare'])
  assert.notEqual(result.status, 0)
  assert.match(output(result), /First download/)
})
test('rejects an unverified ZIP before creating any SDK directory', options, () => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'emcoin-android-cli-'))
  const zip = path.join(fixture, 'synthetic.zip'), sdk = path.join(fixture, 'untouched-sdk')
  writeFileSync(zip, 'not a Google ZIP')
  const result = run(['-Action', 'Prepare', '-ArchivePath', zip, '-SdkRoot', sdk])
  assert.notEqual(result.status, 0)
  assert.match(output(result), /SHA256 differs/)
  assert.equal(existsSync(sdk), false)
})
test('refuses missing Java without substituting an incompatible system JDK', options, () => {
  const result = run(['-JavaRoot', path.join(os.tmpdir(), 'emcoin-missing-java')])
  assert.notEqual(result.status, 0)
  assert.match(output(result), /JDK21 is missing/)
})
test('no package installation happens without prepared verified tools', options, () => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'emcoin-android-cli-'))
  const result = run(['-Action', 'Install', '-SdkRoot', path.join(fixture, 'missing-sdk')])
  assert.notEqual(result.status, 0)
  assert.match(output(result), /Run Prepare/)
})
