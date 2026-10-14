import { json, Router, type Express, type ErrorRequestHandler } from 'express'
import type { Room } from '../modules/game/types'
import { AdminAuth, ADMIN_SESSION_MS } from './AdminAuth'
import { OperationalAnalytics } from './operationalAnalytics'
import { validAdminClose, type AdminCloseCommand } from './closeRoom'
import type { CatalogStore } from '../catalog/CatalogStore'
import { TRAFFIC_RANGES, type TrafficStore } from '../analytics/TrafficStore'
import type { ChatReportStore } from '../communication/ChatReportStore'

const COOKIE = '__Host-emcoin-admin'
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'strict' as const, path: '/' }

function sessionCookie(header: string | undefined): string | undefined {
  if (!header || header.length > 4096) return
  const values = header.split(';').map(value => value.trim()).filter(value => value.startsWith(`${COOKIE}=`))
  if (values.length !== 1) return
  const token = values[0].slice(COOKIE.length + 1)
  return /^[a-f0-9]{64}$/.test(token) ? token : undefined
}

export function registerAdminApi(app: Express, options: {
  auth: AdminAuth; origin?: string; rooms: () => readonly Room[]; analytics: OperationalAnalytics;
  closeRoom?: (command: AdminCloseCommand, authorized: () => boolean) => Promise<{ success: true; replayed: boolean }>;
  catalog?: () => CatalogStore | undefined;
  traffic?: () => TrafficStore | undefined;
  system?: () => object;
  chatReports?: () => ChatReportStore | undefined;
}): void {
  let trustedOrigin: string | undefined
  if (options.origin) {
    try {
      const parsed = new URL(options.origin)
      if (parsed.protocol !== 'https:' || parsed.origin !== options.origin || parsed.username || parsed.password) {
        throw new Error('INVALID_ADMIN_ORIGIN_CONFIG')
      }
      trustedOrigin = parsed.origin
    } catch {
      throw new Error('INVALID_ADMIN_ORIGIN_CONFIG')
    }
  }
  const router = Router()
  router.use((request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Frame-Options', 'DENY')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    if (!trustedOrigin) { response.status(503).json({ error: 'ADMIN_UNAVAILABLE' }); return }
    const origin = request.get('origin')
    if (request.get('x-emcoin-admin') !== '1' || (origin && origin !== trustedOrigin) ||
        (request.method !== 'GET' && origin !== trustedOrigin)) {
      response.status(403).json({ error: 'REQUEST_NOT_ALLOWED' }); return
    }
    next()
  })
  // Preserve the4KB login boundary; only the authenticated catalog mutation needs longer text.
  router.use((request, response, next) => json({ limit: request.path === '/catalog/save' ? '96kb' : '4kb', strict: true })(request, response, next))
  router.post('/login', async (request, response) => {
    if (!request.is('application/json') || !request.body || typeof request.body !== 'object' ||
        Array.isArray(request.body) || Object.keys(request.body).some(key => key !== 'email' && key !== 'password')) {
      response.status(400).json({ error: 'INVALID_LOGIN_REQUEST' }); return
    }
    const result = await options.auth.login(request.body.email, request.body.password)
    if (!result.ok) {
      const status = result.error === 'AUTH_UNAVAILABLE' ? 503 : result.error === 'RATE_LIMITED' ? 429 : 401
      if (status === 429) response.setHeader('Retry-After', '60')
      response.status(status).json({ error: result.error }); return
    }
    response.cookie(COOKIE, result.token, { ...cookieOptions, maxAge: ADMIN_SESSION_MS })
    response.json({ success: true })
  })
  router.use((request, response, next) => {
    if (!options.auth.authenticate(sessionCookie(request.headers.cookie))) {
      response.status(401).json({ error: 'ADMIN_AUTH_REQUIRED' }); return
    }
    next()
  })
  router.post('/logout', (request, response) => {
    options.auth.logout(sessionCookie(request.headers.cookie))
    response.clearCookie(COOKIE, cookieOptions)
    response.json({ success: true })
  })
  router.post('/change-password', async (request, response) => {
    if (!request.is('application/json') || !request.body || Array.isArray(request.body) ||
        Object.keys(request.body).sort().join('|') !== 'currentPassword|newPassword') {
      response.status(400).json({ error: 'INVALID_PASSWORD_REQUEST' }); return
    }
    const result = await options.auth.changePassword(sessionCookie(request.headers.cookie), request.body.currentPassword, request.body.newPassword)
    if (!result.ok) {
      const status = result.error === 'ADMIN_AUTH_REQUIRED' ? 401 : result.error === 'RATE_LIMITED' ? 429 : result.error === 'AUTH_UNAVAILABLE' ? 503 : 400
      if (status === 429) response.setHeader('Retry-After', '60')
      response.status(status).json({ error: result.error }); return
    }
    response.clearCookie(COOKIE, cookieOptions)
    response.json({ success: true })
  })
  // Only individually selected safety evidence, never a browsing API for all chat/stories.
  router.get('/reports', (request, response) => {
    const status = request.query.status ?? 'open'
    if (typeof status !== 'string' || !['open', 'resolved', 'dismissed', 'all'].includes(status)) { response.status(400).json({ error: 'INVALID_REPORT_STATUS' }); return }
    try {
      const store = options.chatReports?.()
      if (!store) { response.status(503).json({ error: 'REPORT_UNAVAILABLE' }); return }
      response.json(store.list(status as 'open' | 'resolved' | 'dismissed' | 'all'))
    } catch { response.status(503).json({ error: 'REPORT_UNAVAILABLE' }) }
  })
  router.post('/reports/resolve', (request, response) => {
    if (!request.is('application/json') || !request.body || Array.isArray(request.body) ||
        Object.keys(request.body).sort().join('|') !== 'id|requestId|status') { response.status(400).json({ error: 'INVALID_REPORT_RESOLUTION' }); return }
    try {
      const store = options.chatReports?.()
      if (!store) { response.status(503).json({ error: 'REPORT_UNAVAILABLE' }); return }
      response.json(store.resolve(request.body.id, request.body.status, request.body.requestId))
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      const expected = ['INVALID_REPORT_RESOLUTION', 'REPORT_NOT_FOUND', 'REPORT_STATUS_CONFLICT', 'REPORT_REQUEST_CONFLICT'].includes(code)
      response.status(code === 'INVALID_REPORT_RESOLUTION' ? 400 : code === 'REPORT_NOT_FOUND' ? 404 : expected ? 409 : 503)
        .json({ error: expected ? code : 'REPORT_UNAVAILABLE' })
    }
  })
  router.get('/catalog', (_request, response) => {
    try {
      const catalog = options.catalog?.()
      if (!catalog) { response.status(503).json({ error: 'CATALOG_UNAVAILABLE' }); return }
      response.json({ ...catalog.draft(), active: false })
    } catch { response.status(503).json({ error: 'CATALOG_UNAVAILABLE' }) }
  })
  router.post('/catalog/save', (request, response) => {
    if (!request.is('application/json') || !request.body ||
        Object.keys(request.body).sort().join('|') !== 'card|expectedRevision|requestId') {
      response.status(400).json({ error: 'INVALID_CATALOG_COMMAND' }); return
    }
    const catalog = options.catalog?.()
    if (!catalog) { response.status(503).json({ error: 'CATALOG_UNAVAILABLE' }); return }
    try { response.json(catalog.save(request.body.card, request.body.expectedRevision, request.body.requestId)) }
    catch (error) {
      const code = error instanceof Error ? error.message : ''
      const conflict = ['CATALOG_CODE_CONFLICT', 'CATALOG_REQUEST_CONFLICT', 'CATALOG_REVISION_CONFLICT'].includes(code)
      response.status(conflict ? 409 : code.startsWith('INVALID_CATALOG') ? 400 : 503)
        .json({ error: conflict || code.startsWith('INVALID_CATALOG') ? code : 'CATALOG_UNAVAILABLE' })
    }
  })
  router.get('/catalog/readiness', (_request, response) => {
    try {
      const catalog = options.catalog?.()
      if (!catalog) { response.status(503).json({ error: 'CATALOG_UNAVAILABLE' }); return }
      response.json({ ...catalog.readiness(), snapshots: catalog.snapshots() })
    } catch { response.status(503).json({ error: 'CATALOG_UNAVAILABLE' }) }
  })
  // Preparing a reviewed immutable version is not activation or a gameplay rules change.
  router.post('/catalog/snapshot', (request, response) => {
    if (!request.is('application/json') || !request.body || Array.isArray(request.body) ||
        Object.keys(request.body).sort().join('|') !== 'expectedRevision|requestId') {
      response.status(400).json({ error: 'INVALID_CATALOG_COMMAND' }); return
    }
    const catalog = options.catalog?.()
    if (!catalog) { response.status(503).json({ error: 'CATALOG_UNAVAILABLE' }); return }
    try { response.json(catalog.snapshot(request.body.expectedRevision, request.body.requestId)) }
    catch (error) {
      const code = error instanceof Error ? error.message : ''
      const conflict = ['CATALOG_REQUEST_CONFLICT', 'CATALOG_REVISION_CONFLICT', 'CATALOG_REVIEW_REQUIRED'].includes(code)
      response.status(conflict ? 409 : code.startsWith('INVALID_CATALOG') ? 400 : 503)
        .json({ error: conflict || code.startsWith('INVALID_CATALOG') ? code : 'CATALOG_UNAVAILABLE' })
    }
  })
  router.post('/catalog/activate', (request, response) => {
    if (!request.is('application/json') || !request.body || Array.isArray(request.body) ||
        Object.keys(request.body).sort().join('|') !== 'expectedRevision|requestId|version') {
      response.status(400).json({ error: 'INVALID_CATALOG_COMMAND' }); return
    }
    const catalog = options.catalog?.()
    if (!catalog) { response.status(503).json({ error: 'CATALOG_UNAVAILABLE' }); return }
    try { response.json(catalog.activate(request.body.version, request.body.expectedRevision, request.body.requestId)) }
    catch (error) {
      const code = error instanceof Error ? error.message : ''
      const conflict = ['CATALOG_REQUEST_CONFLICT', 'CATALOG_REVISION_CONFLICT', 'CATALOG_REVIEW_REQUIRED', 'CATALOG_RUNTIME_BINDING_REQUIRED', 'CATALOG_VERSION_NOT_FOUND'].includes(code)
      response.status(conflict ? 409 : code.startsWith('INVALID_CATALOG') ? 400 : 503)
        .json({ error: conflict || code.startsWith('INVALID_CATALOG') ? code : 'CATALOG_UNAVAILABLE' })
    }
  })
  router.get('/overview', (_request, response) => {
    try {
      response.json({ rooms: options.rooms().map(room => ({
        id: room.id, status: room.status, seats: room.players.length, revision: room.revision ?? 0,
      })), analytics: options.analytics.snapshot() })
    } catch { response.status(503).json({ error: 'ADMIN_UNAVAILABLE' }) }
  })
  // Daily anonymous totals only: visitors, page views, sources, devices and room/game counts.
  router.get('/traffic', (request, response) => {
    const days = Number(request.query.days ?? 30)
    if (!(TRAFFIC_RANGES as readonly number[]).includes(days)) { response.status(400).json({ error: 'INVALID_TRAFFIC_RANGE' }); return }
    try {
      const traffic = options.traffic?.()
      if (!traffic) { response.status(503).json({ error: 'TRAFFIC_UNAVAILABLE' }); return }
      response.json(traffic.report(days))
    } catch { response.status(503).json({ error: 'TRAFFIC_UNAVAILABLE' }) }
  })
  router.get('/system', (_request, response) => {
    try {
      if (!options.system) { response.status(503).json({ error: 'ADMIN_UNAVAILABLE' }); return }
      response.json(options.system())
    } catch { response.status(503).json({ error: 'ADMIN_UNAVAILABLE' }) }
  })
  router.post('/close-room', async (request, response) => {
    if (!request.is('application/json') || !validAdminClose(request.body)) {
      response.status(400).json({ error: 'INVALID_CLOSE_REQUEST' }); return
    }
    if (!options.closeRoom) { response.status(503).json({ error: 'ADMIN_UNAVAILABLE' }); return }
    const token = sessionCookie(request.headers.cookie)
    try {
      const result = await options.closeRoom(request.body, () => options.auth.authenticate(token))
      response.json(result)
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      const status = code === 'ADMIN_AUTH_REQUIRED' ? 401 : code === 'ROOM_NOT_FOUND' ? 404 :
        code === 'ROOM_CLOSE_CONFLICT' ? 409 : 503
      response.status(status).json({ error: status === 503 ? 'ADMIN_UNAVAILABLE' : code })
    }
  })
  const safeError: ErrorRequestHandler = (_error, _request, response, _next) => {
    response.status(400).json({ error: 'INVALID_ADMIN_REQUEST' })
  }
  router.use(safeError)
  app.use('/admin/api', router)
}
