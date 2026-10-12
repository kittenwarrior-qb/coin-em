import { afterEach, expect, it } from 'vitest'
import express from 'express'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'
import { CatalogStore } from '../../src/catalog/CatalogStore'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'
import { registerPublicCatalogApi } from '../../src/catalog/publicCatalogApi'
let store: CatalogStore | undefined, server: Server | undefined
afterEach(async () => { if (server?.listening) await new Promise<void>(resolve => server!.close(() => resolve())); store?.close() })
it('serves only published immutable snapshots, retains previous versions after rollback and never exposes drafts', async () => {
  store = new CatalogStore(':memory:'); store.seed(pdfCatalogDraft().map(card => ({ ...card, reviewed: true })))
  const version = store.snapshot(1, randomUUID()).version
  const app = express(); registerPublicCatalogApi(app, () => store)
  server = createServer(app); await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/catalog`
  expect((await fetch(`${base}/${version}`)).status).toBe(404)
  expect((await fetch(`${base}/draft`)).status).toBe(404)
  const initial = await fetch(`${base}/active`)
  expect(initial.headers.get('cache-control')).toBe('no-store')
  expect(await initial.json()).toEqual({ version: 'web-card-baseline/v1' })
  store.activate(version, 2, randomUUID())
  expect(await (await fetch(`${base}/active`)).json()).toEqual({ version })
  const response = await fetch(`${base}/${version}`)
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  expect(response.headers.get('etag')).toBe(`"${version}"`)
  const body = await response.json(); expect(body.cards).toHaveLength(100)
  expect(body.version).toBe(version)
  expect(body).not.toHaveProperty('revision')
  store.activate(null, 3, randomUUID())
  expect(await (await fetch(`${base}/active`)).json()).toEqual({ version: 'web-card-baseline/v1' })
  expect(await (await fetch(`${base}/${version}`)).json()).toEqual(body)
  const notFound = await fetch(`${base}/catalog-${'f'.repeat(64)}`)
  expect(notFound.status).toBe(404); expect(notFound.headers.get('cache-control')).toBe('no-store')
})
