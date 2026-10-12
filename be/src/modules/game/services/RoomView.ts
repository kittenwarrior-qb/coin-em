import { Room, Role } from '../types'
import { publicPlayer } from '../../../socket/SeatSession'
import { resolveWebCard } from './CardCatalog'
import { ROOM_INACTIVITY_MS } from '../../../retention'
import { phaseView } from './PhaseView'

const PRIVATE_LOG_TYPES = new Set(['SILENCE', 'HEAL', 'HEALER_BONUS', 'VOTE'])

/** One allowlisted wire snapshot for join, resume, hydration, ACK and events. */
export function roomView(room: Room, viewerId?: string) {
  const viewer = room.players.find(p => p.userId === viewerId)
  const narrator = !!viewer?.isNarrator
  const revealed = ['reveal-silencer', 'give-coins', 'reward', 'ended'].includes(room.phase)
  const guide = room.players.find(p => p.originalRole === Role.GUIDE && !p.isFake)
  const votingComplete = room.players.filter(p => !p.isNarrator && p.originalRole !== Role.SILENCER && p.role !== Role.SILENCER)
    .every(p => !!room.votes[p.userId])
  const disconnected = room.players.filter(p => !p.isFake)
  const resumeExpiresAt = disconnected.length && disconnected.every(p => p.isDisconnected && p.disconnectedAt != null)
    ? Math.min(Math.max(...disconnected.map(p => p.disconnectedAt!)) + 2 * 60 * 60 * 1000, room.lastActivity + ROOM_INACTIVITY_MS)
    : room.lastActivity + ROOM_INACTIVITY_MS
  return {
    id: room.id, catalogVersion: room.catalogVersion, rulesVersion: room.rulesVersion, coinCycle: room.coinCycle,
    host: room.host, status: room.status, phase: room.phase,
    phaseInstance: room.phaseInstance, revision: room.revision, turn: room.turn,
    phaseView: phaseView(room, viewerId),
    currentRound: room.currentRound, totalRounds: room.totalRounds,
    roundLimit: room.roundLimit ?? null,
    currentNTG: room.currentNTG, currentNarrator: room.currentNarrator,
    mutedPlayer: room.mutedPlayer, selectedCard: resolveWebCard(room.selectedCard, room),
    settings: room.settings, resumeExpiresAt,
    players: room.players.map(p => {
      const baseRole = p.originalRole ?? p.role
      const role = p.isNarrator ? Role.NARRATOR : p.isSender ? Role.SENDER
        : baseRole === Role.NARRATOR || baseRole === Role.SENDER ? undefined : baseRole
      const privateVisible = narrator || p.userId === viewerId
      return { ...publicPlayer(p),
        role: privateVisible || p.isNarrator || p.isSender || (revealed && role === Role.SILENCER) ? role : undefined,
        ...(privateVisible ? { originalRole: p.originalRole } : {}),
        ...(room.status === 'waiting' && room.debugRolePickerEnabled && viewerId === room.host
          ? { debugPreferredRole: p.debugPreferredRole } : {}),
      }
    }),
    gameLog: room.gameLog.filter(entry => !PRIVATE_LOG_TYPES.has(entry.type) || narrator || entry.actorId === viewerId)
      .map(entry => entry.type === 'SELECT_CARD' || entry.type === 'SELECT_SELFCARE_CARD'
        ? { type: entry.type, actorId: entry.actorId, timestamp: entry.timestamp,
          data: { card: resolveWebCard(entry.data?.card, room), ...(Number.isSafeInteger(entry.data?.round) ? { round: entry.data.round } : {}) } }
        : entry),
    nightActions: room.nightActions,
    votes: room.phase === 'guess-silencer' && !narrator && !votingComplete ? Object.fromEntries(Object.entries(room.votes).filter(([id]) => id === viewerId)) : room.votes,
    ntgVotes: room.ntgVotes,
    selfcareActor: room.phase === 'selfcare-card' || narrator ? guide?.userId ?? room.currentNTG : null,
    debugRolePickerEnabled: room.debugRolePickerEnabled,
  }
}
