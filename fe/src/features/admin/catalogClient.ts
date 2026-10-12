export interface CatalogCard {
  id: string; code: string; name: string; sortOrder: number
  category: 'role' | 'situation' | 'emotion' | 'reflection' | 'selfcare'
  group: string; definition: string; prompt: string; frontImageUrl: string; backImageUrl: string
  sourcePages: number[]; reviewed: boolean; archived: boolean
  faceText?: { front: string; back: string }; roleKey?: string
}
export interface CatalogDraft { revision: number; active: false; cards: CatalogCard[] }
export interface CatalogReleaseState { revision: number; ready: boolean; snapshots: { version: string; createdAt: number; active: boolean }[] }
export class CatalogRequestError extends Error {
  constructor(readonly status: number) { super('CATALOG_REQUEST_FAILED') }
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
export function isCatalogImageUrl(value: string) {
  if (/^\/(emcoin\/decks|cards)\/[A-Za-z0-9_./-]+\.(webp|png|jpg|jpeg)$/.test(value)) return !value.split('/').some(part => part === '.' || part === '..')
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' &&
    !url.username && !url.password && !url.search && !url.hash && url.pathname.includes('/image/upload/') } catch { return false }
}
export function parseCatalogDraft(value: unknown): CatalogDraft {
  if (!object(value) || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 ||
      value.active !== false || !Array.isArray(value.cards) || value.cards.length > 500) throw new CatalogRequestError(502)
  const ids = new Set<string>(), codes = new Set<string>()
  const cards = value.cards.map(card => {
    if (!object(card) || !['role', 'situation', 'emotion', 'reflection', 'selfcare'].includes(card.category as string) ||
        typeof card.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(card.id) || ids.has(card.id) ||
        typeof card.code !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(card.code) || codes.has(card.code) ||
        !Number.isSafeInteger(card.sortOrder) || (card.sortOrder as number) < 0 ||
        typeof card.reviewed !== 'boolean' || typeof card.archived !== 'boolean' ||
        !Array.isArray(card.sourcePages) || card.sourcePages.length > 2 ||
        card.sourcePages.some(page => !Number.isInteger(page) || page < 1 || page > 145)) throw new CatalogRequestError(502)
    for (const [key, limit] of [['name', 160], ['group', 64], ['definition', 4000], ['prompt', 2000], ['frontImageUrl', 2048], ['backImageUrl', 2048]] as const) {
      if (typeof card[key] !== 'string' || card[key].length > limit) throw new CatalogRequestError(502)
    }
    ids.add(card.id); codes.add(card.code)
    if (!isCatalogImageUrl(card.frontImageUrl as string) || !isCatalogImageUrl(card.backImageUrl as string)) throw new CatalogRequestError(502)
    const faceText = card.faceText ?? { front: '', back: '' }
    if (!object(faceText) || typeof faceText.front !== 'string' || typeof faceText.back !== 'string' ||
        faceText.front.length > 6000 || faceText.back.length > 6000 ||
        (card.roleKey !== undefined && (typeof card.roleKey !== 'string' || !['', 'narrator', 'sender', 'silencer', 'connector', 'opener', 'guide', 'healer'].includes(card.roleKey)))) throw new CatalogRequestError(502)
    return { id: card.id, code: card.code, name: card.name, category: card.category, group: card.group,
      sortOrder: card.sortOrder, definition: card.definition, prompt: card.prompt,
      frontImageUrl: card.frontImageUrl, backImageUrl: card.backImageUrl,
      sourcePages: [...card.sourcePages], reviewed: card.reviewed, archived: card.archived,
      faceText: { front: faceText.front, back: faceText.back }, roleKey: card.roleKey ?? '' } as CatalogCard
  })
  return { revision: value.revision as number, active: false, cards }
}
async function request(path: string, signal: AbortSignal, body?: object): Promise<unknown> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()
  const timer = setTimeout(abort, 10000)
  try {
    const response = await fetch(`/admin/api/catalog${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin',
      redirect: 'error', cache: 'no-store', signal: controller.signal,
      headers: { 'X-Emcoin-Admin': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) })
    if (!response.ok) throw new CatalogRequestError(response.status)
    if (!response.headers.get('content-type')?.startsWith('application/json')) throw new CatalogRequestError(502)
    const reader = response.body?.getReader()
    if (!reader) throw new CatalogRequestError(502)
    let bytes = 0, content = ''
    const decoder = new TextDecoder()
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        bytes += chunk.value.byteLength
        if (bytes > 4 * 1024 * 1024) { controller.abort(); throw new CatalogRequestError(502) }
        content += decoder.decode(chunk.value, { stream: true })
      }
      content += decoder.decode()
    } finally { reader.releaseLock() }
    try { return JSON.parse(content) } catch { throw new CatalogRequestError(502) }
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort) }
}
export const catalogClient = {
  releases: async (signal: AbortSignal): Promise<CatalogReleaseState> => {
    const value = await request('/readiness', signal)
    if (!object(value) || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 || typeof value.ready !== 'boolean' ||
        !Array.isArray(value.snapshots) || value.snapshots.length > 100 || value.snapshots.some(item => !object(item) ||
          typeof item.version !== 'string' || !/^catalog-[a-f0-9]{64}$/.test(item.version) ||
          !Number.isSafeInteger(item.createdAt) || (item.createdAt as number) < 0 || typeof item.active !== 'boolean')) throw new CatalogRequestError(502)
    if (new Set(value.snapshots.map(item => (item as { version: string }).version)).size !== value.snapshots.length ||
        value.snapshots.filter(item => (item as { active: boolean }).active).length > 1) throw new CatalogRequestError(502)
    return { revision: value.revision as number, ready: value.ready, snapshots: value.snapshots as CatalogReleaseState['snapshots'] }
  },
  activate: async (version: string | null, expectedRevision: number, requestId: string, signal: AbortSignal) => {
    const result = await request('/activate', signal, { version, expectedRevision, requestId })
    if (!object(result) || result.success !== true || result.active !== true || result.version !== version ||
        result.scope !== 'new-rooms-only' || result.revision !== expectedRevision + 1 || typeof result.replayed !== 'boolean') throw new CatalogRequestError(502)
  },
  draft: async (signal: AbortSignal) => parseCatalogDraft(await request('', signal)),
  snapshot: async (expectedRevision: number, requestId: string, signal: AbortSignal): Promise<string> => {
    const result = await request('/snapshot', signal, { expectedRevision, requestId })
    if (!object(result) || result.success !== true || result.active !== false ||
        typeof result.version !== 'string' || !/^catalog-[a-f0-9]{64}$/.test(result.version) ||
        result.revision !== expectedRevision + 1 || typeof result.replayed !== 'boolean') throw new CatalogRequestError(502)
    return result.version
  },
  save: async (card: CatalogCard, expectedRevision: number, requestId: string, signal: AbortSignal) => {
    const result = await request('/save', signal, { card, expectedRevision, requestId })
    if (!object(result) || result.success !== true || result.id !== card.id ||
        !Number.isSafeInteger(result.revision) || result.revision !== expectedRevision + 1 || typeof result.replayed !== 'boolean') throw new CatalogRequestError(502)
  },
}
