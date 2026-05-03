import { useGameStore } from '../stores'

export function useGameState() {
  const gameStep      = useGameStore((s) => s.gameStep)
  const selectedCards = useGameStore((s) => s.selectedCards)
  const players       = useGameStore((s) => s.players)
  const myPlayer      = useGameStore((s) => s.myPlayer())
  const isNarrator    = useGameStore((s) => s.isNarrator())
  const isSender      = useGameStore((s) => s.isSender())
  const isNightPhase  = useGameStore((s) => s.isNightPhase())
  const isSenderPhase = useGameStore((s) => s.isSenderPhase())

  return { gameStep, selectedCards, players, myPlayer, isNarrator, isSender, isNightPhase, isSenderPhase }
}

export function useGameActions() {
  const setGameStep       = useGameStore((s) => s.setGameStep)
  const setPlayers        = useGameStore((s) => s.setPlayers)
  const updatePlayer      = useGameStore((s) => s.updatePlayer)
  const selectCard        = useGameStore((s) => s.selectCard)
  const clearSelectedCards = useGameStore((s) => s.clearSelectedCards)
  const canSelectCard     = useGameStore((s) => s.canSelectCard)

  return { setGameStep, setPlayers, updatePlayer, selectCard, clearSelectedCards, canSelectCard }
}

export function useGameUI() {
  const expandedPlayer  = useGameStore((s) => s.expandedPlayer)
  const showInventory   = useGameStore((s) => s.showInventory)
  const inventoryMode   = useGameStore((s) => s.inventoryMode)
  const setExpandedPlayer = useGameStore((s) => s.setExpandedPlayer)
  const setShowInventory  = useGameStore((s) => s.setShowInventory)
  const setInventoryMode  = useGameStore((s) => s.setInventoryMode)

  return { expandedPlayer, showInventory, inventoryMode, setExpandedPlayer, setShowInventory, setInventoryMode }
}
