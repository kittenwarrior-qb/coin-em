import type { CardData, SelectedCards } from '@/stores/types'
import type { RoomState } from './types'

type GameLogEntry = NonNullable<RoomState['gameLog']>[number]

export function selectedCardsFromLogs(logs: GameLogEntry[]): SelectedCards {
  return logs.reduce<SelectedCards>((cards, entry) => {
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
