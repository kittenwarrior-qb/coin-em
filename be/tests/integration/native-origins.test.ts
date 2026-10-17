import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { io as connect, type Socket } from 'socket.io-client'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { gameplayOrigins, NATIVE_GAMEPLAY_ORIGINS } from '../../src/transport/origins'
import { roomRepository } from '../../src/modules/room'
import { AdminAuth, ADMIN_EMAIL, hashAdminPassword } from '../../src/admin/AdminAuth'
import { registerAdminApi } from '../../src/admin/adminApi'
import { OperationalAnalytics } from '../../src/admin/operationalAnalytics'

const webOrigin = 'https://web.example.test', password = 'synthetic-native-admin-password'
let passwordHash: string
beforeAll(async () => { passwordHash = await hashAdminPassword(password) })

describe('loopback native origins with real production seat and admin guards', () => {
  let server: Awaited<ReturnType<typeof createIsolatedServer>> | undefined
  const clients: Socket[] = []
  afterEach(async () => { clients.forEach(socket => socket.disconnect()); clients.length = 0; await server?.close(); server = undefined; roomRepository.clear() })
  async function start(enabled = 'true') {
    server = await createIsolatedServer({ origins: gameplayOrigins(webOrigin, enabled) })
    server.app.get('/owned-origin-check', (_request, response) => response.json({ fixture: true }))
    registerAdminApi(server.app, { auth: new AdminAuth(passwordHash), origin: webOrigin, rooms: () => [], analytics: new OperationalAnalytics() })
  }
  async function client(origin: string | undefined, transport: 'websocket' | 'polling') {
    const socket = connect(server!.url, { transports: [transport], reconnection: false, timeout: 2000,
      ...(origin === undefined ? {} : { extraHeaders: { origin } }) })
    clients.push(socket)
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject) })
    return socket
  }
  const action = (socket: Socket, event: string, payload: object) => new Promise<any>((resolve, reject) =>
    socket.timeout(2000).emit(event, payload, (error: Error | null, ack: unknown) => error ? reject(error) : resolve(ack)))

  it.each(NATIVE_GAMEPLAY_ORIGINS.flatMap(origin => (['websocket', 'polling'] as const).map(transport => ({ origin, transport }))))
   ('admits $origin over $transport but still requires an authenticated room seat', async ({ origin, transport }) => {
      await start()
      const socket = await client(origin, transport)
      expect(await action(socket, 'get_room_state', { roomId: 'native-owned-room' })).toMatchObject({ success: false, error: 'NOT_ROOM_MEMBER' })
      const joinedView = new Promise<any>(resolve => socket.once('room_state', resolve))
      const joined = await action(socket, 'join_room', { roomId: 'native-owned-room', userId: 'native-member', name: 'Synthetic native member', createIfMissing: true })
      expect(joined.success).toBe(true)
      expect(joined.session.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
      await joinedView
      // The existing read contract is room_state, not a fabricated success ACK.
      const hydrated = new Promise<any>(resolve => socket.once('room_state', resolve))
      socket.emit('get_room_state', { roomId: 'native-owned-room' })
      const view = await hydrated
      expect(view.id).toBe('native-owned-room')
      expect(JSON.stringify(view)).not.toContain(joined.session.token)
      expect(JSON.stringify(view)).not.toContain('tokenHash')
      expect(await action(socket, 'get_room_state', { roomId: 'other-room' })).toMatchObject({ success: false, error: 'NOT_ROOM_MEMBER' })
    })
  it.each(['websocket', 'polling'] as const)('rejects native origins with the flag off over %s', async transport => {
    await start('false')
    await expect(client('https://localhost', transport)).rejects.toThrow()
  })
  it.each(['null', 'https://localhost.evil.test', 'http://localhost', 'capacitor://evil'])('rejects unapproved WebSocket origin %s', async origin => {
    await start(); await expect(client(origin, 'websocket')).rejects.toThrow()
  })
  it('keeps originless non-browser tooling compatible without granting seat rights', async () => {
    await start()
    expect(await action(await client(undefined, 'websocket'), 'get_room_state', { roomId: 'unknown' }))
      .toMatchObject({ success: false, error: 'NOT_ROOM_MEMBER' })
  })
  it('permits native gameplay HTTP reads but never expands admin login or cookie access', async () => {
    await start()
    for (const origin of NATIVE_GAMEPLAY_ORIGINS) {
      const response = await fetch(server!.url + '/owned-origin-check', { headers: { origin } })
      expect(response.headers.get('access-control-allow-origin')).toBe(origin)
      const login = await fetch(server!.url + '/admin/api/login', { method: 'POST', headers: { origin, 'x-emcoin-admin': '1', 'content-type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password }) })
      expect(login.status).toBe(403); expect(login.headers.get('set-cookie')).toBeNull()
    }
    const login = await fetch(server!.url + '/admin/api/login', { method: 'POST', headers: { origin: webOrigin, 'x-emcoin-admin': '1', 'content-type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password }) })
    expect(login.status).toBe(200)
    const cookie = login.headers.get('set-cookie')!.split(';')[0]
    for (const origin of NATIVE_GAMEPLAY_ORIGINS) expect((await fetch(server!.url + '/admin/api/overview', { headers: { origin, cookie, 'x-emcoin-admin': '1' } })).status).toBe(403)
    expect((await fetch(server!.url + '/owned-origin-check', { headers: { origin: 'https://evil.example.test' } })).headers.get('access-control-allow-origin')).toBeNull()
  })
})
