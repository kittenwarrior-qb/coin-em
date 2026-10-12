import type { RoomState, Player } from '@/components/game/types'
import type { SelectedCards } from '@/stores/types'
import { selectedCardsFromLogs } from '@/components/game/selectedCardsFromLogs'
import { displayedCoins } from './coinSummary'

/** Derived from one accepted snapshot, never accumulated from previous renders. */
export function projectGame(room: RoomState, myUserId: string, mySocketId: string) {
  const players: Player[] = room.players.map(p => ({
    id: p.socketId, // Existing command/DOM compatibility ID, not seat identity.
    userId: p.userId,
    name: p.name,
    role: p.role || 'Chưa chia vai trò',
    isMe: p.userId ? p.userId === myUserId : p.socketId === mySocketId,
    isNarrator: p.isNarrator,
    isSender: p.isSender,
    isMuted: p.isMuted || Boolean(p.userId && p.userId === room.mutedPlayer),
    isHealed: p.isHealed,
    isDisconnected: p.isDisconnected,
    disconnectedAt: p.disconnectedAt,
    avatarIndex: p.avatarIndex,
    bgIndex: p.bgIndex,
    coins: displayedCoins(room, p.userId, p.coins),
  }))
  const playersByUserId = new Map(players.filter(p => p.userId).map(p => [p.userId!, p]))
  const myPlayer = playersByUserId.get(myUserId) ?? players.find(p => p.isMe)
  const logs = room.gameLog ?? []
  const round = room.currentRound ?? 1
  const start = logs.reduce((latest, entry, index) =>
    entry.type === 'ROUND_STARTED' && entry.data?.round === round ? index : latest, -1)
  const roundLogs = logs.slice(start >= 0 ? start : 0).filter(entry =>
    entry.data?.round === undefined || entry.data.round === round)
  let selectedCards: SelectedCards = room.status === 'waiting' ? { reflections: [] } : selectedCardsFromLogs(roundLogs)
  const card = room.selectedCard
  if (room.status !== 'waiting' && card) {
    selectedCards = selectedCardsFromLogs([
      ...roundLogs,
      { type: 'SELECT_CARD', actorId: '', timestamp: 0, data: { card } },
    ])
  }
  // A rollback snapshot with no active card must not resurrect a prior selection.
  if (!card) {
    if (room.phase === 'role-reveal' || room.phase === 'night' || room.phase === 'situation-card') selectedCards = { reflections: [] }
    if (room.phase === 'emotion-card') delete selectedCards.emotion
    if (room.phase === 'reflection-card') selectedCards.reflections = []
    if (room.phase === 'selfcare-card') delete selectedCards.selfcare
  }
  return { players, playersByUserId, myPlayer, isNarrator: Boolean(myPlayer?.isNarrator), selectedCards }
}
