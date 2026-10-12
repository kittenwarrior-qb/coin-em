// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createHash, webcrypto } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync('pwa/worker.js', 'utf8')
const digest = (body: string) => createHash('sha256').update(body).digest('hex')
function fixture(options: { fetch?: typeof fetch; votes?: Array<boolean | null> } = {}) {
  const handlers = new Map<string, (event: Record<string, unknown>) => void>()
  const stores = new Map<string, Map<string, Response>>()
  const put = vi.fn(async (store: Map<string, Response>, url: string, response: Response) => { store.set(url, response.clone()) })
  const cache = {
    open: vi.fn(async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)!
      return { put: (url: string, response: Response) => put(store, url, response), match: async (url: string) => store.get(url)?.clone() }
    }),
    keys: async () => [...stores.keys()], delete: vi.fn(async (name: string) => stores.delete(name)),
  }
  const skipWaiting = vi.fn(async () => {}), claim = vi.fn(async () => {})
  const clients = (options.votes ?? [true]).map((idle, index) => ({ id: `client-${index}`, url: 'https://fixture.test/app/', postMessage: vi.fn((data: { nonce: string }) => {
    if (idle !== null) handlers.get('message')!({ data: { type: 'EMCOIN_UPDATE_VOTE', nonce: data.nonce, idle }, source: { id: `client-${index}` } })
  }) }))
  const network = options.fetch ?? vi.fn(async () => new Response('guide'))
  runInNewContext(source, { CONFIG: { prefix: 'emcoin-guide-fixture-', version: 'v1', assets: [{ path: 'offline.html', hash: digest('guide') }] },
    self: { registration: { scope: 'https://fixture.test/app/' }, crypto: webcrypto, clients: { claim, matchAll: async () => clients }, skipWaiting,
      addEventListener: (name: string, handler: (event: Record<string, unknown>) => void) => handlers.set(name, handler) },
    caches: cache, fetch: network, URL, Response, Headers, Uint8Array, setTimeout, clearTimeout,
  })
  async function lifecycle(name: string, event: Record<string, unknown> = {}) {
    let promise: Promise<unknown> | undefined
    handlers.get(name)!({ ...event, waitUntil: (task: Promise<unknown>) => { promise = task } })
    await promise
  }
  async function request(request: { url: string; method?: string; mode?: string }) {
    let response: Promise<Response> | undefined
    handlers.get('fetch')!({ request: { method: 'GET', mode: 'cors', ...request }, respondWith: (task: Promise<Response>) => { response = task } })
    return response
  }
  return { stores, cache, put, network, skipWaiting, claim, lifecycle, request, handlers, clients }
}
describe('public-guide-only worker', () => {
  it('installs exact hashed public bytes without credentials or automatic activation', async () => {
    const f = fixture(); await f.lifecycle('install')
    expect(f.network).toHaveBeenCalledWith('https://fixture.test/app/offline.html', { credentials: 'omit', cache: 'no-store', redirect: 'error' })
    expect(f.put).toHaveBeenCalledOnce(); expect(f.skipWaiting).not.toHaveBeenCalled()
    expect(await (await f.request({ url: 'https://fixture.test/app/offline.html' }))!.text()).toBe('guide')
  })
  it.each(['private bytes', 'private-header', 'no-store-header', 'error-status', 'redirect'])('rejects %s before any cache write', async failure => {
    const response = failure === 'private bytes' ? new Response('room secret') : failure === 'error-status' ? new Response('guide', { status: 500 }) : new Response('guide', { headers: { 'cache-control': failure === 'private-header' ? 'private' : failure === 'no-store-header' ? 'no-store' : 'public' } })
    if (failure === 'redirect') Object.defineProperty(response, 'redirected', { value: true })
    const f = fixture({ fetch: vi.fn(async () => response) })
    await expect(f.lifecycle('install')).rejects.toThrow()
    expect(f.put).not.toHaveBeenCalled(); expect(f.stores.size).toBe(0)
  })
  it('does not intercept private API/socket/actions, cross-origin, query or app assets', async () => {
    const f = fixture()
    for (const request of [
      { url: 'https://fixture.test/app/api/room' }, { url: 'https://fixture.test/socket.io/?transport=polling' },
      { url: 'https://fixture.test/app/offline.html?token=secret' }, { url: 'https://other.test/offline.html' },
      { url: 'https://fixture.test/app/assets/application.js' }, { url: 'https://fixture.test/app/cards/1.png' },
      { url: 'https://fixture.test/app/offline.html', method: 'POST' },
    ]) expect(await f.request(request)).toBeUndefined()
    expect(f.network).not.toHaveBeenCalled(); expect(f.put).not.toHaveBeenCalled()
  })
  it('offline navigation returns only static guide and never stores room responses', async () => {
    const network = vi.fn(async () => new Response('guide')), f = fixture({ fetch: network })
    await f.lifecycle('install'); network.mockRejectedValue(new Error('offline'))
    const response = (await f.request({ url: 'https://fixture.test/app/game', mode: 'navigate' }))!
    expect(await response.text()).toBe('guide')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(network).toHaveBeenLastCalledWith({ method: 'GET', url: 'https://fixture.test/app/game', mode: 'navigate' }, { cache: 'no-store' })
    expect(f.put).toHaveBeenCalledOnce()
  })
  it('storage eviction yields truthful 503, not a playable cached app', async () => {
    const f = fixture({ fetch: vi.fn(async () => { throw new Error('offline') }) })
    const response = (await f.request({ url: 'https://fixture.test/app/game', mode: 'navigate' }))!
    expect(response.status).toBe(503); expect(await response.text()).toContain('kết nối mạng')
    expect(f.put).not.toHaveBeenCalled()
  })
  it('HTTP failure is not cached or replaced as offline success', async () => {
    const f = fixture({ fetch: vi.fn(async () => new Response('unavailable', { status: 503 })) })
    expect((await f.request({ url: 'https://fixture.test/app/game', mode: 'navigate' }))!.status).toBe(503)
    expect(f.put).not.toHaveBeenCalled()
  })
  it('activation removes only its own old public cache namespace', async () => {
    const f = fixture(); f.stores.set('emcoin-guide-fixture-old', new Map()); f.stores.set('another-app', new Map())
    await f.lifecycle('install'); await f.lifecycle('activate')
    expect([...f.stores.keys()]).toEqual(['another-app', 'emcoin-guide-fixture-v1']); expect(f.claim).toHaveBeenCalledOnce()
  })
  it.each([[true, true], [true, false]])('activates only if every scoped tab votes idle: %j', async (...votes) => {
    const f = fixture({ votes }), reply = vi.fn()
    await f.lifecycle('message', { data: { type: 'EMCOIN_ACTIVATE' }, source: { url: 'https://fixture.test/app/', postMessage: reply } })
    expect(f.skipWaiting).toHaveBeenCalledTimes(votes.every(Boolean) ? 1 : 0)
    expect(reply).toHaveBeenCalledWith({ type: votes.every(Boolean) ? 'EMCOIN_UPDATE_ACCEPTED' : 'EMCOIN_UPDATE_DEFERRED' })
  })
  it('does not accept activation from outside its app scope', async () => {
    const f = fixture()
    await f.lifecycle('message', { data: { type: 'EMCOIN_ACTIVATE' }, source: { url: 'https://fixture.test/other/', postMessage: vi.fn() } })
    expect(f.skipWaiting).not.toHaveBeenCalled()
  })
  it('missing tab votes time out without automatic activation', async () => {
    vi.useFakeTimers()
    try {
      const f = fixture({ votes: [true, null] }), reply = vi.fn()
      const task = f.lifecycle('message', { data: { type: 'EMCOIN_ACTIVATE' }, source: { url: 'https://fixture.test/app/', postMessage: reply } })
      await vi.advanceTimersByTimeAsync(2501); await task
      expect(f.skipWaiting).not.toHaveBeenCalled(); expect(reply).toHaveBeenCalledWith({ type: 'EMCOIN_UPDATE_DEFERRED' })
    } finally { vi.useRealTimers() }
  })
})
