import type { Express } from 'express'
import type { CatalogStore } from './CatalogStore'
import { CATALOG_VERSION, LEGACY_CATALOG_VERSION } from './runtimeCatalog'
export function registerPublicCatalogApi(app: Express, getStore: () => CatalogStore | undefined) {
  // Mutable pointer must never inherit the immutable version response's cache policy.
  app.get('/api/catalog/active', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    try {
      const store = getStore()
      if (!store) { response.status(503).json({ error: 'CATALOG_UNAVAILABLE' }); return }
      const active = store.activeVersion()
      if (active !== null && (!CATALOG_VERSION.test(active) || !store.readPublished(active))) throw new Error('CATALOG_UNAVAILABLE')
      response.json({ version: active ?? LEGACY_CATALOG_VERSION })
    } catch { response.status(503).json({ error: 'CATALOG_UNAVAILABLE' }) }
  })
  app.get('/api/catalog/:version', (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    if (!CATALOG_VERSION.test(request.params.version)) { response.status(404).setHeader('Cache-Control', 'no-store'); response.json({ error: 'CATALOG_NOT_FOUND' }); return }
    try {
      const store = getStore()
      if (!store) { response.status(503).setHeader('Cache-Control', 'no-store'); response.json({ error: 'CATALOG_UNAVAILABLE' }); return }
      const cards = store.readPublished(request.params.version)
      if (!cards) { response.status(404).setHeader('Cache-Control', 'no-store'); response.json({ error: 'CATALOG_NOT_FOUND' }); return }
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      response.setHeader('ETag', `"${request.params.version}"`)
      response.json({ version: request.params.version, cards })
    } catch { response.status(503).setHeader('Cache-Control', 'no-store'); response.json({ error: 'CATALOG_UNAVAILABLE' }) }
  })
}
