import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { AdminAuth, ADMIN_EMAIL, hashAdminPassword } from '../../src/admin/AdminAuth'
import { registerAdminApi } from '../../src/admin/adminApi'
import { OperationalAnalytics, operationalAnalyticsMiddleware } from '../../src/admin/operationalAnalytics'
import { createMockRoom } from '../helpers/mockData'
import { CatalogStore } from '../../src/catalog/CatalogStore'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'
import { randomUUID } from 'node:crypto'

const origin = 'https://admin.example.test'
const password = 'synthetic-http-admin-password'
let hash: string
beforeAll(async () => { hash = await hashAdminPassword(password) })

describe('actual loopback admin registrar, synthetic credentials only', () => {
  let server: Server
  let base: string
  const rooms = vi.fn(() => [createMockRoom(5, { id: 'synthetic-admin-room' })])
  const closeRoom = vi.fn()
  let catalog: CatalogStore | undefined
  async function start(enabled = true) {
    const app = express()
    const analytics = new OperationalAnalytics()
    app.use(operationalAnalyticsMiddleware(analytics))
    registerAdminApi(app, { auth: new AdminAuth(enabled ? hash : undefined, undefined, () => {}),
      origin: enabled ? origin : undefined, rooms, analytics, closeRoom, catalog: () => catalog })
    server = createServer(app)
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin/api`
  }
  beforeEach(() => { rooms.mockClear(); closeRoom.mockReset(); catalog = undefined })
  afterEach(async () => {
    catalog?.close()
    if (!server?.listening) return
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  })
  const login = () => fetch(`${base}/login`, { method: 'POST', headers: {
    origin, 'x-emcoin-admin': '1', 'content-type': 'application/json',
  }, body: JSON.stringify({ email: ADMIN_EMAIL, password }) })
  const overview = (cookie?: string) => fetch(`${base}/overview`, {
    headers: { 'x-emcoin-admin': '1', ...(cookie ? { cookie } : {}) },
  })

  it('requires same-origin authenticated rotation, clears cookie and revokes the old session', async () => {
    await start()
    const signedIn = await login()
    const cookie = signedIn.headers.get('set-cookie')!.split(';')[0]
    const headers = { 'x-emcoin-admin': '1', origin, cookie, 'content-type': 'application/json' }
    const body = JSON.stringify({ currentPassword: password, newPassword: 'synthetic-replacement-password' })
    expect((await fetch(`${base}/change-password`, { method: 'POST', headers: { ...headers, origin: 'https://outsider.test' }, body })).status).toBe(403)
    expect((await fetch(`${base}/change-password`, { method: 'POST', headers, body: JSON.stringify({ currentPassword: password, newPassword: 'short' }) })).status).toBe(400)
    const response = await fetch(`${base}/change-password`, { method: 'POST', headers, body })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('set-cookie')).toContain('__Host-emcoin-admin=;')
    expect(await response.json()).toEqual({ success: true })
    expect((await overview(cookie)).status).toBe(401)
    expect((await login()).status).toBe(401)
  })

  it('guards actual SQLite catalog access and commits an idempotent draft edit through authenticated HTTP', async () => {
    catalog = new CatalogStore(':memory:'); catalog.seed(pdfCatalogDraft())
    await start()
    expect((await fetch(`${base}/catalog`, { headers: { 'x-emcoin-admin': '1' } })).status).toBe(401)
    const signedIn = await login()
    const cookie = signedIn.headers.get('set-cookie')!.split(';')[0]
    const headers = { 'x-emcoin-admin': '1', origin, cookie, 'content-type': 'application/json' }
    const draftResponse = await fetch(`${base}/catalog`, { headers })
    expect(draftResponse.headers.get('cache-control')).toBe('no-store')
    const draft = await draftResponse.json() as ReturnType<CatalogStore['draft']>
    expect(draft.cards).toHaveLength(100)
    const body = JSON.stringify({ card: { ...draft.cards[0], definition: 'Synthetic checked definition' }, expectedRevision: draft.revision, requestId: randomUUID() })
    const save = () => fetch(`${base}/catalog/save`, { method: 'POST', headers, body })
    expect(await (await save()).json()).toMatchObject({ success: true, revision: 2, replayed: false })
    expect(await (await save()).json()).toMatchObject({ success: true, revision: 2, replayed: true })
    expect(catalog.draft().cards[0].definition).toBe('Synthetic checked definition')
    expect((await fetch(`${base}/catalog/save`, { method: 'POST', headers: { ...headers, origin: 'https://outsider.example.test' }, body })).status).toBe(403)
    expect((await fetch(`${base}/catalog/save`, { method: 'POST', headers, body: JSON.stringify({ card: draft.cards[0], expectedRevision: 1, requestId: randomUUID() }) })).status).toBe(409)
    expect((await fetch(`${base}/catalog/save`, { method: 'POST', headers, body: JSON.stringify({ card: { ...draft.cards[0], frontImageUrl: 'https://evil.invalid/x' }, expectedRevision: 2, requestId: randomUUID() }) })).status).toBe(400)
  })

  it('keeps the admin disabled by default and never reads rooms without configuration', async () => {
    await start(false)
    const response = await overview()
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(rooms).not.toHaveBeenCalled()
  })
  it('rejects malformed configured origin with a fixed error and no private URL input', () => {
    try {
      registerAdminApi(express(), { auth: new AdminAuth(), origin: 'synthetic-private-url-input',
        rooms, analytics: new OperationalAnalytics(), closeRoom })
      throw new Error('expected fixed configuration rejection')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('INVALID_ADMIN_ORIGIN_CONFIG')
      expect(JSON.stringify(error)).not.toContain('synthetic-private-url-input')
      expect((error as Error).stack).not.toContain('synthetic-private-url-input')
    }
  })
  it('denies an outsider and a forged cookie before touching room metadata', async () => {
    await start()
    expect((await overview()).status).toBe(401)
    expect((await overview(`__Host-emcoin-admin=${'a'.repeat(64)}`)).status).toBe(401)
    expect(rooms).not.toHaveBeenCalled()
  })
  it('blocks missing custom header and missing/foreign Origin before password verification', async () => {
    await start()
    for (const headers of [{ origin }, { 'x-emcoin-admin': '1' },
      { origin: 'https://outsider.example.test', 'x-emcoin-admin': '1' }]) {
      const response = await fetch(`${base}/login`, { method: 'POST', headers })
      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: 'REQUEST_NOT_ALLOWED' })
    }
    expect(rooms).not.toHaveBeenCalled()
  })
  it('uses a secure host-only cookie, keeps tokens out of JSON and allowlists admin metadata', async () => {
    await start()
    const response = await login()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    const header = response.headers.get('set-cookie')!
    expect(header).toMatch(/^__Host-emcoin-admin=[a-f0-9]{64};/)
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) expect(header).toContain(attribute)
    expect(header).not.toContain('Domain=')
    const result = await overview(header.split(';')[0])
    expect(result.status).toBe(200)
    const body = await result.json()
    expect(body.rooms).toEqual([{ id: 'synthetic-admin-room', status: 'waiting', seats: 5, revision: 0 }])
    expect(body.analytics.http.completed).toBe(1)
    expect(body.analytics.persistent).toBe(false)
    const encoded = JSON.stringify(body)
    for (const denied of ['players', 'responses', 'role', 'token', password, ADMIN_EMAIL]) expect(encoded).not.toContain(denied)
  })
  it('revokes old cookies on relogin/logout and rejects duplicated session cookies', async () => {
    await start()
    const first = (await login()).headers.get('set-cookie')!.split(';')[0]
    const second = (await login()).headers.get('set-cookie')!.split(';')[0]
    expect((await overview(first)).status).toBe(401)
    expect((await overview(`${second}; ${second}`)).status).toBe(401)
    const result = await fetch(`${base}/logout`, { method: 'POST', headers: { origin, 'x-emcoin-admin': '1', cookie: second } })
    expect(result.status).toBe(200)
    expect(result.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970')
    expect((await overview(second)).status).toBe(401)
  })
  it('rejects malformed/oversized login JSON without returning password or parser details', async () => {
    await start()
    for (const body of [`{"password":"${password}"`, JSON.stringify({ password: 'x'.repeat(5000) })]) {
      const response = await fetch(`${base}/login`, { method: 'POST', headers: {
        origin, 'x-emcoin-admin': '1', 'content-type': 'application/json',
      }, body })
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'INVALID_ADMIN_REQUEST' })
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
    expect(rooms).not.toHaveBeenCalled()
  })
  it('guards close-room before callback admission and allowlists only the explicit revision/reason/request command', async () => {
    await start()
    const command = { roomId: 'synthetic-admin-room', expectedRevision: 4,
      requestId: 'd3b502d9-3dd9-43ca-86d5-f44f4cbb21d1', reason: 'operator-request' }
    const send = (body: unknown, cookie?: string, suppliedOrigin = origin) => fetch(`${base}/close-room`, {
      method: 'POST', headers: { origin: suppliedOrigin, 'x-emcoin-admin': '1', 'content-type': 'application/json',
        ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body),
    })
    expect((await send(command)).status).toBe(401)
    expect(closeRoom).not.toHaveBeenCalled()
    const cookie = (await login()).headers.get('set-cookie')!.split(';')[0]
    expect((await send(command, cookie, 'https://outsider.example.test')).status).toBe(403)
    expect((await send({ ...command, story: 'do-not-admit' }, cookie)).status).toBe(400)
    expect(closeRoom).not.toHaveBeenCalled()
    closeRoom.mockResolvedValueOnce({ success: true, replayed: false })
    const result = await send(command, cookie)
    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ success: true, replayed: false })
    expect(result.headers.get('cache-control')).toBe('no-store')
    expect(closeRoom.mock.calls[0][0]).toEqual(command)
    const authorized = closeRoom.mock.calls[0][1] as () => boolean
    expect(authorized()).toBe(true)
    await fetch(`${base}/logout`, { method: 'POST', headers: { origin, 'x-emcoin-admin': '1', cookie } })
    expect(authorized()).toBe(false)
  })
  it('returns conflict/not-found/auth errors but scrubs unexpected storage details', async () => {
    await start()
    const cookie = (await login()).headers.get('set-cookie')!.split(';')[0]
    for (const [error, expected] of [['ROOM_CLOSE_CONFLICT', 409], ['ROOM_NOT_FOUND', 404],
      ['ADMIN_AUTH_REQUIRED', 401], ['synthetic private storage path', 503]] as const) {
      closeRoom.mockRejectedValueOnce(new Error(error))
      const response = await fetch(`${base}/close-room`, { method: 'POST', headers: {
        origin, 'x-emcoin-admin': '1', cookie, 'content-type': 'application/json',
      }, body: JSON.stringify({ roomId: 'synthetic-admin-room', expectedRevision: 4,
        requestId: 'd3b502d9-3dd9-43ca-86d5-f44f4cbb21d1', reason: 'safety' }) })
      expect(response.status).toBe(expected)
      expect(await response.json()).toEqual({ error: expected === 503 ? 'ADMIN_UNAVAILABLE' : error })
    }
  })
  it('authenticates immutable catalog preparation, blocks unreviewed data and replays exact requests', async () => {
    catalog = new CatalogStore(':memory:'); catalog.seed(pdfCatalogDraft())
    await start()
    const command = { expectedRevision: 1, requestId: randomUUID() }
    const send = (body: unknown, cookie?: string, suppliedOrigin = origin) => fetch(`${base}/catalog/snapshot`, {
      method: 'POST', headers: { origin: suppliedOrigin, 'x-emcoin-admin': '1', 'content-type': 'application/json',
        ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body),
    })
    expect((await send(command)).status).toBe(401)
    const cookie = (await login()).headers.get('set-cookie')!.split(';')[0]
    expect((await send(command, cookie, 'https://outsider.example.test')).status).toBe(403)
    expect((await send({ ...command, active: true }, cookie)).status).toBe(400)
    const blocked = await send(command, cookie)
    expect(blocked.status).toBe(409)
    expect(await blocked.json()).toEqual({ error: 'CATALOG_REVIEW_REQUIRED' })
    const readiness = await fetch(`${base}/catalog/readiness`, { headers: { 'x-emcoin-admin': '1', cookie } })
    expect(readiness.headers.get('cache-control')).toBe('no-store')
    expect(await readiness.json()).toMatchObject({ ready: false, revision: 1, snapshots: [] })
    for (const card of catalog.draft().cards) catalog.save({ ...card, reviewed: true, definition: 'Synthetic checked content', prompt: 'Synthetic checked question' }, catalog.draft().revision, randomUUID())
    const checked = { expectedRevision: catalog.draft().revision, requestId: randomUUID() }
    const prepared = await send(checked, cookie)
    expect(prepared.status).toBe(200)
    const result = await prepared.json()
    expect(result).toMatchObject({ active: false, replayed: false, revision: checked.expectedRevision + 1 })
    expect(await (await send(checked, cookie)).json()).toMatchObject({ version: result.version, active: false, replayed: true })
    expect((await send({ ...checked, expectedRevision: checked.expectedRevision + 1 }, cookie)).status).toBe(409)
    const activate = (body: unknown, cookie?: string, suppliedOrigin = origin) => fetch(`${base}/catalog/activate`, {
      method: 'POST', headers: { origin: suppliedOrigin, 'x-emcoin-admin': '1', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body),
    })
    const release = { version: result.version, expectedRevision: result.revision, requestId: randomUUID() }
    expect((await activate(release)).status).toBe(401)
    expect((await activate(release, cookie, 'https://outsider.example.test')).status).toBe(403)
    expect((await activate({ ...release, roomId: 'do-not-change-this-room' }, cookie)).status).toBe(400)
    expect(storeVersion()).toBeNull()
    const applied = await activate(release, cookie)
    expect(applied.status).toBe(200)
    expect(await applied.json()).toMatchObject({ version: result.version, active: true, scope: 'new-rooms-only', replayed: false })
    expect(await (await activate(release, cookie)).json()).toMatchObject({ replayed: true })
    expect(catalog.activeVersion()).toBe(result.version)
    expect(rooms).not.toHaveBeenCalled()
    function storeVersion() { return catalog!.activeVersion() }
  })
})
