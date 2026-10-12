import { afterEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CatalogStore, parseCatalogCard, validImageUrl } from '../../src/catalog/CatalogStore'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'

const resources: { store: CatalogStore; directory?: string }[] = []
afterEach(() => { for (const item of resources.splice(0)) { item.store.close(); if (item.directory) rmSync(item.directory, { recursive: true }) } })
const open = () => { const store = new CatalogStore(':memory:'); resources.push({ store }); store.seed(pdfCatalogDraft()); return store }
describe('real SQLite replacement catalog drafts, no active-game changes', () => {
  it('imports100 logical cards with paired emotion/shared backs, never145 auto-paired pages', () => {
    const store = open()
    expect(store.draft().cards).toHaveLength(100)
    expect(store.draft().cards.filter(card => card.category === 'role')).toHaveLength(7)
    expect(store.draft().cards.find(card => card.name === 'Hung hăng')?.sourcePages).toEqual([71, 72])
    expect(store.draft().cards.find(card => card.name === 'Nụ cười tỏa nắng')?.group).toBe('connection')
    expect(store.draft().cards.every(card => !card.reviewed)).toBe(true)
    store.seed(pdfCatalogDraft())
    expect(store.draft().revision).toBe(1)
  })
  it('preserves identity across rename/order changes, deduplicates lost ACK retry and rejects altered reuse', () => {
    const store = open(), card = { ...store.draft().cards[0], name: 'Tên đã sửa', sortOrder: 400 }, requestId = randomUUID()
    expect(store.save(card, 1, requestId)).toMatchObject({ revision: 2, replayed: false })
    expect(store.save(card, 1, requestId)).toMatchObject({ revision: 2, replayed: true })
    expect(store.draft().cards.find(item => item.id === card.id)?.name).toBe('Tên đã sửa')
    expect(() => store.save({ ...card, name: 'Khác' }, 1, requestId)).toThrow('CATALOG_REQUEST_CONFLICT')
    expect(() => store.save(card, 1, randomUUID())).toThrow('CATALOG_REVISION_CONFLICT')
  })
  it('rejects duplicate codes atomically without consuming revision', () => {
    const store = open(), draft = store.draft()
    expect(() => store.save({ ...draft.cards[1], code: draft.cards[0].code }, 1, randomUUID())).toThrow('CATALOG_CODE_CONFLICT')
    expect(store.draft().revision).toBe(1)
  })
  it('requires review before immutable prepared snapshots, never activates gameplay', () => {
    const store = open()
    expect(() => store.snapshot(1, randomUUID())).toThrow('CATALOG_REVIEW_REQUIRED')
    for (const card of store.draft().cards) store.save({ ...card, reviewed: true, definition: 'Synthetic checked definition', prompt: 'Synthetic checked prompt' }, store.draft().revision, randomUUID())
    const result = store.snapshot(store.draft().revision, randomUUID())
    expect(result.active).toBe(false)
    const snapshot = store.readSnapshot(result.version)
    const card = store.draft().cards[0]
    store.save({ ...card, name: 'Sửa sau snapshot' }, store.draft().revision, randomUUID())
    expect(store.readSnapshot(result.version)).toEqual(snapshot)
    expect(store.readSnapshot('not-found')).toBeNull()
  })
  it('reports missing content and categories without leaking archived cards into readiness', () => {
    const store = open()
    expect(store.readiness()).toMatchObject({ revision: 1, ready: false, missingCategories: [] })
    expect(store.readiness().issues).toHaveLength(100)
    expect(store.readiness().issues[0].reasons).toEqual(['NOT_REVIEWED'])
    for (const card of store.draft().cards.filter(card => card.category === 'role')) {
      store.save({ ...card, archived: true }, store.draft().revision, randomUUID())
    }
    expect(store.readiness().missingCategories).toEqual(['role'])
    expect(store.readiness().issues).toHaveLength(93)
    expect(() => store.snapshot(store.draft().revision, randomUUID())).toThrow('CATALOG_REVIEW_REQUIRED')
    expect(store.snapshots()).toEqual([])
  })
  it('persists immutable versions and exact snapshot retries across database reopen', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'emcoin-catalog-version-')), filename = path.join(directory, 'catalog.sqlite')
    let store = new CatalogStore(filename)
    store.seed(pdfCatalogDraft().map(card => ({ ...card, reviewed: true, definition: 'Synthetic content', prompt: 'Synthetic question' })))
    const requestId = randomUUID(), result = store.snapshot(1, requestId)
    const snapshot = store.readSnapshot(result.version)!
    snapshot[0].name = 'Caller mutation must not change SQLite'
    store.close()
    store = new CatalogStore(filename); resources.push({ store, directory })
    expect(store.snapshot(1, requestId)).toMatchObject({ version: result.version, revision: 2, replayed: true })
    expect(store.snapshots()).toEqual([{ version: result.version, createdAt: expect.any(Number), active: false }])
    expect(store.readSnapshot(result.version)![0].name).not.toBe(snapshot[0].name)
    expect(store.readiness().ready).toBe(true)
  })
  it('backfills source text idempotently without changing edits, reviewed cards, images or snapshots', () => {
    const store = new CatalogStore(':memory:'); resources.push({ store })
    const source = pdfCatalogDraft()
    store.seed(source.map(card => ({ ...card, prompt: '' })))
    const situations = store.draft().cards.filter(card => card.category === 'situation')
    store.save({ ...situations[0], prompt: 'Admin edit' }, store.draft().revision, randomUUID())
    store.save({ ...situations[1], reviewed: true }, store.draft().revision, randomUUID())
    store.save({ ...situations[2], frontImageUrl: '/cards/changed.webp' }, store.draft().revision, randomUUID())
    const revision = store.draft().revision
    expect(store.fillMissingContent(source)).toBe(58)
    expect(store.draft().revision).toBe(revision + 1)
    expect(store.fillMissingContent(source)).toBe(0)
    expect(store.draft().revision).toBe(revision + 1)
    const current = store.draft().cards.filter(card => card.category === 'situation')
    expect(current[0].prompt).toBe('Admin edit')
    expect(current[1].prompt).toBe('')
    expect(current[2].prompt).toBe('')
    expect(current[3].prompt).toBe(source.find(card => card.id === current[3].id)!.prompt)
    expect(store.snapshots()).toEqual([])
  })
  it('retains publication, pinned readers and exact activation retries across SQLite reopen', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'emcoin-catalog-published-')), filename = path.join(directory, 'catalog.sqlite')
    let store = new CatalogStore(filename)
    store.seed(pdfCatalogDraft().map(card => ({ ...card, reviewed: true })))
    const version = store.snapshot(1, randomUUID()).version, requestId = randomUUID()
    store.activate(version, 2, requestId); store.close()
    store = new CatalogStore(filename); resources.push({ store, directory })
    expect(store.activeVersion()).toBe(version)
    expect(store.readPublished(version)).toHaveLength(100)
    expect(store.activate(version, 2, requestId)).toMatchObject({ version, revision: 3, replayed: true })
    store.activate(null, 3, randomUUID())
    expect(store.activeVersion()).toBeNull()
    expect(store.readPublished(version)).toHaveLength(100)
  })
  it('reviews only exact source content and preserves all admin-modified/unfilled/retired cards', () => {
    const store = open(), source = pdfCatalogDraft(), first = store.draft().cards.slice(0, 4)
    store.save({ ...first[0], name: 'Custom title' }, store.draft().revision, randomUUID())
    store.save({ ...first[1], definition: '' }, store.draft().revision, randomUUID())
    store.save({ ...first[2], faceText: { front: 'Custom front', back: '' } }, store.draft().revision, randomUUID())
    store.save({ ...first[3], archived: true }, store.draft().revision, randomUUID())
    const revision = store.draft().revision
    expect(store.reviewMatchingSource(source)).toBe(96)
    expect(store.draft().revision).toBe(revision + 1)
    expect(store.reviewMatchingSource(source)).toBe(0)
    expect(store.draft().revision).toBe(revision + 1)
    expect(store.draft().cards.slice(0,4).every(card => !card.reviewed)).toBe(true)
    expect(store.readiness().ready).toBe(false)
    expect(store.activeVersion()).toBeNull()
  })
  it('persists metadata and retry receipts across actual database close/reopen', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'emcoin-catalog-')), filename = path.join(directory, 'catalog.sqlite')
    let store = new CatalogStore(filename)
    store.seed(pdfCatalogDraft())
    const card = { ...store.draft().cards[0], definition: 'Nội dung thử nghiệm' }, requestId = randomUUID()
    store.save(card, 1, requestId); store.close()
    store = new CatalogStore(filename); resources.push({ store, directory })
    expect(store.draft().cards[0].definition).toBe(card.definition)
    expect(store.save(card, 1, requestId).replayed).toBe(true)
  })
  it.each(['http://res.cloudinary.com/a/image/upload/x', 'https://evil.invalid/x.webp', '/emcoin/decks/../private.webp',
    '//evil.invalid/x.webp', 'data:image/png;base64,x', 'https://user:secret@res.cloudinary.com/a/image/upload/x'])('rejects unsafe media target %s', value => {
    expect(validImageUrl(value)).toBe(false)
    expect(() => parseCatalogCard({ ...pdfCatalogDraft()[0], frontImageUrl: value })).toThrow('INVALID_CATALOG_CARD')
  })
  it('bounds content/unknown fields and accepts versioned Cloudinary/local media without fetching it', () => {
    expect(validImageUrl('https://res.cloudinary.com/owned/image/upload/v1/card.webp')).toBe(true)
    expect(() => parseCatalogCard({ ...pdfCatalogDraft()[0], definition: 'x'.repeat(4001) })).toThrow()
    expect(() => parseCatalogCard({ ...pdfCatalogDraft()[0], arbitrary: true })).toThrow()
  })
})
