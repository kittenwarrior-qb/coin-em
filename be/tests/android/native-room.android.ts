import { test, expect, onTestFinished } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile, unlink, access } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { io as connect, type Socket } from 'socket.io-client'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { gameplayOrigins } from '../../src/transport/origins'
import { roomRepository } from '../../src/modules/room'
import { createHash } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import { CatalogStore } from '../../src/catalog/CatalogStore'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'
import { configureRuntimeCatalog } from '../../src/catalog/runtimeCatalog'
import express from 'express'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const sdk = 'D:/Android/EmCoinSdk', java = 'C:/Program Files/Android/Android Studio/jbr'
const adb = path.join(sdk, 'platform-tools/adb.exe'), serial = 'emulator-5580', app = 'cloud.emcoin.app.staging'
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
test('owned Android WebView uses native HTTPS origin and real guarded seats (manual UI checkpoints)', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-native-stage-'))
  const origins = new Set<string>(), companions: Socket[] = []
  let server: Awaited<ReturnType<typeof createIsolatedServer>> | undefined, installed = false, result = 'failed', stage = 'prepare'
  const catalog = new CatalogStore(':memory:')
  const nativeCommands = { join_room: 0, reconnect_room: 0, get_room_state: 0, set_round_limit: 0, start_game: 0 }
  const nativeAcks: { event: string; success: boolean; code?: string; fields: string[] }[] = []
  const android = (...args: string[]) => execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', windowsHide: true, timeout: 30000 })
  const report: Record<string, unknown> = { result, scope: 'owned API36 Android WebView + loopback TLS guarded handlers; mocked room primary, not Redis/device/store proof', productionModified: false }
  onTestFinished(async () => {
    companions.forEach(socket => socket.disconnect())
    let qaAppUninstalled = !installed
    if (installed) {
      try { android('shell', 'am', 'force-stop', app); qaAppUninstalled = android('uninstall', app).includes('Success') } catch { /* record unavailable cleanup, never touch the normal app */ }
    }
    let serverClosed = false
    try { await server?.close(); serverClosed = true } catch { /* preserve key cleanup even if teardown fails */ }
    configureRuntimeCatalog(); catalog.close()
    const keyFile = path.join(output, 'key.pem')
    await unlink(keyFile).catch(() => {})
    let privateKeyRemoved = false
    try { await access(keyFile) } catch (error) { privateKeyRemoved = (error as NodeJS.ErrnoException).code === 'ENOENT' }
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ ...report, result, stage, nativeCommands, nativeAcks, serverClosed, privateKeyRemoved, qaAppUninstalled }, null, 2))
    console.log(`Owned Android staging evidence: ${output}`)
  })
  expect(android('emu', 'avd', 'name')).toContain('EmCoin_API36')
  expect(android('shell', 'getprop', 'sys.boot_completed').trim()).toBe('1')
  expect(android('shell', 'pm', 'list', 'packages', app).trim()).toBe('') // never clear an existing app's data
  execFileSync('C:/Program Files/Git/usr/bin/openssl.exe', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-keyout', path.join(output, 'key.pem'), '-out', path.join(output, 'cert.pem'), '-subj', '/CN=EmCoin Local Android QA',
    '-addext', 'subjectAltName=IP:10.0.2.2,IP:127.0.0.1', '-addext', 'basicConstraints=critical,CA:TRUE',
    '-addext', 'keyUsage=critical,digitalSignature,keyCertSign,cRLSign'], { windowsHide: true, stdio: 'ignore' })
  const cert = await readFile(path.join(output, 'cert.pem'))
  catalog.seed(pdfCatalogDraft().map(card => ({ ...card, reviewed: true })))
  const version = catalog.snapshot(1, randomUUID()).version
  catalog.activate(version, 2, randomUUID()); configureRuntimeCatalog(catalog)
  server = await createIsolatedServer({ origins: gameplayOrigins('https://web.example.test', 'true'),
    catalog, tls: { key: await readFile(path.join(output, 'key.pem')), cert } })
  server.app.use('/emcoin/decks', express.static(path.join(project, 'fe/public/emcoin/decks')))
  server.io.on('connection', socket => {
    const origin = socket.handshake.headers.origin ?? 'none'; origins.add(origin)
    if (origin === 'https://localhost') socket.use((packet, next) => {
      const event = packet[0]
      if (!Object.prototype.hasOwnProperty.call(nativeCommands, event)) { next(); return }
      nativeCommands[event as keyof typeof nativeCommands]++
      const callbackIndex = packet.length - 1, callback = packet[callbackIndex]
      if (typeof callback === 'function') {
        const fields = Object.keys(packet[1] ?? {}).sort() // field names only, never identity/session/content values
        packet[callbackIndex] = (ack: { success?: boolean; error?: string; code?: string }) => {
          nativeAcks.push({ event, success: ack?.success === true, code: ack?.error ?? ack?.code, fields })
          callback(ack)
        }
      }
      next()
    })
  })
  const port = Number(new URL(server.url).port)
  stage = 'build'
  execFileSync(process.execPath, [path.join(project, 'native/scripts/build-staging.mjs'), output, String(port)], { windowsHide: true, stdio: 'inherit' })
  const env = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk, GRADLE_USER_HOME: 'D:/Android/EmCoinGradle' }
  const qaArgument = `'-PemcoinQaRoot=${output.replaceAll("'", "''")}'`
  execFileSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', `& ./gradlew.bat :app:assembleStaging ${qaArgument} --no-daemon --console=plain; exit $LASTEXITCODE`],
    { cwd: path.join(project, 'native/android'), env, windowsHide: true, stdio: 'inherit', timeout: 360000 })
  const apk = path.join(project, 'native/android/app/build/outputs/apk/staging/app-staging.apk')
  report.apkSha256 = createHash('sha256').update(await readFile(apk)).digest('hex')
  report.bundle = JSON.parse(await readFile(path.join(output, 'qa.json'), 'utf8')).sourceDigest
  stage = 'manual-native-ui'
  expect(android('install', '-r', apk)).toContain('Success'); installed = true
  expect(android('shell', 'am', 'start', '-W', '-n', `${app}/cloud.emcoin.app.MainActivity`)).toContain('Status: ok')
  await writeFile(path.join(output, 'ready.json'), JSON.stringify({ profile: 'emcoin-local-android/v1', applicationId: app, api: `https://10.0.2.2:${port}`, controls: ['companions', 'stop'] }))
  console.log(`ANDROID_QA_READY ${output}`)
  let done = false, lastCommand = ''
  const deadline = Date.now() + 540000
  while (!done && Date.now() < deadline) {
    const rooms = roomRepository.findAll()
    await writeFile(path.join(output, 'status.json'), JSON.stringify({ nativeOriginSeen: origins.has('https://localhost'), nativeCommands, nativeAcks,
      rooms: rooms.map(room => ({ seats: room.players.length, status: room.status, phase: room.phase, roundLimit: room.roundLimit })) }))
    let control: { requestId?: string; command?: string } = {}
    try { control = JSON.parse(await readFile(path.join(output, 'control.json'), 'utf8')) } catch { /* no manual checkpoint yet */ }
    if (control.requestId && control.requestId !== lastCommand) {
      lastCommand = control.requestId
      if (control.command === 'companions') {
        expect(rooms).toHaveLength(1); expect(companions).toHaveLength(0)
        for (let index = 1; index <= 4; index++) {
          const socket = connect(server.url, { transports: ['websocket'], reconnection: false, ca: cert, extraHeaders: { origin: 'https://web.example.test' } })
          companions.push(socket)
          await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject) })
          const ack = await socket.timeout(5000).emitWithAck('join_room', { roomId: rooms[0].id, userId: `native-qa-companion-${index}`, name: `QA companion ${index}` })
          expect(ack.success).toBe(true)
        }
      } else if (control.command === 'stop') done = true
      else throw Error('INVALID_ANDROID_QA_CONTROL')
    }
    await pause(750)
  }
  expect(done).toBe(true); expect(origins.has('https://localhost')).toBe(true)
  const rooms = roomRepository.findAll()
  expect(rooms).toHaveLength(1); expect(rooms[0].players).toHaveLength(5); expect(rooms[0].status).toBe('playing')
  expect(nativeCommands.start_game).toBeGreaterThanOrEqual(1)
  expect(rooms[0].roundLimit).toBe(1); expect(rooms[0].totalRounds).toBe(1)
  report.nativeOrigin = 'https://localhost'; report.seats = 5; report.phase = rooms[0].phase; report.nativeCommands = nativeCommands; report.catalog = 'synthetic PDF draft snapshot'; result = 'passed'
})
