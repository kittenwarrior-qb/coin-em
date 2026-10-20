// Operator-invoked initial release only. No credentials in artifacts or argv.
import { execFileSync, spawn } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const [mode, sha] = process.argv.slice(2)
if (!['prepare', 'deploy', 'update-web', 'prepare-ui', 'update-ui'].includes(mode) || !/^[a-f0-9]{40}$/.test(sha ?? '')) throw Error('Usage: node deploy/emcoin/manual-release.mjs prepare|deploy|update-web|prepare-ui|update-ui <verified 40-character commit>')
const run = (bin, args, cwd = root) => execFileSync(bin, args, { cwd, stdio: 'inherit', windowsHide: true })
const capture = (bin, args) => execFileSync(bin, args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
const release = path.join(root, 'tmp', 'manual-releases', sha)
const uiOnly = mode === 'prepare-ui' || mode === 'update-ui'
const images = uiOnly ? [`emcoin/web:${sha}`] : [`emcoin/backend:${sha}`, `emcoin/web:${sha}`]
async function compressed(bin, args, destination) {
  const child = spawn(bin, args, { cwd: root, stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true })
  const done = new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(Error(`${bin} failed (${code})`))) })
  await Promise.all([pipeline(child.stdout, createGzip(), createWriteStream(destination, { flags: 'wx' })), done])
}
if (mode === 'prepare' || mode === 'prepare-ui') {
  if (capture('git', ['rev-parse', 'HEAD']) !== sha || capture('git', ['diff', '--name-only', 'HEAD', ...(uiOnly ? ['--', 'fe', 'deploy/emcoin'] : [])])) throw Error('Require exact committed HEAD with no release-source tracked edits')
  run('git', ['cat-file', '-e', `${sha}^{commit}`])
  const owned = await mkdtemp(path.join(os.tmpdir(), 'emcoin-release-source-'))
  const archive = path.join(owned, 'source.tar')
  run('git', ['archive', '--format=tar', `--output=${archive}`, sha])
  const source = path.join(owned, 'source'); await mkdir(source)
  run('tar', ['-xf', archive, '-C', source])
  for (const [index, context, dockerfile] of [[0, 'be', 'be/Dockerfile.prod'], [1, 'fe', 'deploy/emcoin/web.Dockerfile']]) {
    if (uiOnly && index === 0) continue
    const args = ['build', '--label', `org.opencontainers.image.revision=${sha}`, '-f', path.join(source, dockerfile), '-t', `emcoin/${index === 0 ? 'backend' : 'web'}:${sha}`]
    if (index === 1) args.push('--build-arg', 'VITE_API_URL=https://app.emcoin.cloud')
    args.push(path.join(source, context)); run('docker', args)
  }
  await mkdir(release, { recursive: true })
  await compressed('docker', ['save', ...images], path.join(release, 'release-images.tar.gz'))
  await compressed('git', ['archive', '--format=tar', sha, 'deploy/emcoin'], path.join(release, 'release-config.tar.gz'))
  const lines = []
  for (const file of ['release-images.tar.gz', 'release-config.tar.gz']) {
    const hash = createHash('sha256'); for await (const chunk of createReadStream(path.join(release, file))) hash.update(chunk)
    lines.push(`${hash.digest('hex')}  ${file}`)
  }
  await writeFile(path.join(release, 'SHA256SUMS'), lines.join('\n') + '\n', { flag: 'wx' })
  console.log(`Prepared exact release ${sha}; owned source retained at ${owned}`)
} else {
  // Explicit host/key pin; no password fallback and no arbitrary host input.
  const ssh = 'C:/Program Files/Git/usr/bin/ssh.exe', scp = 'C:/Program Files/Git/usr/bin/scp.exe'
  const options = ['-i', path.join(os.homedir(), '.ssh', 'emcoin_deploy_180_93_54_160'), '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes']
  const target = 'root@103.74.102.24', incoming = `/opt/emcoin/incoming/${sha}`
  run(ssh, [...options, target, `test -f /opt/emcoin/shared/.deploy-ready && install -d -m 700 ${incoming}`])
  run(scp, [...options, ...['release-images.tar.gz', 'release-config.tar.gz', 'SHA256SUMS'].map(file => path.join(release, file)), `${target}:${incoming}/`])
  // Run a verified file, not bash -s: a child with open stdin can consume the
  // remainder of a piped deployment script (notably compose run).
  const driver = mode === 'update-web' || mode === 'update-ui' ? 'deploy-web-update.sh' : 'deploy-release.sh'
  run(ssh, [...options, target, `cd ${incoming} && sha256sum -c SHA256SUMS && tar -xzf release-config.tar.gz deploy/emcoin/${driver} && bash deploy/emcoin/${driver} ${sha}${uiOnly ? ' ui-only' : ''}`])
}
