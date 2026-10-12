import { GamePhase, Role, Room } from '../types'

/** Owner-approved web phase order. Both transition APIs use this one registry. */
export const PHASE_ORDER: readonly GamePhase[] = Object.freeze([
  'role-reveal', 'night', 'healer-turn', 'silencer-turn', 'situation-card',
  'emotion-card', 'story-telling', 'group-response', 'reflection-card',
  'reflection-sharing', 'selfcare-card', 'hug-action', 'guess-silencer',
  'reveal-silencer', 'give-coins', 'reward',
])

export function phaseApplies(phase: GamePhase, room?: Room): boolean {
  return phase !== 'healer-turn' || !room || room.players.some(p => p.originalRole === Role.HEALER || p.role === Role.HEALER)
}

export function nextPhase(phase: GamePhase, room?: Room): GamePhase {
  if (phase === 'ended') return 'ended'
  const index = PHASE_ORDER.indexOf(phase)
  if (index < 0) throw new Error(`Invalid phase: ${phase}`)
  if (phase === 'reward') return room && room.currentRound >= room.totalRounds ? 'ended' : 'role-reveal'
  for (let i = index + 1; i < PHASE_ORDER.length; i++) {
    if (phaseApplies(PHASE_ORDER[i], room)) return PHASE_ORDER[i]
  }
  throw new Error(`No next phase: ${phase}`)
}

export function previousPhase(phase: GamePhase, room?: Room): GamePhase {
  if (phase === 'ended') return 'ended'
  const index = PHASE_ORDER.indexOf(phase)
  if (index < 0) throw new Error(`Invalid phase: ${phase}`)
  for (let i = index - 1; i >= 0; i--) {
    if (phaseApplies(PHASE_ORDER[i], room)) return PHASE_ORDER[i]
  }
  return phase
}
