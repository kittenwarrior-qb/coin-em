import { CARD_DATA } from '@/constants/cardCatalog'

// Public frozen-web faces only. Never derive hidden roles or rewrite a CardData.
const cards = [...CARD_DATA.roles, ...CARD_DATA.situation, ...CARD_DATA.emotion,
  ...CARD_DATA.reflection, ...CARD_DATA.selfcare]
const records = new Map(cards.map(card => [card.id, Object.freeze({
  version: 'protected-card-assets/v1' as const,
  cardId: card.id, frontImage: card.frontImage, backImage: card.backImage,
  scope: 'protected-card-related' as const, crop: 'unchanged' as const,
  fallback: null, cache: 'on-demand-not-PWA-cache' as const,
  reskinStatus: 'excluded-owner-protection' as const,
})]))

/** Unknown legacy IDs remain unknown; no aliases, replacement URL or new fallback. */
export function protectedCardAssets(id: unknown) {
  return typeof id === 'string' ? records.get(id) : undefined
}

/** Detached outer list of immutable public records, for coverage verification. */
export function protectedCardAssetRecords() { return [...records.values()] }
