import { describe, expect, it } from 'vitest'
import { turnCountdown } from '@/features/game/selectors/turnCountdown'
import { GAME_ROLES, PHASE_LABELS, type GamePhase } from '@/stores/types'
import type { Player } from '@/components/game/types'
import { CARD_DATA } from '@/constants/cardCatalog'

const player = (id: string, extra: Partial<Player> = {}): Player => ({ id, userId: id, name: id,
  role: '', isMe: false, coins: { red: 0, green: 0, yellow: 0 }, ...extra })
const players = [player('narrator', { isNarrator: true }), player('sender', { isSender: true }),
  player('healer', { role: GAME_ROLES.healer }), player('silencer', { role: GAME_ROLES.silencer }), player('chooser')]
const base = { players, currentRound: 2, phase: 'night' as GamePhase, healerDone: false, silencerDone: false,
  healerRole: GAME_ROLES.healer, silencerRole: GAME_ROLES.silencer, isNarrator: true, selectedCards: { reflections: [] }, selfcareActor: 'chooser' }
const visible = ['role-reveal', 'night', 'healer-turn', 'silencer-turn', 'situation-card', 'emotion-card',
  'story-telling', 'reflection-card', 'reflection-sharing', 'selfcare-card']

describe('existing local countdown eligibility', () => {
  it.each(Object.keys(PHASE_LABELS) as GamePhase[])('preserves initial %s visibility and duration without mutating input', phase => {
    const input = { ...base, phase }, before = JSON.stringify(input)
    const result = turnCountdown(input)
    expect(Boolean(result.key)).toBe(visible.includes(phase))
    expect(result.duration).toBe(phase === 'story-telling' ? 60 : 30)
    expect(JSON.stringify(input)).toBe(before)
  })
  it.each(['healer-turn', 'silencer-turn'] as const)('exposes %s role timer only to narrator or that player, then switches to narrator', phase => {
    expect(turnCountdown({ ...base, phase, isNarrator: false }).key).toBeNull()
    const role = phase === 'healer-turn' ? GAME_ROLES.healer : GAME_ROLES.silencer
    const mine = players.map(p => ({ ...p, isMe: p.role === role }))
    expect(turnCountdown({ ...base, players: mine, phase, isNarrator: false }).key).toMatch(new RegExp(`-${phase === 'healer-turn' ? 'healer' : 'silencer'}$`))
    const done = phase === 'healer-turn' ? { healerDone: true } : { silencerDone: true }
    expect(turnCountdown({ ...base, ...done, phase, isNarrator: false }).key).toMatch(/-narrator$/)
  })
  it('uses admitted selection IDs, stops at three reflections and completed selfcare', () => {
    const selectedCards = { situation: CARD_DATA.situation[0], emotion: CARD_DATA.emotion[0],
      selfcare: CARD_DATA.selfcare[0], reflections: CARD_DATA.reflection.slice(0, 3) }
    expect(turnCountdown({ ...base, phase: 'emotion-card', selectedCards }).key).toContain(selectedCards.emotion.id)
    expect(turnCountdown({ ...base, phase: 'reflection-card', selectedCards }).key).toBeNull()
    expect(turnCountdown({ ...base, phase: 'selfcare-card', selectedCards }).key).toBeNull()
    expect(turnCountdown({ ...base, phase: 'selfcare-card', selfcareActor: 'missing' }).key).toBeNull()
  })
  it('never reconstructs a missing participant or role from hidden data', () => {
    expect(turnCountdown({ ...base, players: [] }).key).toBeNull()
    expect(turnCountdown({ ...base, phase: 'healer-turn', players: [players[1]] }).key).toBeNull()
  })
})
