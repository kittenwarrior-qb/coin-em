import type { RequestHandler } from 'express'
import { performance } from 'node:perf_hooks'

const LIMITS_MS = [10, 50, 100, 250, 500, 1000, 5000] as const
const increment = (value: number) => Math.min(Number.MAX_SAFE_INTEGER, value + 1)

/** Fixed-space, volatile operational totals. No visitor/room/user/content inputs. */
export class OperationalAnalytics {
  private completed = 0
  private clientErrors = 0
  private serverErrors = 0
  private readonly buckets = Array<number>(LIMITS_MS.length + 1).fill(0)

  recordHttp(status: number, elapsedMs: number): boolean {
    if (!Number.isInteger(status) || status < 100 || status > 599 ||
        !Number.isFinite(elapsedMs) || elapsedMs < 0) return false
    this.completed = increment(this.completed)
    if (status >= 500) this.serverErrors = increment(this.serverErrors)
    else if (status >= 400) this.clientErrors = increment(this.clientErrors)
    const index = LIMITS_MS.findIndex(limit => elapsedMs <= limit)
    const bucket = index === -1 ? LIMITS_MS.length : index
    this.buckets[bucket] = increment(this.buckets[bucket])
    return true
  }

  snapshot() {
    return {
      version: 'operational-analytics/v1' as const,
      scope: 'this-process-since-start' as const,
      persistent: false as const,
      http: { completed: this.completed, clientErrors: this.clientErrors, serverErrors: this.serverErrors,
        durationBuckets: this.buckets.map((count, index) => ({
          upperBoundMs: index < LIMITS_MS.length ? LIMITS_MS[index] : null, count,
        })) },
    }
  }
}

/** Finish-only HTTP outcomes; deliberately no paths, headers, identities or bodies. */
export function operationalAnalyticsMiddleware(analytics: OperationalAnalytics): RequestHandler {
  return (_request, response, next) => {
    const start = performance.now()
    response.once('finish', () => analytics.recordHttp(response.statusCode, performance.now() - start))
    next()
  }
}
