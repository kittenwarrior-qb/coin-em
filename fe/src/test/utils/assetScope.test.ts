// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
// @ts-expect-error Node-only inventory helper intentionally stays outside the app bundle.
import { classifyAsset, protectedCardFaces } from '../../../scripts/assetScope.mjs'

describe('owner-protected inventory, not licensing or a physical migration', () => {
  it('protects card-related/source-derived records and fails closed for unknown scope', () => {
    for (const url of ['/cards/vai-tro/VT1.webp', '/card-showcase/role/back.webp', '/tutorial/1.webp', '/stickers/vui-ve.webp', '/models/characters/vui-ve.glb']) expect(classifyAsset(url)).toBe('protected-card-related')
    expect(classifyAsset('https://cdn.invalid/unknown.png', ['src/constants/cardImages.ts'])).toBe('protected-card-related')
    expect(classifyAsset('/cartoon/buttons/pill/Green.png')).toBe('ui-reskin-candidate')
    expect(classifyAsset('/cartoon/ui/Panel-Teal.png')).toBe('ui-reskin-candidate')
    for (const url of ['/logo.svg', '/coins/do.png', '/%invalid', 'https://cdn.invalid/cartoon/buttons/a.png', 'file:///cartoon/buttons/a.png', '//cdn.invalid/cartoon/ui/Panel.png', 'javascript:/cartoon/ui/Panel.png']) expect(classifyAsset(url)).toBe('review-required')
  })
  it('preserves all100 exact face pairs without generating fallback, crop, new art or private caches', () => {
    const baseline = JSON.parse(readFileSync('../be/src/constants/webCardBaseline.json', 'utf8'))
    const before = JSON.stringify(baseline)
    const faces = protectedCardFaces(baseline)
    expect(faces).toHaveLength(200)
    expect(new Set(faces.map((record: { logicalId: string }) => record.logicalId)).size).toBe(200)
    for (const [index, card] of baseline.cards.entries()) {
      expect(faces[index * 2]).toMatchObject({ cardId: card.id, face: 'front', oldUrl: card.frontImage, newUrl: null, fallback: null, crop: 'unchanged', cache: 'on-demand-not-PWA-cache', reskinStatus: 'excluded-owner-protection' })
      expect(faces[index * 2 + 1]).toMatchObject({ cardId: card.id, face: 'back', oldUrl: card.backImage })
    }
    expect(createHash('sha256').update(JSON.stringify(baseline)).digest('hex')).toBe(createHash('sha256').update(before).digest('hex'))
    expect(() => protectedCardFaces({ ...baseline, cards: baseline.cards.slice(1) })).toThrow()
    expect(() => protectedCardFaces({ ...baseline, cards: baseline.cards.map((card: object) => ({ ...card, id: 'duplicate' })) })).toThrow()
  })
})
