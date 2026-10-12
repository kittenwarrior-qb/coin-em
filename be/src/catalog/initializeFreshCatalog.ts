import { randomUUID } from 'node:crypto'
import { CatalogStore } from './CatalogStore'
import { pdfCatalogDraft } from './pdfDraft'

/** Explicit first-install command, never runtime-startup migration or overwrite. */
export function initializeFreshCatalog(store: CatalogStore) {
  if (store.draft().revision !== 0 || store.activeVersion() !== null) throw new Error('INITIAL_CATALOG_NOT_EMPTY')
  const canonical = pdfCatalogDraft()
  store.seed(canonical)
  store.reviewMatchingSource(canonical)
  if (!store.readiness().ready) throw new Error('INITIAL_CATALOG_REVIEW_REQUIRED')
  const snapshot = store.snapshot(store.draft().revision, randomUUID())
  store.activate(snapshot.version, snapshot.revision, randomUUID())
  return { version: snapshot.version, cards: canonical.length }
}
