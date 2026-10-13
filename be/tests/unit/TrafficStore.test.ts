import { afterEach, describe, expect, it } from 'vitest'
import { TrafficStore } from '../../src/analytics/TrafficStore'
import { cleanPath, dayOf, deviceOf, isBot, lastDays, sourceOf } from '../../src/analytics/trafficRules'

const phone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
const desktop = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'
const now = new Date('2026-10-13T05:00:00Z')

describe('traffic rules', () => {
  it('uses the product time zone for a day and lists a range oldest first', () => {
    expect(dayOf(new Date('2026-10-13T18:30:00Z'))).toBe('2026-10-14')
    expect(lastDays(3, now)).toEqual(['2026-10-11', '2026-10-12', '2026-10-13'])
  })
  it('counts registered public pages only, never admin, room codes or queries', () => {
    expect(cleanPath('/about/story/?utm=1#top')).toBe('/about/story')
    expect(cleanPath('/')).toBe('/')
    for (const path of ['/admin', '/admin/api/overview', '/room/KX7Q2M', '//evil.test', 'about', 42, '/a'.repeat(200)]) expect(cleanPath(path)).toBeNull()
  })
  it('names sources without keeping a URL and treats the own host as direct', () => {
    expect(sourceOf('https://www.google.com.vn/search?q=private')).toBe('Google')
    expect(sourceOf('https://m.facebook.com/groups/1')).toBe('Facebook')
    expect(sourceOf('https://emcoin.cloud/about', 'emcoin.cloud')).toBe('direct')
    expect(sourceOf('https://blog.example.test/post?id=7')).toBe('blog.example.test')
    expect(sourceOf('not a url')).toBe('direct')
  })
  it('recognises devices and robots', () => {
    expect(deviceOf(phone)).toBe('phone'); expect(deviceOf(desktop)).toBe('desktop')
    expect(isBot('Googlebot/2.1')).toBe(true); expect(isBot('')).toBe(true); expect(isBot(desktop)).toBe(false)
  })
})

describe('traffic store, synthetic visits only', () => {
  let store: TrafficStore
  afterEach(() => store?.close())

  it('counts views every time and a visitor once per day per browser', () => {
    store = new TrafficStore(':memory:')
    expect(store.recordView({ path: '/', referrer: 'https://zalo.me/x', first: true, address: '203.0.113.7', userAgent: phone }, now)).toBe(true)
    store.recordView({ path: '/about', address: '203.0.113.7', userAgent: phone }, now)
    // Same shared address, different browser: a second visitor.
    store.recordView({ path: '/', first: true, address: '203.0.113.7', userAgent: desktop }, now)
    expect(store.recordView({ path: '/admin', address: '203.0.113.9', userAgent: desktop }, now)).toBe(false)
    expect(store.recordView({ path: '/', address: '203.0.113.9', userAgent: 'curl/8.0' }, now)).toBe(false)
    store.recordEvent('room', now); store.recordEvent('game', now)
    const report = store.report(7, now)
    expect(report.totals).toEqual({ visitors: 2, views: 3, rooms: 1, games: 1 })
    expect(report.daily).toHaveLength(7)
    expect(report.daily.at(-1)).toEqual({ day: '2026-10-13', visitors: 2, views: 3, rooms: 1, games: 1 })
    expect(report.pages).toEqual([{ label: '/', count: 2 }, { label: '/about', count: 1 }])
    expect(report.sources).toEqual([{ label: 'direct', count: 1 }, { label: 'Zalo', count: 1 }])
    expect(report.devices).toEqual([{ label: 'desktop', count: 1 }, { label: 'phone', count: 1 }])
    expect(report.hasData).toBe(true)
  })

  it('compares with the period before and rejects unsupported ranges', () => {
    store = new TrafficStore(':memory:')
    store.recordView({ path: '/', address: '198.51.100.1', userAgent: phone }, new Date(now.getTime() - 8 * 864e5))
    store.recordView({ path: '/', address: '198.51.100.1', userAgent: phone }, now)
    const report = store.report(7, now)
    expect(report.totals.visitors).toBe(1); expect(report.previous.visitors).toBe(1)
    expect(() => store.report(8, now)).toThrow('INVALID_TRAFFIC_RANGE')
    expect(store.report(30, now).hasData).toBe(true)
  })

  it('stores no address or browser text and bounds caller-supplied sources', () => {
    store = new TrafficStore(':memory:')
    for (let index = 0; index < 80; index++) {
      store.recordView({ path: '/', referrer: `https://site-${index}.example.test/`, first: true, address: `192.0.2.${index}`, userAgent: desktop }, now)
    }
    const report = store.report(7, now)
    expect(report.sources.find(row => row.label === 'other')?.count).toBe(20)
    const { rows } = store.stats()
    // 1 view + 1 visitor + 1 device + 60 bounded source keys + "other".
    expect(rows).toBe(64)
    expect(JSON.stringify(report)).not.toContain('192.0.2.')
    expect(JSON.stringify(report)).not.toContain('Mozilla')
  })

  it('reports an empty store honestly', () => {
    store = new TrafficStore(':memory:')
    const report = store.report(30, now)
    expect(report.hasData).toBe(false)
    expect(report.totals).toEqual({ visitors: 0, views: 0, rooms: 0, games: 0 })
    expect(store.stats()).toMatchObject({ rows: 0, firstDay: null })
  })
})
