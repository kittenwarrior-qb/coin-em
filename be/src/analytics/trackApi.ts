import { json, type Express, type ErrorRequestHandler, type Request } from 'express'
import type { TrafficStore } from './TrafficStore'

// One browser cannot inflate the numbers. Keyed by address + browser because event guests
// share NAT addresses; this only skips counting, it never blocks a visitor.
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 60, MAX_KEYS = 5000

/** The nearest proxy appends the real peer last; earlier entries are caller-supplied. */
function addressOf(request: Request): string {
  const forwarded = request.get('x-forwarded-for')?.split(',').pop()?.trim()
  return (forwarded || request.socket.remoteAddress || 'unknown').slice(0, 64)
}

/**
 * POST /api/track — called by the public pages (fe/src/features/analytics/trackPageView.ts).
 * Body: { p: path, r?: referrer, first?: boolean }. No cookies, always 204, never an error page:
 * counting must not break or slow the site.
 */
export function registerTrackApi(app: Express, getStore: () => TrafficStore | undefined): void {
  const recent = new Map<string, number[]>()
  const tooMany = (key: string, now: number) => {
    const times = (recent.get(key) ?? []).filter(time => now - time < WINDOW_MS)
    times.push(now)
    if (recent.size > MAX_KEYS) recent.clear()
    recent.set(key, times)
    return times.length > MAX_PER_WINDOW
  }
  const quiet: ErrorRequestHandler = (_error, _request, response, _next) => { response.status(204).end() }
  app.post('/api/track', json({ limit: '1kb', strict: true }), (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.status(204).end()
    try {
      const store = getStore()
      const body: unknown = request.body
      if (!store || !body || typeof body !== 'object' || Array.isArray(body)) return
      const userAgent = (request.get('user-agent') ?? '').slice(0, 512)
      const address = addressOf(request)
      if (tooMany(`${address}|${userAgent}`, Date.now())) return
      const { p, r, first } = body as Record<string, unknown>
      store.recordView({ path: p, referrer: r, first, address, userAgent, host: request.get('host') })
    } catch { /* statistics are best-effort */ }
  })
  app.use('/api/track', quiet)
}
