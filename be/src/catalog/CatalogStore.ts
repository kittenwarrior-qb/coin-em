import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import { assertRuntimeCatalog, CATALOG_VERSION } from './runtimeCatalog'

export interface CatalogCard {
  id: string; code: string; name: string; sortOrder: number
  category: 'role' | 'situation' | 'emotion' | 'reflection' | 'selfcare'
  group: string; definition: string; prompt: string
  frontImageUrl: string; backImageUrl: string
  sourcePages: number[]; reviewed: boolean; archived: boolean
  faceText?: { front: string; back: string }
  roleKey?: string
}
export interface CatalogDraft { revision: number; cards: CatalogCard[] }
export function catalogReviewIssues(cards: CatalogCard[]) {
  const issues: { id: string; code: string; reasons: string[] }[] = []
  for (const card of cards.filter(item => !item.archived)) {
    const reasons: string[] = []
    if (!card.reviewed) reasons.push('NOT_REVIEWED')
    if (['role', 'emotion'].includes(card.category) ? !card.definition.trim() : !card.prompt.trim()) reasons.push('MISSING_CONTENT')
    if (reasons.length) issues.push({ id: card.id, code: card.code, reasons })
  }
  const missingCategories = categories.filter(category => !cards.some(card => !card.archived && card.category === category))
  return { ready: issues.length === 0 && missingCategories.length === 0, issues, missingCategories }
}
const categories = ['role', 'situation', 'emotion', 'reflection', 'selfcare']
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
export function validImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  if (/^\/(emcoin\/decks|cards)\/[A-Za-z0-9_./-]+\.(webp|png|jpg|jpeg)$/.test(value)) {
    return !value.split('/').some(part => part === '.' || part === '..')
  }
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && !url.username && !url.password &&
      !url.search && !url.hash && url.pathname.includes('/image/upload/')
  } catch { return false }
}
export function parseCatalogCard(value: unknown): CatalogCard {
  if (!object(value) || Object.keys(value).filter(key => key !== 'faceText' && key !== 'roleKey').sort().join('|') !==
      ['id', 'code', 'name', 'sortOrder', 'category', 'group', 'definition', 'prompt', 'frontImageUrl', 'backImageUrl', 'sourcePages', 'reviewed', 'archived'].sort().join('|')) throw new Error('INVALID_CATALOG_CARD')
  for (const [key, limit] of [['id', 64], ['code', 64], ['name', 160], ['group', 64], ['definition', 4000], ['prompt', 2000]] as const) {
    if (typeof value[key] !== 'string' || value[key].length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value[key])) throw new Error('INVALID_CATALOG_CARD')
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value.id as string) || !/^[A-Za-z0-9_-]{1,64}$/.test(value.code as string) ||
      !(value.name as string).trim() || !categories.includes(value.category as string) ||
      !Number.isSafeInteger(value.sortOrder) || (value.sortOrder as number) < 0 || (value.sortOrder as number) > 10000 ||
      !validImageUrl(value.frontImageUrl) || !validImageUrl(value.backImageUrl) ||
      typeof value.reviewed !== 'boolean' || typeof value.archived !== 'boolean' ||
      !Array.isArray(value.sourcePages) || value.sourcePages.length > 2 ||
      value.sourcePages.some(page => !Number.isInteger(page) || page < 1 || page > 145)) throw new Error('INVALID_CATALOG_CARD')
  const faceText = value.faceText ?? { front: '', back: '' }
  if (!object(faceText) || Object.keys(faceText).sort().join('|') !== 'back|front' ||
      ['front', 'back'].some(key => typeof faceText[key] !== 'string' || (faceText[key] as string).length > 6000 ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(faceText[key] as string)) ||
      (value.roleKey !== undefined && (typeof value.roleKey !== 'string' ||
        !['', 'narrator', 'sender', 'silencer', 'connector', 'opener', 'guide', 'healer'].includes(value.roleKey)))) throw new Error('INVALID_CATALOG_CARD')
  return { id: value.id as string, code: value.code as string, name: value.name as string,
    sortOrder: value.sortOrder as number, category: value.category as CatalogCard['category'], group: value.group as string,
    definition: value.definition as string, prompt: value.prompt as string,
    frontImageUrl: value.frontImageUrl as string, backImageUrl: value.backImageUrl as string,
    sourcePages: [...value.sourcePages] as number[], reviewed: value.reviewed, archived: value.archived,
    faceText: { front: faceText.front as string, back: faceText.back as string }, roleKey: value.roleKey as string ?? '' }
}

