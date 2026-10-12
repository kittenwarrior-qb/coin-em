import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminClient, AdminRequestError, parseAdminOverview } from '@/features/admin/client'

export const overviewFixture = () => ({ rooms: [{ id: 'fixture-room', status: 'waiting', seats: 5, revision: 2 }],
  analytics: { version: 'operational-analytics/v1', scope: 'this-process-since-start', persistent: false,
    http: { completed: 12, clientErrors: 1, serverErrors: 0,
      durationBuckets: [10, 50, 100, 250, 500, 1000, 5000, null].map(upperBoundMs => ({ upperBoundMs, count: 0 })) } } })

function response(body: unknown, status = 200) {
  return { ok: status === 200, status, headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify(body) }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('restricted admin client', () => {
  it('projects only metadata and never forwards unknown private fields', () => {
    const fixture = overviewFixture()
    const parsed = parseAdminOverview({ ...fixture, privateStory: 'secret', rooms: [{ ...fixture.rooms[0], nickname: 'private' }] })
    expect(parsed).toEqual(fixture)
    expect(JSON.stringify(parsed)).not.toMatch(/secret|nickname|privateStory/)
  })
  it.each([
    (value: ReturnType<typeof overviewFixture>) => { value.rooms[0].status = 'unexpected' },
    (value: ReturnType<typeof overviewFixture>) => { value.rooms[0].seats = 11 },
    (value: ReturnType<typeof overviewFixture>) => { value.rooms[0].revision = -1 },
    (value: ReturnType<typeof overviewFixture>) => { value.rooms.push(value.rooms[0]) },
    (value: ReturnType<typeof overviewFixture>) => { value.analytics.http.durationBuckets.pop() },
    (value: ReturnType<typeof overviewFixture>) => { value.analytics.http.completed = NaN },
  ])('fails closed for malformed schema', change => {
    const fixture = overviewFixture(); change(fixture)
    expect(() => parseAdminOverview(fixture)).toThrow(AdminRequestError)
  })
  it('uses only same-origin cookie endpoints, no-store, explicit headers and no retries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ success: true }))
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal
    await adminClient.login('fixture@example.invalid', 'synthetic-not-real-password', signal)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/admin/api/login', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: expect.any(AbortSignal),
      headers: { 'X-Emcoin-Admin': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fixture@example.invalid', password: 'synthetic-not-real-password' }),
    })
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
  it('does not parse or echo failed authentication responses', async () => {
    const text = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ...response({}, 401), text }))
    await expect(adminClient.overview(new AbortController().signal)).rejects.toMatchObject({ status: 401, message: 'ADMIN_REQUEST_FAILED' })
    expect(text).not.toHaveBeenCalled()
  })
  it('rejects non-JSON successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ...response({}), headers: new Headers({ 'content-type': 'text/html' }) }))
    await expect(adminClient.overview(new AbortController().signal)).rejects.toMatchObject({ status: 502 })
  })
  it('does not accept a success payload missing its confirmation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ token: 'must-not-admit' })))
    await expect(adminClient.logout(new AbortController().signal)).rejects.toMatchObject({ status: 502 })
  })
  it('bounds pending network time without automatic mutation retries or claiming rollback', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal!.addEventListener('abort', () => reject(new DOMException('synthetic abort', 'AbortError')))
    }))
    vi.stubGlobal('fetch', fetchMock)
    const request = adminClient.closeRoom({ roomId: 'fixture-room', expectedRevision: 1,
      requestId: 'd3b502d9-3dd9-43ca-86d5-f44f4cbb21d1', reason: 'safety' }, new AbortController().signal)
    const outcome = request.then(() => null, error => error as Error)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(await outcome).toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('propagates unmount cancellation to the actual fetch controller and releases timers', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal!.addEventListener('abort', () => reject(new DOMException('synthetic abort', 'AbortError')))
    }))
    vi.stubGlobal('fetch', fetchMock)
    const outcome = adminClient.overview(controller.signal).then(() => null, error => error as Error)
    controller.abort()
    expect(await outcome).toMatchObject({ name: 'AbortError' })
    expect(vi.getTimerCount()).toBe(0)
  })
})
