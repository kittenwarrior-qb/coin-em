// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import manifest from '@/assets/assetManifest.json'
import projection from '@/assets/preloadAssets.json'
import { protectedCardAssets, protectedCardAssetRecords } from '@/assets/protectedCardAssets'
import { CARD_DATA } from '@/constants/cardCatalog'
// @ts-expect-error Node-only build verification helper deliberately outside the app bundle.
import { validateAssetManifest, manifestLocalPath } from '../../../scripts/assetManifestPolicy.mjs'

const baseline = JSON.parse(readFileSync('../be/src/constants/webCardBaseline.json', 'utf8'))
const clone = () => JSON.parse(JSON.stringify(manifest))
describe('versioned manifest preserves current artwork and runtime preload policy', () => {
  it('retains protected faces and the reviewed original-Friends preload projection', () => {
    const fingerprint = createHash('sha256').update(JSON.stringify({ critical: projection.critical,
      background: projection.background })).digest('hex')
    expect(fingerprint).toBe('5229ce9d204b8c80bfd1d2b6e55d2b5f7740e91299032362906fd3acc5cbd901')
    expect(validateAssetManifest(manifest, projection, baseline)).toMatchObject({
      critical: 4, background: 106, protectedFaces: 200 })
    expect(manifest.preload.every(record => record.newUrl === null && record.rights === 'unverified')).toBe(true)
    expect(manifest.protectedCardFaces.filter(record => !record.oldUrl.startsWith('/'))
      .every(record => record.sha256 === null && record.width === null && record.height === null && record.bytes === null)).toBe(true)
  })
  it('exposes all100 immutable original pairs without changing the source CardData objects', () => {
    const before = JSON.stringify(CARD_DATA)
    const cards = [...CARD_DATA.roles, ...CARD_DATA.situation, ...CARD_DATA.emotion, ...CARD_DATA.reflection, ...CARD_DATA.selfcare]
    const records = protectedCardAssetRecords()
    expect(records).toHaveLength(100)
    for (const card of cards) {
      const record = protectedCardAssets(card.id)!
      expect(record).toMatchObject({ cardId: card.id, frontImage: card.frontImage, backImage: card.backImage,
        scope: 'protected-card-related', crop: 'unchanged', fallback: null, cache: 'on-demand-not-PWA-cache' })
      expect(Object.isFrozen(record)).toBe(true)
      expect(Reflect.set(record, 'frontImage', '/replacement.png')).toBe(false)
      expect(manifest.protectedCardFaces.find(face => face.logicalId === `${card.id}:front`)?.oldUrl).toBe(record.frontImage)
      expect(manifest.protectedCardFaces.find(face => face.logicalId === `${card.id}:back`)?.oldUrl).toBe(record.backImage)
    }
    records.pop()
    expect(protectedCardAssetRecords()).toHaveLength(100)
    expect(JSON.stringify(CARD_DATA)).toBe(before)
  })
  it('does not infer aliases or faces from unknown IDs/private objects', () => {
    for (const id of ['unknown', 'TH1', '__proto__', '', null, { id: CARD_DATA.roles[0].id }]) {
      expect(protectedCardAssets(id)).toBeUndefined()
    }
  })
  it.each(['../outside.png', '//other.invalid/x.png', '/%2e%2e/outside.png', '/a/../outside.png',
    '/a\\outside.png', '/x.png?private=value', '/%invalid.png', '/x.json', '/a/%00.png']) (
    'rejects unsafe/non-image local path %s before filesystem access', value => {
      expect(() => manifestLocalPath(value)).toThrow('ASSET_MANIFEST_REVIEW_REQUIRED')
    })
  it('allows unchanged image filenames with spaces', () => {
    expect(manifestLocalPath('/emcoin/avatars/orbit/20.webp')).toBe('emcoin/avatars/orbit/20.webp')
  })
  it.each(['replacement', 'pair', 'duplicate', 'rights', 'remote-hash', 'crop', 'unknown-field']) (
    'rejects silent manifest drift: %s', mode => {
      const changed = clone()
      if (mode === 'replacement') changed.preload[0].newUrl = '/replacement.png'
      if (mode === 'pair') changed.protectedCardFaces[0].oldUrl = '/wrong.png'
      if (mode === 'duplicate') changed.preload[1] = changed.preload[0]
      if (mode === 'rights') changed.preload[0].rights = 'verified'
      if (mode === 'remote-hash') changed.protectedCardFaces.find((record: { sha256: unknown }) => record.sha256 === null).sha256 = 'a'.repeat(64)
      if (mode === 'crop') changed.protectedCardFaces[0].crop = 'cover'
      if (mode === 'unknown-field') changed.preload[0].privateData = 'must not admit'
      expect(() => validateAssetManifest(changed, projection, baseline)).toThrow('ASSET_MANIFEST_REVIEW_REQUIRED')
    })
})