/** Low-write catalog only. No room/coin/session/media binary data in this database. */
export class CatalogStore {
  private readonly db: DatabaseSync
  constructor(filename: string) {
    this.db = new DatabaseSync(filename)
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS catalog_meta (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL);
      INSERT OR IGNORE INTO catalog_meta VALUES(1,0);
      CREATE TABLE IF NOT EXISTS catalog_draft (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS catalog_snapshot (version TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS catalog_receipt (request_id TEXT PRIMARY KEY, digest TEXT NOT NULL, result TEXT NOT NULL);`)
    this.db.exec(`CREATE TABLE IF NOT EXISTS catalog_active (id INTEGER PRIMARY KEY CHECK(id=1), version TEXT);
      INSERT OR IGNORE INTO catalog_active VALUES(1,NULL);
      CREATE TABLE IF NOT EXISTS catalog_published (version TEXT PRIMARY KEY REFERENCES catalog_snapshot(version));`)
  }
  close() { this.db.close() }
  readiness() { const draft = this.draft(); return { revision: draft.revision, ...catalogReviewIssues(draft.cards) } }
  snapshots() {
    const active = this.activeVersion()
    return this.db.prepare('SELECT version,created_at FROM catalog_snapshot ORDER BY (version=?) DESC,created_at DESC,version LIMIT 100').all(active ?? '')
      .map(row => ({ version: row.version as string, createdAt: row.created_at as number, active: row.version === active }))
  }
  /** Row counts for the admin storage overview; no card content. */
  stats() {
    const total = (table: string) => this.db.prepare(`SELECT count(*) AS total FROM ${table}`).get()!.total as number
    const draft = this.draft()
    return { cards: draft.cards.length, archived: draft.cards.filter(card => card.archived).length, revision: draft.revision,
      snapshots: total('catalog_snapshot'), receipts: total('catalog_receipt'), activeVersion: this.activeVersion() }
  }
  activeVersion(): string | null { return this.db.prepare('SELECT version FROM catalog_active WHERE id=1').get()!.version as string | null }
  readPublished(version: string) {
    return this.db.prepare('SELECT version FROM catalog_published WHERE version=?').get(version) ? this.readSnapshot(version) : null
  }
  activate(version: string | null, expectedRevision: number, requestId: string) {
    if (version !== null && (typeof version !== 'string' || !CATALOG_VERSION.test(version))) throw new Error('INVALID_CATALOG_COMMAND')
    return this.mutate({ action: 'activate', version, expectedRevision }, expectedRevision, requestId, () => {
      if (version !== null) {
        const cards = this.readSnapshot(version)
        if (!cards) throw new Error('CATALOG_VERSION_NOT_FOUND')
        if (!catalogReviewIssues(cards).ready) throw new Error('CATALOG_REVIEW_REQUIRED')
        assertRuntimeCatalog(cards)
        this.db.prepare('INSERT OR IGNORE INTO catalog_published VALUES(?)').run(version)
      }
      this.db.prepare('UPDATE catalog_active SET version=? WHERE id=1').run(version)
      return { version, active: true, scope: 'new-rooms-only' }
    })
  }
  draft(): CatalogDraft {
    const revision = this.db.prepare('SELECT revision FROM catalog_meta WHERE id=1').get()!.revision as number
    const cards = this.db.prepare('SELECT payload FROM catalog_draft').all().map(row => parseCatalogCard(JSON.parse(row.payload as string)))
    cards.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    return { revision, cards }
  }
  seed(cards: CatalogCard[]) {
    if (this.draft().revision !== 0) return
    if (!cards.length || cards.length > 500) throw new Error('INVALID_CATALOG_SEED')
    const parsed = cards.map(parseCatalogCard)
    this.transaction(() => {
      if (this.draft().revision !== 0) return
      for (const card of parsed) this.db.prepare('INSERT INTO catalog_draft VALUES(?,?,?)').run(card.id, card.code, JSON.stringify(card))
      this.db.prepare('UPDATE catalog_meta SET revision=1 WHERE id=1').run()
    })
  }
  /** Fill only empty unreviewed fields from a verified source import. Never overwrite admin edits. */
  fillMissingContent(source: CatalogCard[]) {
    const parsed = source.map(parseCatalogCard)
    return this.transaction(() => {
      let changed = 0
      for (const original of parsed) {
        const row = this.db.prepare('SELECT payload FROM catalog_draft WHERE id=?').get(original.id)
        if (!row) continue
        const current = parseCatalogCard(JSON.parse(row.payload as string))
        if (current.reviewed || current.archived || current.category !== original.category ||
            current.frontImageUrl !== original.frontImageUrl || current.backImageUrl !== original.backImageUrl ||
            JSON.stringify(current.sourcePages) !== JSON.stringify(original.sourcePages)) continue
        const updated = { ...current,
          definition: current.definition || original.definition,
          prompt: current.prompt || original.prompt,
          faceText: { front: current.faceText?.front || original.faceText?.front || '', back: current.faceText?.back || original.faceText?.back || '' },
          roleKey: current.roleKey || original.roleKey || '' }
        if (JSON.stringify(updated) === JSON.stringify(current)) continue
        this.db.prepare('UPDATE catalog_draft SET payload=? WHERE id=?').run(JSON.stringify(updated), current.id)
        changed++
      }
      if (changed) this.db.prepare('UPDATE catalog_meta SET revision=revision+1 WHERE id=1').run()
      return changed
    })
  }
  /** Review only the exact canonical transcription already visually checked against the PDF.
   * Renames, custom text, different images/bindings/order or retired cards require admin review.
   */
  reviewMatchingSource(source: CatalogCard[]) {
    const parsed = source.map(parseCatalogCard)
    return this.transaction(() => {
      let changed = 0
      for (const original of parsed) {
        const row = this.db.prepare('SELECT payload FROM catalog_draft WHERE id=?').get(original.id)
        if (!row) continue
        const current = parseCatalogCard(JSON.parse(row.payload as string))
        if (current.reviewed || current.archived || JSON.stringify({ ...current, reviewed: false }) !== JSON.stringify({ ...original, reviewed: false })) continue
        this.db.prepare('UPDATE catalog_draft SET payload=? WHERE id=?').run(JSON.stringify({ ...current, reviewed: true }), current.id)
        changed++
      }
      if (changed) this.db.prepare('UPDATE catalog_meta SET revision=revision+1 WHERE id=1').run()
      return changed
    })
  }
  private transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try { const result = operation(); this.db.exec('COMMIT'); return result }
    catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  save(input: unknown, expectedRevision: number, requestId: string) {
    const card = parseCatalogCard(input)
    return this.mutate({ card, expectedRevision }, expectedRevision, requestId, () => {
      if (!this.db.prepare('SELECT id FROM catalog_draft WHERE id=?').get(card.id) && this.draft().cards.length >= 500) throw new Error('CATALOG_LIMIT')
      const duplicate = this.db.prepare('SELECT id FROM catalog_draft WHERE code=? AND id<>?').get(card.code, card.id)
      if (duplicate) throw new Error('CATALOG_CODE_CONFLICT')
      this.db.prepare('INSERT INTO catalog_draft VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,payload=excluded.payload').run(card.id, card.code, JSON.stringify(card))
      const size = this.db.prepare('SELECT coalesce(sum(length(CAST(payload AS BLOB))),0)+count(*)+2 AS bytes FROM catalog_draft').get()!.bytes as number
      if (size > 3 * 1024 * 1024) throw new Error('INVALID_CATALOG_SIZE')
      return { id: card.id }
    })
  }
  /** Prepare immutable snapshot only, never activate a new game-rules/catalog version implicitly. */
  snapshot(expectedRevision: number, requestId: string) {
    return this.mutate({ action: 'snapshot', expectedRevision }, expectedRevision, requestId, () => {
      const cards = this.draft().cards.filter(card => !card.archived)
      if (!catalogReviewIssues(cards).ready) throw new Error('CATALOG_REVIEW_REQUIRED')
      const payload = JSON.stringify(cards)
      if (Buffer.byteLength(payload) > 3 * 1024 * 1024) throw new Error('INVALID_CATALOG_SIZE')
      const version = `catalog-${createHash('sha256').update(payload).digest('hex')}`
      this.db.prepare('INSERT OR IGNORE INTO catalog_snapshot VALUES(?,?,?)').run(version, payload, Date.now())
      return { version, active: false }
    })
  }
  readSnapshot(version: string): CatalogCard[] | null {
    const row = this.db.prepare('SELECT payload FROM catalog_snapshot WHERE version=?').get(version)
    if (row && `catalog-${createHash('sha256').update(row.payload as string).digest('hex')}` !== version) throw new Error('CATALOG_INTEGRITY_ERROR')
    return row ? (JSON.parse(row.payload as string) as unknown[]).map(parseCatalogCard) : null
  }
  private mutate(command: object, expectedRevision: number, requestId: string, operation: () => object) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
        typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error('INVALID_CATALOG_COMMAND')
    const digest = createHash('sha256').update(JSON.stringify(command)).digest('hex')
    return this.transaction(() => {
      const receipt = this.db.prepare('SELECT digest,result FROM catalog_receipt WHERE request_id=?').get(requestId)
      if (receipt) {
        if (receipt.digest !== digest) throw new Error('CATALOG_REQUEST_CONFLICT')
        return { ...JSON.parse(receipt.result as string), replayed: true }
      }
      if (this.draft().revision !== expectedRevision) throw new Error('CATALOG_REVISION_CONFLICT')
      const count = this.db.prepare('SELECT count(*) AS total FROM catalog_receipt').get()!.total as number
      if (count >= 100000) throw new Error('CATALOG_RECEIPT_LIMIT')
      const result = { success: true, ...operation(), revision: expectedRevision + 1, replayed: false }
      this.db.prepare('UPDATE catalog_meta SET revision=? WHERE id=1').run(result.revision)
      this.db.prepare('INSERT INTO catalog_receipt VALUES(?,?,?)').run(requestId, digest, JSON.stringify(result))
      return result
    })
  }
}
