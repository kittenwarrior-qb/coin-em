export interface AdminOverview {
  rooms: { id: string; status: 'waiting' | 'playing' | 'ended'; seats: number; revision: number }[]
  analytics: {
    version: 'operational-analytics/v1'; scope: 'this-process-since-start'; persistent: false
    http: { completed: number; clientErrors: number; serverErrors: number
      durationBuckets: { upperBoundMs: number | null; count: number }[] }
  }
}

export class AdminRequestError extends Error {
  constructor(readonly status: number) { super('ADMIN_REQUEST_FAILED') }
}

export interface AdminCloseCommand {
  roomId: string; expectedRevision: number; requestId: string
  reason: 'operator-request' | 'stuck-room' | 'safety'
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0
const limits = [10, 50, 100, 250, 500, 1000, 5000, null]

/** Return only the approved metadata, even if a future server adds private fields. */
export function parseAdminOverview(value: unknown): AdminOverview {
  if (!object(value) || !Array.isArray(value.rooms) || value.rooms.length > 10000 ||
      !object(value.analytics) || value.analytics.version !== 'operational-analytics/v1' ||
      value.analytics.scope !== 'this-process-since-start' || value.analytics.persistent !== false ||
      !object(value.analytics.http)) throw new AdminRequestError(502)
  const http = value.analytics.http
  if (!count(http.completed) || !count(http.clientErrors) || !count(http.serverErrors) ||
      http.clientErrors > http.completed || http.serverErrors > http.completed ||
      !Array.isArray(http.durationBuckets) || http.durationBuckets.length !== limits.length) {
    throw new AdminRequestError(502)
  }
  const seen = new Set<string>()
  const rooms = value.rooms.map(room => {
    if (!object(room) || typeof room.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(room.id) ||
        seen.has(room.id) || typeof room.status !== 'string' || !['waiting', 'playing', 'ended'].includes(room.status) ||
        !count(room.seats) || room.seats > 10 || !count(room.revision)) throw new AdminRequestError(502)
    seen.add(room.id)
    return { id: room.id, status: room.status as AdminOverview['rooms'][number]['status'],
      seats: room.seats, revision: room.revision }
  })
  const durationBuckets = http.durationBuckets.map((bucket, index) => {
    if (!object(bucket) || bucket.upperBoundMs !== limits[index] || !count(bucket.count)) {
      throw new AdminRequestError(502)
    }
    return { upperBoundMs: limits[index], count: bucket.count }
  })
  return { rooms, analytics: { version: 'operational-analytics/v1', scope: 'this-process-since-start',
    persistent: false, http: { completed: http.completed, clientErrors: http.clientErrors,
      serverErrors: http.serverErrors, durationBuckets } } }
}

async function request(path: '/overview' | '/login' | '/logout' | '/close-room', signal: AbortSignal,
  body?: { email: string; password: string } | Record<string, never> | AdminCloseCommand): Promise<unknown> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) controller.abort()
  // A timeout is an uncertain mutation outcome, never evidence that the server rolled back.
  const timeout = setTimeout(abort, 10_000)
  try {
    const response = await fetch(`/admin/api${path}`, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { 'X-Emcoin-Admin': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) throw new AdminRequestError(response.status)
    if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new AdminRequestError(502)
    const reader = response.body?.getReader()
    let payload = ''
    if (reader) {
      const decoder = new TextDecoder()
      let bytes = 0
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          bytes += chunk.value.byteLength
          if (bytes > 256 * 1024) { controller.abort(); throw new AdminRequestError(502) }
          payload += decoder.decode(chunk.value, { stream: true })
        }
        payload += decoder.decode()
      } finally { reader.releaseLock() }
    } else payload = await response.text()
    if (payload.length > 256 * 1024) throw new AdminRequestError(502)
    try { return JSON.parse(payload) as unknown } catch { throw new AdminRequestError(502) }
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}

async function mutation(path: '/login' | '/logout', signal: AbortSignal,
  body: { email: string; password: string } | Record<string, never>) {
  const result = await request(path, signal, body)
  if (!object(result) || result.success !== true) throw new AdminRequestError(502)
}

export const adminClient = {
  overview: async (signal: AbortSignal) => parseAdminOverview(await request('/overview', signal)),
  login: (email: string, password: string, signal: AbortSignal) => mutation('/login', signal, { email, password }),
  logout: (signal: AbortSignal) => mutation('/logout', signal, {}),
  closeRoom: async (command: AdminCloseCommand, signal: AbortSignal) => {
    const result = await request('/close-room', signal, command)
    if (!object(result) || result.success !== true || typeof result.replayed !== 'boolean') throw new AdminRequestError(502)
    return { success: true as const, replayed: result.replayed }
  },
}
