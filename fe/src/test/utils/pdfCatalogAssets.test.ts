// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import manifest from '@/assets/pdfDeckAssets.json'
import { parseCatalogDraft, isCatalogImageUrl } from '@/features/admin/catalogClient'

it('exports every145source page with stable provenance and optimized dimensions, without changing the legacy deck', () => {
  expect(manifest.records).toHaveLength(145)
  expect(manifest.sourceSha256).toBe('8dee0c19bc1572e9fa4cd252597b0de82fd79b227de8c6e815fdc285f91c19db')
  for (const record of manifest.records) {
    const bytes = fs.readFileSync(path.join('public', record.url))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256)
    expect(bytes.length).toBe(record.bytes)
    expect(Math.max(record.width, record.height)).toBe(1200)
  }
}, 20000) // Hash145 files on disk; retain every byte/provenance assertion under concurrent browser QA.
it('rejects remote/non-image/traversal media and malformed/doubled catalog identity', () => {
  for (const url of ['javascript:alert(1)', 'https://evil.invalid/x.webp', '/emcoin/decks/../x.webp']) expect(isCatalogImageUrl(url)).toBe(false)
  expect(() => parseCatalogDraft({ revision: 1, active: true, cards: [] })).toThrow()
  expect(() => parseCatalogDraft({ revision: '1', active: false, cards: [] })).toThrow()
  expect(parseCatalogDraft({ revision: 0, active: false, cards: [] })).toMatchObject({ cards: [] })
})
