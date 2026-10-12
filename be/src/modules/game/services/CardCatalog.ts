import baseline from '../../../constants/webCardBaseline.json'
import { SITUATION_CARDS } from '../../../constants/cards'
import { GameAction, Role, Room } from '../types'
import { LEGACY_CATALOG_VERSION, runtimeCatalogCard } from '../../../catalog/runtimeCatalog'

export interface WebCard {
  id: string
  category: 'role' | 'situation' | 'emotion' | 'reflection' | 'selfcare'
  frontImage: string
  backImage: string
  subType?: 'basic' | 'light' | 'strong' | 'advanced'
  group?: string
}
export const WEB_CARD_BASELINE_VERSION = baseline.version
const cards = new Map<string, Readonly<WebCard>>()
const aliases = new Map<string, string>()
for (const entry of baseline.cards) {
  const card = Object.freeze({ ...entry }) as Readonly<WebCard>
  cards.set(card.id, card)
  if (card.category !== 'emotion') aliases.set(card.id.slice(card.category.length + 1), card.id)
}

/** Client URLs/text/extra properties never enter the persisted selection. */
export function resolveWebCard(input: unknown, room?: Pick<Room, 'catalogVersion'>): WebCard | null {
  const object = input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null
  const id = typeof input === 'string' ? input : object && Object.hasOwn(object, 'id') ? object.id : null
  if (typeof id !== 'string' || id.length > 64) return null
  if (room?.catalogVersion && room.catalogVersion !== LEGACY_CATALOG_VERSION) {
    const entry = runtimeCatalogCard(room.catalogVersion, id)
    if (!entry || (object && object.category !== undefined && object.category !== entry.category)) return null
    return { id: entry.id, category: entry.category, frontImage: entry.frontImageUrl, backImage: entry.backImageUrl,
      group: entry.group, ...(entry.category === 'emotion' ? { subType: entry.group as WebCard['subType'] } : {}) }
  }
  const card = cards.get(id) ?? cards.get(aliases.get(id) ?? '')
  if (!card || (object && object.category !== undefined && object.category !== card.category)) return null
  return { ...card }
}

export function isCardEnabled(room: Room, card: WebCard): boolean {
  if (card.category === 'situation') {
    if (room.catalogVersion && room.catalogVersion !== LEGACY_CATALOG_VERSION) return room.settings.situationGroups.some(group => group === card.group)
    const rawId = card.id.slice('situation-'.length)
    return room.settings.situationGroups.some(group =>
      Object.hasOwn(SITUATION_CARDS, group) && (SITUATION_CARDS[group] as readonly string[]).includes(rawId))
  }
  if (card.category === 'emotion') return !!card.subType && room.settings.emotionGroups.includes(card.subType)
  return true
}

const selectionPhaseRank: Record<string, number> = {
  night: 0, 'situation-card': 0, 'emotion-card': 1, 'reflection-card': 2, 'selfcare-card': 3,
}
const selectionCategoryRank: Record<string, number> = { situation: 0, emotion: 1, reflection: 2, selfcare: 3 }

/** Preserve audit history; selections before a relevant rollback are no longer active. */
export function activeCardSelectionLogs(room: Room, category: WebCard['category']) {
  let start = room.gameLog.reduce((latest, entry, index) =>
    entry.type === 'ROUND_STARTED' && entry.data?.round === room.currentRound ? index : latest, -1)
  for (let index = start + 1; index < room.gameLog.length; index++) {
    const entry = room.gameLog[index]
    if (entry.type === 'PHASE_CHANGED' && entry.data?.direction === 'previous' &&
      Object.hasOwn(selectionPhaseRank, entry.data.phase) &&
      selectionPhaseRank[entry.data.phase] <= selectionCategoryRank[category]) start = index
  }
  return room.gameLog.slice(start + 1).filter(entry =>
    entry.data?.round === undefined || entry.data.round === room.currentRound)
}

export function validateCardSelection(room: Room, action: GameAction): { valid: boolean; error?: string } {
  const reject = (error: string) => ({ valid: false, error })
  if (room.status !== 'playing') return reject('GAME_NOT_PLAYING')
  const actor = room.players.find(player => player.userId === action.actorId)
  if (!actor) return reject('Actor not found')
  if (!action.data?.card) return reject('No card data')
  if (action.type === 'SELECT_SELFCARE_CARD') {
    if (room.phase !== 'selfcare-card') return reject('Not selfcare-card phase')
    if (room.nightActions.cardSelected) return reject('ACTION_ALREADY_DONE')
    const guide = room.players.find(player => player.originalRole === Role.GUIDE && !player.isFake)
    if (guide ? actor.userId !== guide.userId : !actor.isSender) return reject('NOT_SELFCARE_ACTOR')
  } else if (action.type === 'SELECT_CARD') {
    if (!actor.isSender || actor.userId !== room.currentNTG) return reject('Not a sender')
    if (!['situation-card', 'emotion-card', 'reflection-card'].includes(room.phase)) return reject('NOT_CARD_PHASE')
  } else return reject('INVALID_CARD_ACTION')
  const card = resolveWebCard(action.data.card, room)
  if (!card) return reject('UNKNOWN_OR_MISMATCHED_CARD')
  const category = { 'situation-card': 'situation', 'emotion-card': 'emotion', 'reflection-card': 'reflection', 'selfcare-card': 'selfcare' }[room.phase as string]
  if (card.category !== category) return reject('WRONG_CARD_CATEGORY')
  if (!isCardEnabled(room, card)) return reject('CARD_GROUP_DISABLED')
  const selections = activeCardSelectionLogs(room, card.category).filter(entry => entry.type === action.type)
  if (selections.some(entry => entry.data?.card?.category === category && !resolveWebCard(entry.data.card, room))) return reject('UNSUPPORTED_SELECTION_REQUIRES_REVIEW')
  const selected = selections
    .map(entry => resolveWebCard(entry.data?.card, room)).filter((entry): entry is WebCard => !!entry && entry.category === category)
  if (selected.some(entry => entry.id === card.id)) return reject('CARD_ALREADY_SELECTED')
  if (card.category === 'reflection' && selected.length >= 3) return reject('REFLECTION_LIMIT_REACHED')
  if (card.category === 'situation' && selected.length) return reject('CARD_ALREADY_SELECTED')
  return { valid: true }
}
