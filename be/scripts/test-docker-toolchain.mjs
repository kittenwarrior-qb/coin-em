import { cp, lstat, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanSourceEntryAllowed } from './clean-source-policy.mjs'

// Opt-in local QA only: never build the user's checkout, run a server or push.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pin = (await readFile(path.join(root, '.nvmrc'), 'utf8')).trim()
if (process.version !== `v${pin}`) throw new Error('Use the exact .nvmrc runtime')
const tempRoot = await realpath(os.tmpdir())
const cleanRoot = await realpath(process.argv[2] ?? '')
const relative = path.relative(tempRoot, cleanRoot)
if (!relative || relative.startsWith('..') || path.isAbsolute(relative) ||
    !path.basename(cleanRoot).startsWith('emcoin-clean-toolchain-')) throw new Error('Expected an owned clean QA directory under TEMP')
const clean = JSON.parse(await readFile(path.join(cleanRoot, 'report.json'), 'utf8'))
if (clean.version !== 'clean-toolchain/v1' || clean.result !== 'passed' || clean.node !== process.version ||
    clean.commands.length !== 9 || clean.commands.some(command => command.exitCode !== 0)) throw new Error('Clean matrix must pass first')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
for (const name of ['be', 'fe', 'e2e']) {
  for (const base of [root, path.join(cleanRoot, 'workspace')]) {
    if (hash(await readFile(path.join(base, name, 'package-lock.json'))) !== clean.locks[name]) throw new Error(`${name} lock mismatch`)
  }
}
const output = await mkdtemp(path.join(tempRoot, 'emcoin-docker-toolchain-'))
const runId = randomUUID()
const report = { version: 'docker-toolchain/v1', result: 'failed', runId, node: process.version,
  cleanEvidence: cleanRoot, locks: clean.locks, commands: [], images: [], cleanup: [],
  limitations: 'Linux production Docker build and runtime/static-output checks only; not full Linux tests, CI, server health, native/device, release, digest pin policy or production durability' }
const owned = []
const allowlist = {
  be: ['package.json', 'package-lock.json', 'Dockerfile.prod', 'tsconfig.json', 'src'],
  fe: ['package.json', 'package-lock.json', 'Dockerfile.prod', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts', 'eslint.config.js', 'index.html', 'src', 'public', 'pwa'],
}
async function run(label, args, timeoutMs = 420_000) {
  const entry = { label, exitCode: null, elapsedMs: 0 }
  report.commands.push(entry)
  console.log(`Running ${label}`)
  const started = Date.now()
  return await new Promise((resolve, reject) => {
    const child = spawn('docker', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let tail = ''; let settled = false; let lastProgress = ''
    const collect = chunk => { tail = (tail + chunk.toString()).slice(-12_000) }
    child.stdout.on('data', collect); child.stderr.on('data', collect)
    const progress = setInterval(() => {
      const latest = tail.trim().split('\n').at(-1) ?? ''
      if (label.endsWith(':docker-build') && latest && latest !== lastProgress) {
        lastProgress = latest
        console.log(`${label}: ${latest}`)
      }
    }, 30_000)
    const timer = setTimeout(() => {
      clearInterval(progress)
      entry.timedOut = true; entry.elapsedMs = Date.now() - started
      if (label.endsWith(':docker-build')) entry.failureTail = tail
      console.error(tail)
      if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      else child.kill('SIGTERM')
      settled = true; reject(new Error(`${label}: owned command timeout`))
    }, timeoutMs)
    child.once('error', error => { clearTimeout(timer); clearInterval(progress); if (!settled) reject(error) })
    child.once('exit', code => {
      clearTimeout(timer); clearInterval(progress); entry.exitCode = code; entry.elapsedMs = Date.now() - started
      console.log(`${label}: exit${code}, ${entry.elapsedMs}ms`)
      if (settled) return
      if (code === 0) resolve(tail.trim())
      else {
        if (label.endsWith(':docker-build')) entry.failureTail = tail
        console.error(tail); reject(new Error(`${label} failed`))
      }
    })
  })
}
try {
  if (await run('docker:linux-daemon', ['info', '--format', '{{.OSType}}'], 30_000) !== 'linux') throw new Error('Linux Docker required')
  for (const [name, entries] of Object.entries(allowlist)) {
    const context = path.join(output, name)
    await mkdir(context)
    for (const entry of entries) await cp(path.join(cleanRoot, 'workspace', name, entry), path.join(context, entry), {
      recursive: true,
      filter: async source => {
        return cleanSourceEntryAllowed(source) && !(await lstat(source)).isSymbolicLink()
      },
    })
    const tag = `emcoin-qa-${name}:${runId}`
    // Register before build so even a later inspect/check failure attempts safe cleanup.
    owned.push({ tag, id: null })
    const args = ['build', '--label', `emcoin.fixture=${runId}`, '--tag', tag, '--file', path.join(context, 'Dockerfile.prod')]
    if (name === 'fe') args.push('--build-arg', 'VITE_API_URL=http://127.0.0.1:3001', '--build-arg', 'VITE_DEBUG_ROLE_PICKER=false')
    args.push(context)
    await run(`${name}:docker-build`, args)
    const inspected = JSON.parse(await run(`${name}:image-inspect`, ['image', 'inspect', tag]))[0]
    if (inspected.Config?.Labels?.['emcoin.fixture'] !== runId || inspected.Os !== 'linux') throw new Error('QA image identity mismatch')
    owned.at(-1).id = inspected.Id
    const entry = { package: name, tag, id: inspected.Id, os: inspected.Os, architecture: inspected.Architecture,
      dockerfileSha256: hash(await readFile(path.join(context, 'Dockerfile.prod'))) }
    report.images.push(entry)
    if (name === 'be') {
      const version = await run('be:container-node-version', ['run', '--rm', '--label', `emcoin.fixture=${runId}`, '--entrypoint', 'node', inspected.Id, '--version'])
      if (version !== `v${pin}`) throw new Error('Container Node pin mismatch')
      entry.node = version
      await run('be:compiled-entry', ['run', '--rm', '--label', `emcoin.fixture=${runId}`, '--entrypoint', 'node', inspected.Id, '-e', "const fs=require('fs');for(const p of ['dist/index.js','dist/socket/handlers/roomHandlers.js'])if(!fs.statSync(p).isFile())process.exit(1)"])
    } else {
      await run('fe:public-output', ['run', '--rm', '--label', `emcoin.fixture=${runId}`, '--entrypoint', '/bin/sh', inspected.Id, '-c', 'test -s index.html && test -s sw.js && test -s manifest.webmanifest'])
    }
  }
  report.result = 'passed'
} catch (error) {
  report.error = error instanceof Error ? error.message : 'QA failure'
  process.exitCode = 1
} finally {
  for (const target of owned) {
    try {
      const inspected = JSON.parse(await run('cleanup:verify-owned-image', ['image', 'inspect', target.tag], 30_000))[0]
      if (inspected.Config?.Labels?.['emcoin.fixture'] !== runId || (target.id && inspected.Id !== target.id)) throw new Error('Refuse unrelated image cleanup')
      await run('cleanup:remove-owned-tag', ['image', 'rm', target.tag], 30_000)
      report.cleanup.push({ tag: target.tag, result: 'removed-owned-tag' })
    } catch (error) {
      report.cleanup.push({ tag: target.tag, result: 'not-removed', reason: error instanceof Error ? error.message : 'cleanup failure' })
    }
  }
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`Docker toolchain evidence: ${output}`)
  console.log('No shared images/cache/volumes pruned; owned contexts and report retained.')
}
