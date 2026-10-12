import type { CardData, SelectedCards, GamePhase } from '@/stores/types'
import type { RoomState } from './types'

type GameLogEntry = NonNullable<RoomState['gameLog']>[number]
const rollbackRank: Partial<Record<GamePhase, number>> = {
  night: 0, 'situation-card': 0, 'emotion-card': 1, 'reflection-card': 2, 'selfcare-card': 3,
}

export function selectedCardsFromLogs(logs: GameLogEntry[]): SelectedCards {
  return logs.reduce<SelectedCards>((cards, entry) => {
    if (entry.type === 'PHASE_CHANGED' && entry.data?.direction === 'previous') {
      const rank = entry.data.phase && Object.prototype.hasOwnProperty.call(rollbackRank, entry.data.phase) ? rollbackRank[entry.data.phase] : undefined
      if (rank === undefined) return cards
      return {
        ...(rank > 0 && cards.situation ? { situation: cards.situation } : {}),
        ...(rank > 1 && cards.emotion ? { emotion: cards.emotion } : {}),
        reflections: rank > 2 ? cards.reflections : [],
      }
    }
    if (entry.type !== 'SELECT_CARD' && entry.type !== 'SELECT_SELFCARE_CARD') return cards

    const card = entry.data?.card as CardData | undefined
    if (!card?.category) return cards

    if (card.category === 'situation') return { ...cards, situation: card }
    if (card.category === 'emotion') return { ...cards, emotion: card }
    if (card.category === 'reflection') {
      if (cards.reflections.some((existing) => existing.id === card.id)) return cards
      return { ...cards, reflections: [...cards.reflections, card].slice(0, 3) }
    }
    if (card.category === 'selfcare') return { ...cards, selfcare: card }

    return cards
  }, { reflections: [] })
}
