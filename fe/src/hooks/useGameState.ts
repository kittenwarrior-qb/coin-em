import { useGameStore } from '../stores'
import { useMemo, useState, useCallback } from 'react'
import type { RoomState, Player } from '@/components/game/types'
import type { CardCategory } from '@/stores/types'
import { projectGame } from '@/utils/gameProjection'

/** The transport already owns revision admission. This hook is read-only. */
export function useProjectedGameState(room: RoomState, myUserId: string, mySocketId: string) {
  return useMemo(() => projectGame(room, myUserId, mySocketId), [room, myUserId, mySocketId])
}

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
  const clearSelectedCard = useGameStore((s) => s.clearSelectedCard)
  const canSelectCard     = useGameStore((s) => s.canSelectCard)

  return { setGameStep, setPlayers, updatePlayer, selectCard, clearSelectedCards, clearSelectedCard, canSelectCard }
}

export function useGameUI(players: Player[]) {
  const [focus, setFocus] = useState<{ userId?: string; socketId: string } | null>(null)
  const [showInventory, setShowInventory] = useState(false)
  const [inventoryMode, setInventoryMode] = useState<{ category?: CardCategory; showConfirm: boolean }>({ showConfirm: false })
  const expandedPlayer = focus ? players.find(player =>
    focus.userId ? player.userId === focus.userId : !player.userId && player.id === focus.socketId) ?? null : null
  const setExpandedPlayer = useCallback((player: Player | null) => {
    setFocus(player ? { userId: player.userId, socketId: player.id } : null)
  }, [])

  return { expandedPlayer, showInventory, inventoryMode, setExpandedPlayer, setShowInventory, setInventoryMode }
}
