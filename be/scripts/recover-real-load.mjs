import { readFile, realpath, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { assertOwnedFixture } from './load-policy.mjs'

if (process.argv.length !== 3) throw new Error('EXPECTED_ONE_OWNED_EVIDENCE_DIRECTORY')
const base = await realpath(os.tmpdir()), output = await realpath(process.argv[2])
const relative = path.relative(base, output)
if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(output).startsWith('emcoin-real-load-')) throw new Error('INVALID_OWNED_EVIDENCE_DIRECTORY')
const configPath = await realpath(path.join(output, 'Caddyfile'))
if (path.relative(output, configPath) !== 'Caddyfile') throw new Error('INVALID_OWNED_CONFIG')
const config = await readFile(configPath, 'utf8')
const matches = [...config.matchAll(/reverse_proxy (emcoin-r30-[a-f0-9-]{36})-backend:3001/g)]
if (matches.length !== 1) throw new Error('INVALID_OWNED_CONFIG_ID')
const runId = matches[0][1]
const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 20000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
const targets = [
  ...['proxy', 'backend', 'redis'].map(suffix => ({ kind: 'container', name: `${runId}-${suffix}` })),
  { kind: 'network', name: `${runId}-ingress` }, { kind: 'network', name: runId },
  { kind: 'image', name: `emcoin-r30-qa:${runId}` },
]
// Verify ALL extant resource ownership and stopped state before removing any.
const verified = []
for (const target of targets) {
  let value
  try { value = JSON.parse(docker([target.kind, 'inspect', target.name]))[0] }
  catch { throw new Error('EXACT_RESOURCE_MISSING_OR_UNREADABLE') }
  assertOwnedFixture(target.kind === 'network' ? value : { Labels: value.Config?.Labels }, runId)
  if (target.kind === 'container' && value.State?.Running) throw new Error('RUNNING_FIXTURE_RECOVERY_REFUSED')
  verified.push(target)
}
const cleanup = []
for (const target of verified) {
  docker(target.kind === 'container' ? ['container', 'rm', '--volumes', target.name] : [target.kind, 'rm', target.name])
  cleanup.push({ kind: target.kind, result: 'removed-owned-stopped-fixture' })
}
await writeFile(path.join(output, 'interrupted-recovery.json'), JSON.stringify({ version: 'real-load-recovery/v1', runId,
  result: 'interrupted-not-passed', cleanup, contextRetained: true }, null, 2))
console.log('Interrupted R30: six verified owned resources removed; context retained, NOT a load pass')
