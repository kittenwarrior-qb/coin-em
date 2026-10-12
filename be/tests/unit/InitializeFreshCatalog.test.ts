import { expect, it } from 'vitest'
import { CatalogStore } from '../../src/catalog/CatalogStore'
import { initializeFreshCatalog } from '../../src/catalog/initializeFreshCatalog'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'

it('explicitly publishes the canonical reviewed 100-card PDF catalog before admission', () => {
  const store = new CatalogStore(':memory:')
  try {
    const result = initializeFreshCatalog(store)
    expect(result.cards).toBe(100)
    expect(store.activeVersion()).toBe(result.version)
    expect(store.readPublished(result.version)).toHaveLength(100)
    expect(store.readiness().ready).toBe(true)
    const before = store.draft()
    expect(() => initializeFreshCatalog(store)).toThrow('INITIAL_CATALOG_NOT_EMPTY')
    expect(store.draft()).toEqual(before)
    expect(store.activeVersion()).toBe(result.version)
  } finally { store.close() }
})

it('does not approve, replace or publish an existing edited draft', () => {
  const store = new CatalogStore(':memory:')
  try {
    store.seed(pdfCatalogDraft().map(card => ({ ...card, name: `Edited ${card.name}` })))
    const before = store.draft()
    expect(() => initializeFreshCatalog(store)).toThrow('INITIAL_CATALOG_NOT_EMPTY')
    expect(store.draft()).toEqual(before)
    expect(store.activeVersion()).toBeNull()
    expect(store.snapshots()).toHaveLength(0)
  } finally { store.close() }
})
