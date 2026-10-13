import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import express from 'express'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { AdminAuth, ADMIN_EMAIL, hashAdminPassword } from '../../src/admin/AdminAuth'
import { registerAdminApi } from '../../src/admin/adminApi'
import { OperationalAnalytics } from '../../src/admin/operationalAnalytics'
import { TrafficStore } from '../../src/analytics/TrafficStore'
import { registerTrackApi } from '../../src/analytics/trackApi'

const origin = 'https://admin.example.test'
const password = 'synthetic-http-admin-password'
const browser = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'
let hash: string
beforeAll(async () => { hash = await hashAdminPassword(password) })

describe('actual loopback tracking and admin traffic report, synthetic visits only', () => {
  let server: Server, base: string, traffic: TrafficStore | undefined
  async function start() {
    const app = express()
    registerTrackApi(app, () => traffic)
    registerAdminApi(app, { auth: new AdminAuth(hash, undefined, () => {}), origin, rooms: () => [], analytics: new OperationalAnalytics(),
      traffic: () => traffic, system: () => ({ version: 'system/v1', traffic: traffic ? { available: true, ...traffic.stats() } : { available: false } }) })
    server = createServer(app)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  }
  afterEach(async () => {
    traffic?.close(); traffic = undefined
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  })
  const track = (body: unknown, userAgent = browser) => fetch(`${base}/api/track`, { method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': userAgent }, body: typeof body === 'string' ? body : JSON.stringify(body) })
  async function cookie() {
    const response = await fetch(`${base}/admin/api/login`, { method: 'POST', headers: { origin, 'x-emcoin-admin': '1', 'content-type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password }) })
    return response.headers.get('set-cookie')!.split(';')[0]
  }

  it('always answers 204 without a cookie, and counts only valid public page views', async () => {
    traffic = new TrafficStore(':memory:')
    await start()
    const counted = await track({ p: '/about', r: 'https://www.facebook.com/x', first: true })
    expect(counted.status).toBe(204)
    expect(counted.headers.get('set-cookie')).toBeNull()
    for (const body of [{ p: '/admin' }, { p: '/room/KX7Q2M' }, [], '{broken', { p: `/${'a'.repeat(2000)}` }]) expect((await track(body)).status).toBe(204)
    expect((await track({ p: '/' }, 'curl/8.0')).status).toBe(204)
    const report = traffic.report(7)
    expect(report.totals).toMatchObject({ visitors: 1, views: 1 })
    expect(report.sources).toEqual([{ label: 'Facebook', count: 1 }])
  })

  it('stays silent when statistics are unavailable', async () => {
    await start()
    expect((await track({ p: '/' })).status).toBe(204)
  })

  it('serves the report and storage facts to an authenticated admin only', async () => {
    traffic = new TrafficStore(':memory:')
    await start()
    await track({ p: '/', first: true })
    expect((await fetch(`${base}/admin/api/traffic?days=7`, { headers: { 'x-emcoin-admin': '1' } })).status).toBe(401)
    const headers = { 'x-emcoin-admin': '1', cookie: await cookie() }
    expect((await fetch(`${base}/admin/api/traffic?days=8`, { headers })).status).toBe(400)
    const response = await fetch(`${base}/admin/api/traffic?days=7`, { headers })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const report = await response.json()
    expect(report).toMatchObject({ version: 'traffic/v1', days: 7, hasData: true, totals: { visitors: 1, views: 1 } })
    expect(report.daily).toHaveLength(7)
    expect(await (await fetch(`${base}/admin/api/system`, { headers })).json()).toMatchObject({ version: 'system/v1', traffic: { available: true, rows: 4 } })
  })
})
