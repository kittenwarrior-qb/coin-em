import { useGameStore } from '../stores'
import type { CardData, CardCategory } from '../stores/types'

/**
 * Hook for game flow logic.
 * Phase transitions are controlled by the server via next_turn socket event.
 * This hook only handles local card selection.
 */
export function useGameFlow() {
  const gameStep = useGameStore((state) => state.gameStep)
  const selectCard = useGameStore((state) => state.selectCard)

  const handleSelectCard = (card: CardData, category: CardCategory) => {
    selectCard(card, category)
  }

  return { gameStep, handleSelectCard }
}
