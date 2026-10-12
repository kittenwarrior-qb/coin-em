import type { CatalogCard } from './CatalogStore'
export const LEGACY_CATALOG_VERSION = 'web-card-baseline/v1'
export const CATALOG_VERSION = /^catalog-[a-f0-9]{64}$/
export function assertRuntimeCatalog(cards: CatalogCard[]) {
  const keys = ['narrator', 'sender', 'silencer', 'connector', 'opener', 'guide', 'healer']
  if (keys.some(key => cards.filter(card => card.category === 'role' && card.roleKey === key).length !== 1) ||
      cards.some(card => card.category === 'role' && !keys.includes(card.roleKey ?? '')) ||
      cards.some(card => card.category === 'situation' && !['light', 'medium', 'sensitive'].includes(card.group)) ||
      cards.some(card => card.category === 'emotion' && (!['basic', 'light', 'strong', 'advanced'].includes(card.group) ||
        !card.faceText?.front.trim() || !card.faceText?.back.trim()))) throw new Error('CATALOG_RUNTIME_BINDING_REQUIRED')
}
type Source = { activeVersion(): string | null; readPublished(version: string): CatalogCard[] | null }
let source: Source | undefined
// Store owns immutable versions. Bound the process cache; misses reload the original version, never the active one.
const cache = new Map<string, CatalogCard[]>()
export function configureRuntimeCatalog(next?: Source) { source = next; cache.clear() }
export function newRoomCatalogVersion() { return source?.activeVersion() ?? LEGACY_CATALOG_VERSION }
function cachedCatalog(version: string): CatalogCard[] | null {
  if (!CATALOG_VERSION.test(version)) return null
  const found = cache.get(version)
  if (found) return found
  const cards = source?.readPublished(version)
  if (!cards) return null
  assertRuntimeCatalog(cards)
  if (cache.size >= 128) cache.delete(cache.keys().next().value!)
  cache.set(version, cards)
  return cards
}
const copyCard = (card: CatalogCard): CatalogCard => ({ ...card, sourcePages: [...card.sourcePages], faceText: card.faceText && { ...card.faceText } })
export function runtimeCatalog(version: string): CatalogCard[] | null { return cachedCatalog(version)?.map(copyCard) ?? null }
export function runtimeCatalogCard(version: string, id: string): CatalogCard | null {
  const card = cachedCatalog(version)?.find(card => card.id === id)
  return card ? copyCard(card) : null
}
