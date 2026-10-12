import { describe, expect, it } from 'vitest'
import { OperationalAnalytics } from '../../src/admin/operationalAnalytics'

describe('bounded anonymous operational aggregates', () => {
  it('counts HTTP outcomes and fixed disjoint timing buckets only', () => {
    const analytics = new OperationalAnalytics()
    for (const [status, ms] of [[200, 10], [400, 11], [503, 5000], [201, 5001]]) {
      expect(analytics.recordHttp(status, ms)).toBe(true)
    }
    const report = analytics.snapshot()
    expect(report.http).toMatchObject({ completed: 4, clientErrors: 1, serverErrors: 1 })
    expect(report.http.durationBuckets.map(bucket => bucket.count)).toEqual([1, 1, 0, 0, 0, 0, 1, 1])
    expect(report.scope).toBe('this-process-since-start')
    expect(report.persistent).toBe(false)
  })

  it.each([[99, 1], [600, 1], [200.5, 1], [NaN, 1], [200, -1], [200, NaN], [200, Infinity]])(
    'rejects invalid status/timing %s/%s without altering totals', (status, ms) => {
      const analytics = new OperationalAnalytics()
      const before = analytics.snapshot()
      expect(analytics.recordHttp(status, ms)).toBe(false)
      expect(analytics.snapshot()).toEqual(before)
    })

  it('never grows keys with traffic or returns mutable internal bucket state', () => {
    const analytics = new OperationalAnalytics()
    for (let i = 0; i < 10_000; i++) analytics.recordHttp(200, i)
    const report = analytics.snapshot()
    expect(report.http.durationBuckets).toHaveLength(8)
    expect(report.http.completed).toBe(10_000)
    report.http.durationBuckets[0].count = -1
    report.http.completed = -1
    expect(analytics.snapshot().http.completed).toBe(10_000)
    expect(analytics.snapshot().http.durationBuckets[0].count).toBe(11)
    expect(Object.keys(report)).toEqual(['version', 'scope', 'persistent', 'http'])
  })

  it('restarts at zero without carrying visitor identifiers or disk history', () => {
    const prior = new OperationalAnalytics()
    prior.recordHttp(200, 1)
    expect(new OperationalAnalytics().snapshot().http.completed).toBe(0)
  })
})
