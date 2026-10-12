import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { CatalogStore } from '../../src/catalog/CatalogStore'
import { registerPublicCatalogApi } from '../../src/catalog/publicCatalogApi'

/** Owned actual HTTP/SQLite API with explicit legacy rollback, no gameplay backend. */
export async function startPublicCatalogFixture() {
  const store = new CatalogStore(':memory:')
  const app = express()
  app.use(cors())
  registerPublicCatalogApi(app, () => store)
  const server = createServer(app)
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('OWNED_CATALOG_ADDRESS_MISSING')
  const url = `http://127.0.0.1:${address.port}`
  let closing: Promise<void> | undefined
  const close = () => closing ??= new Promise<void>(resolve => {
    server.closeAllConnections()
    server.close(() => { store.close(); resolve() })
  })
  return { url, env: { ...process.env, VITE_API_URL: url }, close }
}
