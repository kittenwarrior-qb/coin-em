import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import express from 'express'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'
import { registerAdminApi } from '../../src/admin/adminApi'
import { AdminAuth, ADMIN_EMAIL, hashAdminPassword } from '../../src/admin/AdminAuth'
import { OperationalAnalytics } from '../../src/admin/operationalAnalytics'
import { ChatReportStore } from '../../src/communication/ChatReportStore'

const origin = 'https://admin.example.test', password = 'synthetic-admin-report-password'
let passwordHash: string
beforeAll(async () => { passwordHash = await hashAdminPassword(password) })
describe('actual admin report HTTP authentication and selected evidence only', () => {
  let server: Server | undefined, store: ChatReportStore | undefined, base: string
  const incident = randomUUID()
  afterEach(async () => {
    vi.restoreAllMocks(); store?.close(); store = undefined
    server?.closeAllConnections(); if (server) await new Promise<void>(resolve => server!.close(() => resolve()))
    server = undefined
  })
  async function start(available = true) {
    if (available) {
      store = new ChatReportStore(':memory:')
      store.submit({ requestId: incident, roomId: 'synthetic-room', reporterId: 'synthetic-reporter', reason: 'unsafe',
        message: { id: randomUUID(), senderId: 'synthetic-sender', senderName: 'Synthetic sender', text: 'Selected synthetic evidence', sentAt: Date.now() } })
    }
    const app = express()
    registerAdminApi(app, { auth: new AdminAuth(passwordHash), origin, rooms: () => [], analytics: new OperationalAnalytics(), chatReports: () => store })
    server = createServer(app); await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  }
  async function login() {
    const response = await fetch(base + '/admin/api/login', { method: 'POST', headers: { origin, 'x-emcoin-admin': '1', 'content-type': 'application/json' }, body: JSON.stringify({ email: ADMIN_EMAIL, password }) })
    expect(response.status).toBe(200)
    return response.headers.get('set-cookie')!.split(';')[0]
  }
  const resolve = (cookie: string, body: unknown, requestOrigin = origin) => fetch(base + '/admin/api/reports/resolve', {
    method: 'POST', headers: { origin: requestOrigin, cookie, 'x-emcoin-admin': '1', 'content-type': 'application/json' }, body: JSON.stringify(body) })
  it('requires admin authentication/header; native and foreign origins cannot read or resolve reports', async () => {
    await start()
    const anonymous = await fetch(base + '/admin/api/reports', { headers: { 'x-emcoin-admin': '1' } })
    expect(anonymous.status).toBe(401); expect(await anonymous.text()).not.toContain('Selected synthetic evidence')
    const cookie = await login()
    expect((await fetch(base + '/admin/api/reports', { headers: { cookie } })).status).toBe(403)
    for (const deniedOrigin of ['https://localhost', 'capacitor://localhost', 'https://foreign.example.test']) {
      expect((await fetch(base + '/admin/api/reports', { headers: { cookie, origin: deniedOrigin, 'x-emcoin-admin': '1' } })).status).toBe(403)
      expect((await resolve(cookie, { id: incident, status: 'resolved', requestId: randomUUID() }, deniedOrigin)).status).toBe(403)
    }
    expect(store!.list('open').total).toBe(1)
  })
  it('serves only selected evidence with no-store and resolves with exact same-ID retry', async () => {
    await start(); const cookie = await login(), headers = { cookie, origin, 'x-emcoin-admin': '1' }
    const response = await fetch(base + '/admin/api/reports?status=open', { headers }), report = await response.json()
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store')
    expect(report).toMatchObject({ version: 'chat-reports/v1', total: 1 })
    expect(report.reports[0].message.text).toBe('Selected synthetic evidence')
    for (const privateKey of ['fingerprint', 'tokenHash', 'invitationHash', 'gameLog', 'resolution_id']) expect(JSON.stringify(report)).not.toContain(privateKey)
    const body = { id: incident, status: 'resolved', requestId: randomUUID() }
    expect(await (await resolve(cookie, body)).json()).toEqual({ success: true, replayed: false })
    expect(await (await resolve(cookie, body)).json()).toEqual({ success: true, replayed: true })
    expect((await resolve(cookie, { ...body, status: 'dismissed' })).status).toBe(409)
    expect((await (await fetch(base + '/admin/api/reports?status=open', { headers })).json()).total).toBe(0)
  })
  it('rejects malformed filters/commands and unknown incidents without changing selected evidence', async () => {
    await start(); const cookie = await login(), headers = { cookie, origin, 'x-emcoin-admin': '1' }
    expect((await fetch(base + '/admin/api/reports?status=unknown', { headers })).status).toBe(400)
    expect((await fetch(base + '/admin/api/reports?status=open&status=all', { headers })).status).toBe(400)
    expect((await resolve(cookie, { id: incident, status: 'resolved', requestId: randomUUID(), actor: 'forged' })).status).toBe(400)
    expect((await resolve(cookie, { id: incident, status: 'open', requestId: randomUUID() })).status).toBe(400)
    expect((await resolve(cookie, { id: randomUUID(), status: 'resolved', requestId: randomUUID() })).status).toBe(404)
    expect(store!.list('open').total).toBe(1)
  })
  it('fails unavailable and private SQLite errors closed without leaking storage details', async () => {
    await start(false); const cookie = await login(), headers = { cookie, origin, 'x-emcoin-admin': '1' }
    expect((await fetch(base + '/admin/api/reports', { headers })).status).toBe(503)
    expect((await resolve(cookie, { id: incident, status: 'resolved', requestId: randomUUID() })).status).toBe(503)
    store = new ChatReportStore(':memory:')
    vi.spyOn(store, 'list').mockImplementationOnce(() => { throw Error('synthetic-private-path-and-secret') })
    const failed = await fetch(base + '/admin/api/reports', { headers })
    expect(failed.status).toBe(503); expect(await failed.json()).toEqual({ error: 'REPORT_UNAVAILABLE' })
  })
  it('serves authenticated paged search through a strict no-store POST body', async () => {
    await start(); const cookie = await login(), headers = { cookie, origin, 'x-emcoin-admin': '1', 'content-type': 'application/json' }
    for (let n = 0; n < 51; n++) store!.submit({ requestId: randomUUID(), roomId: 'old-room', reporterId: `reporter-${n}`, reason: 'unsafe',
      message: { id: randomUUID(), senderId: 'sender', senderName: 'NGƯỜI THỬ', text: 'Selected paged evidence', sentAt: Date.now() } })
    const read = (body: object, authHeaders = headers) => fetch(base + '/admin/api/reports/search', { method: 'POST', headers: authHeaders, body: JSON.stringify(body) })
    const response = await read({ status: 'all', offset: 50, query: 'người thử' })
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ total: 51, offset: 50, pageSize: 50, reports: [expect.objectContaining({ roomId: 'old-room' })] })
    for (const body of [{ status: 'all', offset: 1, query: '' }, { status: 'all', offset: 0, query: 'x'.repeat(101) },
      { status: 'all', offset: 0, query: '\u0000' }, { status: 'all', offset: 0, query: '', actor: 'forged' }, { status: 'all', offset: '50', query: '' }]) {
      const rejected = await read(body); expect(rejected.status).toBe(400); expect(await rejected.json()).toEqual({ error: 'INVALID_REPORT_QUERY' })
    }
    expect((await read({ status: 'all', offset: 0, query: '' }, { ...headers, cookie: '' })).status).toBe(401)
    expect((await read({ status: 'all', offset: 0, query: '' }, { ...headers, origin: 'capacitor://localhost' })).status).toBe(403)
    expect(store!.list('all').total).toBe(52)
  })
})
