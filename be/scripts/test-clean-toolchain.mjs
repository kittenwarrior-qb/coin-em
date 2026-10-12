import { cp, lstat, mkdtemp, readFile, realpath, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanSourceEntryAllowed } from './clean-source-policy.mjs'

// Opt-in, owned copies only. Never runs a user checkout's install/start/deploy.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const expectedNode = (await readFile(path.join(root, '.nvmrc'), 'utf8')).trim()
if (process.version !== `v${expectedNode}`) throw new Error(`Use the pinned Node${expectedNode} portable/runtime for this opt-in matrix`)
const npmCLI = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
await readFile(npmCLI) // Fail rather than silently use a different global Node/npm.
const npmVersion = JSON.parse(await readFile(path.join(path.dirname(process.execPath), 'node_modules/npm/package.json'), 'utf8')).version
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
let offlineSeed = null
if (process.argv.length > 2) {
  if (process.argv.length !== 4 || process.argv[2] !== '--offline-cache') throw new Error('Expected --offline-cache <owned-passed-clean-root>')
  const tempRoot = await realpath(os.tmpdir())
  offlineSeed = await realpath(process.argv[3])
  const relative = path.relative(tempRoot, offlineSeed)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) ||
      !path.basename(offlineSeed).startsWith('emcoin-clean-toolchain-')) throw new Error('Offline seed must be an owned clean directory under TEMP')
  const previous = JSON.parse(await readFile(path.join(offlineSeed, 'report.json'), 'utf8'))
  const labels = ['be:npm-ci', 'fe:npm-ci', 'e2e:npm-ci', 'be:lint', 'be:build', 'be:test', 'fe:lint', 'fe:build', 'fe:test']
  if (previous.version !== 'clean-toolchain/v1' || previous.result !== 'passed' || previous.platform !== process.platform ||
      previous.node !== process.version || previous.npm !== npmVersion || previous.commands.length !== labels.length ||
      previous.commands.some((command, index) => command.label !== labels[index] || command.exitCode !== 0)) throw new Error('Offline seed must have a passed exact-runtime/platform matrix')
  for (const name of ['be', 'fe', 'e2e']) {
    if (hash(await readFile(path.join(root, name, 'package-lock.json'))) !== previous.locks[name]) throw new Error('Offline seed lock mismatch')
  }
  const seedCache = await realpath(path.join(offlineSeed, 'npm-cache'))
  if (path.relative(offlineSeed, seedCache) !== 'npm-cache') throw new Error('Offline cache must remain inside the owned seed directory')
}
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-clean-toolchain-'))
const workspace = path.join(output, 'workspace')
const files = {
  be: ['package.json', 'package-lock.json', 'Dockerfile.dev', 'Dockerfile.prod', 'tsconfig.json', 'vitest.config.ts', 'vitest.browser.config.ts', 'src', 'tests', 'scripts'],
  fe: ['package.json', 'package-lock.json', 'Dockerfile.dev', 'Dockerfile.prod', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.js', 'index.html', 'src', 'public', 'pwa', 'scripts'],
  e2e: ['package.json', 'package-lock.json'],
}
const report = { version: 'clean-toolchain/v1', result: 'failed', platform: process.platform, node: process.version, npm: npmVersion, locks: {}, commands: [],
  installMode: offlineSeed ? 'offline-verified-owned-cache' : 'network-fresh-cache', cacheSeed: offlineSeed,
  limitations: 'Windows/local clean copied workspace only; no Linux/musl/browser/native/production/legacy-retirement proof. npm --offline is registry/cache mode, not a network sandbox for dependency lifecycle scripts.' }
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}`,
  npm_config_cache: path.join(output, 'npm-cache'), TEMP: output, TMP: output, TMPDIR: output }
async function run(label, args, cwd) {
  const started = Date.now()
  const entry = { label, exitCode: null, elapsedMs: 0 }
  report.commands.push(entry)
  console.log(`Running ${label}`)
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let tail = ''
    const collect = chunk => { tail = (tail + chunk.toString()).slice(-6000) }
    child.stdout.on('data', collect); child.stderr.on('data', collect)
    const timer = setTimeout(() => {
      entry.timedOut = true; entry.elapsedMs = Date.now() - started
      if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      else child.kill('SIGTERM')
      reject(new Error(`${label} exceeded owned5minute limit`))
    }, 300_000)
    child.once('error', error => { clearTimeout(timer); reject(error) })
    child.once('exit', code => {
      clearTimeout(timer); entry.exitCode = code; entry.elapsedMs = Date.now() - started
      // Reports contain command metadata, never captured environment/test payloads.
      console.log(`${label}: exit${code}, ${entry.elapsedMs}ms`)
      if (code === 0) resolve(); else { console.error(tail); reject(new Error(`${label} failed`)) }
    })
  })
}
try {
  if (offlineSeed) await cp(path.join(offlineSeed, 'npm-cache'), path.join(output, 'npm-cache'), { recursive: true,
    filter: async source => !['_logs', '_tmp'].includes(path.basename(source)) && !(await lstat(source)).isSymbolicLink() })
  for (const [name, entries] of Object.entries(files)) {
    const dest = path.join(workspace, name)
    await mkdir(dest, { recursive: true })
    for (const entry of entries) await cp(path.join(root, name, entry), path.join(dest, entry), {
      recursive: true, filter: cleanSourceEntryAllowed,
    })
    const lock = await readFile(path.join(root, name, 'package-lock.json'))
    report.locks[name] = hash(lock)
    await run(`${name}:npm-ci`, [npmCLI, 'ci', '--no-audit', '--no-fund', ...(offlineSeed ? ['--offline'] : [])], dest)
    if (hash(await readFile(path.join(dest, 'package-lock.json'))) !== report.locks[name]) throw new Error(`${name} copied lock changed`)
    if (hash(await readFile(path.join(root, name, 'package-lock.json'))) !== report.locks[name]) throw new Error(`${name} original lock changed during run`)
  }
  await mkdir(path.join(workspace, '.github/workflows'), { recursive: true })
  await cp(path.join(root, '.github/workflows/ci.yml'), path.join(workspace, '.github/workflows/ci.yml'))
  await cp(path.join(root, '.nvmrc'), path.join(workspace, '.nvmrc'))
  await cp(path.join(root, 'Makefile'), path.join(workspace, 'Makefile'))
  for (const name of ['be', 'fe']) {
    const cwd = path.join(workspace, name)
    for (const command of ['lint', 'build', 'test']) await run(`${name}:${command}`, [npmCLI, 'run', command], cwd)
  }
  report.result = 'passed'
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`Clean toolchain evidence: ${output}`)
}
