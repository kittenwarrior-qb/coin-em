import type { Player } from '@/components/game/types'
import type { GamePhase, SelectedCards } from '@/stores/types'

interface CountdownInputs {
  players: Player[]
  currentRound: number
  phase: GamePhase
  healerDone: boolean
  silencerDone: boolean
  healerRole: string
  silencerRole: string
  isNarrator: boolean
  selectedCards: SelectedCards
  selfcareActor?: string | null
}

/** Presentation eligibility only: expiry never authorizes a game action. */
export function turnCountdown(input: CountdownInputs) {
  const { players, currentRound, phase, healerDone, silencerDone, healerRole,
    silencerRole, isNarrator, selectedCards, selfcareActor } = input
  const baseKey = `${currentRound}-${phase}-${healerDone}-${silencerDone}-${selectedCards.situation?.id ?? 'no-situation'}-${selectedCards.emotion?.id ?? 'no-emotion'}-${selectedCards.selfcare?.id ?? 'no-selfcare'}`
  const keyFor = (player: Player): string | null => {
    if (phase === 'role-reveal' || phase === 'night') return player.isNarrator ? `${baseKey}-narrator` : null
    if (phase === 'healer-turn') {
      if (!healerDone && player.role === healerRole && (isNarrator || player.isMe)) return `${baseKey}-${player.id}`
      return healerDone && player.isNarrator ? `${baseKey}-narrator` : null
    }
    if (phase === 'silencer-turn') {
      if (!silencerDone && player.role === silencerRole && (isNarrator || player.isMe)) return `${baseKey}-${player.id}`
      return silencerDone && player.isNarrator ? `${baseKey}-narrator` : null
    }
    if (phase === 'situation-card') return (!selectedCards.situation ? player.isSender : player.isNarrator) ? baseKey : null
    if (phase === 'emotion-card') return (!selectedCards.emotion ? player.isSender : player.isNarrator) ? baseKey : null
    if (phase === 'story-telling' || phase === 'reflection-sharing') return player.isSender ? baseKey : null
    if (phase === 'reflection-card') return selectedCards.reflections.length < 3 && player.isSender ? baseKey : null
    if (phase === 'selfcare-card') return !selectedCards.selfcare && player.userId === selfcareActor ? baseKey : null
    return null
  }
  return { key: players.map(keyFor).find(Boolean) ?? null, keyFor, duration: phase === 'story-telling' ? 60 : 30 }
}
