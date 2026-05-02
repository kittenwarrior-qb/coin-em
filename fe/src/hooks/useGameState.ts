import { useGameStore } from '../stores'

/**
 * Hook to access game state
 */
export function useGameState() {
  const gameStep = useGameStore((state) => state.gameStep)
  const selectedCards = useGameStore((state) => state.selectedCards)
  const players = useGameStore((state) => state.players)
  const myPlayer = useGameStore((state) => state.myPlayer())
  const isNarrator = useGameStore((state) => state.isNarrator())
  const isSender = useGameStore((state) => state.isSender())

  return {
    gameStep,
    selectedCards,
    players,
    myPlayer,
    isNarrator,
    isSender,
  }
}

/**
 * Hook to access game actions
 */
export function useGameActions() {
  const setGameStep = useGameStore((state) => state.setGameStep)
  const setPlayers = useGameStore((state) => state.setPlayers)
  const updatePlayer = useGameStore((state) => state.updatePlayer)
  const selectCard = useGameStore((state) => state.selectCard)
  const clearSelectedCards = useGameStore((state) => state.clearSelectedCards)
  const canSelectCard = useGameStore((state) => state.canSelectCard)

  return {
    setGameStep,
    setPlayers,
    updatePlayer,
    selectCard,
    clearSelectedCards,
    canSelectCard,
  }
}

/**
 * Hook to access UI state
 */
export function useGameUI() {
  const expandedPlayer = useGameStore((state) => state.expandedPlayer)
  const showInventory = useGameStore((state) => state.showInventory)
  const inventoryMode = useGameStore((state) => state.inventoryMode)
  const setExpandedPlayer = useGameStore((state) => state.setExpandedPlayer)
  const setShowInventory = useGameStore((state) => state.setShowInventory)
  const setInventoryMode = useGameStore((state) => state.setInventoryMode)

  return {
    expandedPlayer,
    showInventory,
    inventoryMode,
    setExpandedPlayer,
    setShowInventory,
    setInventoryMode,
  }
}
