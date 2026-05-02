import { useGameStore } from '../stores'
import type { CardData, CardCategory } from '../stores/types'

/**
 * Hook for game flow logic
 * Note: Phase transitions are now controlled by the server via next_turn socket event
 */
export function useGameFlow() {
  const gameStep = useGameStore((state) => state.gameStep)
  const selectCard = useGameStore((state) => state.selectCard)

  /**
   * Handle card selection
   * Auto-advance logic removed - server controls phase transitions
   */
  const handleSelectCard = (card: CardData, category: CardCategory) => {
    selectCard(card, category)
  }

  return {
    gameStep,
    handleSelectCard,
  }
}
