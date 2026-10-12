import { createContext, useContext } from 'react'
import { CARD_DATA } from '@/constants/cardCatalog'
import { CARD_IMAGES, ROLE_TO_IMAGE } from '@/constants/cardImages'
import { parseCatalogDraft, type CatalogCard } from '@/features/admin/catalogClient'
import type { CardData, EmotionSubType } from '@/stores/types'

export const legacyCatalog = { data: CARD_DATA, roleImages: ROLE_TO_IMAGE, roleBack: CARD_IMAGES.roles.back }
export type RoomCatalog = typeof legacyCatalog & { metadata?: CatalogCard[]; version?: string }
export const RoomCatalogContext = createContext<RoomCatalog>(legacyCatalog)
export const useRoomCatalog = () => useContext(RoomCatalogContext)
const versionPattern = /^catalog-[a-f0-9]{64}$/
const labels: Record<string, string> = { narrator: 'Người Quản trò', sender: 'Người Trao Gửi', silencer: 'Người Im Lặng', connector: 'Người Kết Nối', opener: 'Người Gợi Mở', guide: 'Người Dẫn Lối', healer: 'Người Chữa Lành' }
export function buildRoomCatalog(cards: CatalogCard[]): RoomCatalog {
  const converted = cards.map((card): CardData => ({ id: card.id, category: card.category, frontImage: card.frontImageUrl, backImage: card.backImageUrl,
    ...(card.category === 'emotion' ? { subType: card.group as EmotionSubType } : {}) }))
  const category = (name: CardData['category']) => converted.filter(card => card.category === name)
  const group = (name: string, kind: CardData['category']) => converted.filter(card => card.category === kind && cards.find(source => source.id === card.id)?.group === name)
  if (Object.keys(labels).some(key => cards.filter(card => card.category === 'role' && card.roleKey === key).length !== 1) ||
      cards.some(card => card.archived || !card.reviewed ||
        (card.category === 'emotion' && !['basic', 'light', 'strong', 'advanced'].includes(card.group)) ||
        (card.category === 'situation' && !['light', 'medium', 'sensitive'].includes(card.group)))) throw new Error('INVALID_ROOM_CATALOG')
  return { data: { roles: category('role'), situation: category('situation'), reflection: category('reflection'), selfcare: category('selfcare'), emotion: category('emotion'),
    situationByType: { light: group('light', 'situation'), medium: group('medium', 'situation'), sensitive: group('sensitive', 'situation') },
    emotionsByType: { basic: group('basic', 'emotion'), light: group('light', 'emotion'), strong: group('strong', 'emotion'), advanced: group('advanced', 'emotion') } } as typeof CARD_DATA,
    roleImages: Object.fromEntries(cards.filter(card => card.category === 'role').map(card => [labels[card.roleKey!], card.frontImageUrl])),
    roleBack: cards.find(card => card.category === 'role')!.backImageUrl, metadata: cards }
}
async function fetchCatalogJson(path: string, signal: AbortSignal, limit: number, noStore = false): Promise<unknown> {
  const controller = new AbortController(), abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort()
  const timer = setTimeout(abort, 10000)
  try {
    const origin = import.meta.env.VITE_API_URL ?? window.location.origin
    const response = await fetch(`${origin.replace(/\/$/, '')}/api/catalog/${path}`, { signal: controller.signal, credentials: 'omit', redirect: 'error', ...(noStore ? { cache: 'no-store' as const } : {}) })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('application/json')) throw new Error('CATALOG_UNAVAILABLE')
    const reader = response.body?.getReader(); if (!reader) throw new Error('CATALOG_UNAVAILABLE')
    let length = 0, content = ''; const decoder = new TextDecoder()
    try { while (true) {
      const chunk = await reader.read(); if (chunk.done) break
      length += chunk.value.byteLength
      if (length > limit) { controller.abort(); throw new Error('CATALOG_TOO_LARGE') }
      content += decoder.decode(chunk.value, { stream: true })
    } content += decoder.decode() } finally { reader.releaseLock() }
    return JSON.parse(content)
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort) }
}
export async function fetchRoomCatalog(version: string, signal: AbortSignal): Promise<RoomCatalog> {
  if (!versionPattern.test(version)) throw new Error('INVALID_CATALOG_VERSION')
  const payload = await fetchCatalogJson(version, signal, 4 * 1024 * 1024) as { version?: unknown; cards?: unknown }
  if (!payload || typeof payload !== 'object') throw new Error('INVALID_CATALOG')
  if (payload.version !== version) throw new Error('CATALOG_VERSION_MISMATCH')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload.cards)))
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  if (`catalog-${hash}` !== version) throw new Error('CATALOG_HASH_MISMATCH')
  return { ...buildRoomCatalog(parseCatalogDraft({ revision: 0, active: false, cards: payload.cards }).cards), version }
}
export async function fetchPublicCatalog(signal: AbortSignal): Promise<RoomCatalog> {
  const pointer = await fetchCatalogJson('active', signal, 1024, true) as { version?: unknown }
  if (!pointer || typeof pointer !== 'object' || Array.isArray(pointer) || Object.keys(pointer).join('|') !== 'version' || typeof pointer.version !== 'string') throw new Error('INVALID_CATALOG_POINTER')
  if (pointer.version === 'web-card-baseline/v1') return { ...legacyCatalog, version: pointer.version }
  return fetchRoomCatalog(pointer.version, signal)
}
