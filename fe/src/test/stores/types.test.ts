import { describe, it, expect } from 'vitest'
import { NIGHT_PHASES, SENDER_PHASES, PHASE_LABELS } from '../../stores/types'
import type { GamePhase } from '../../stores/types'

describe('NIGHT_PHASES', () => {
  it('contains night, healer-turn, silencer-turn', () => {
    expect(NIGHT_PHASES).toContain('night')
    expect(NIGHT_PHASES).toContain('healer-turn')
    expect(NIGHT_PHASES).toContain('silencer-turn')
  })

  it('does not contain day phases', () => {
    expect(NIGHT_PHASES).not.toContain('situation-card')
    expect(NIGHT_PHASES).not.toContain('reward')
  })
})

describe('SENDER_PHASES', () => {
  it('contains all NTG action phases', () => {
    const expected: GamePhase[] = [
      'situation-card', 'emotion-card', 'story-telling',
      'group-response', 'reflection-card', 'reflection-sharing',
      'selfcare-card', 'hug-action',
    ]
    for (const p of expected) {
      expect(SENDER_PHASES).toContain(p)
    }
  })

  it('does not contain night or reward', () => {
    expect(SENDER_PHASES).not.toContain('night')
    expect(SENDER_PHASES).not.toContain('reward')
  })
})

describe('PHASE_LABELS', () => {
  it('has a label for every GamePhase', () => {
    const allPhases: GamePhase[] = [
      'role-reveal', 'night', 'healer-turn', 'silencer-turn',
      'situation-card', 'emotion-card', 'story-telling', 'group-response',
      'reflection-card', 'reflection-sharing', 'selfcare-card', 'hug-action',
      'guess-silencer', 'reveal-silencer', 'give-coins', 'reward', 'ended',
    ]
    for (const phase of allPhases) {
      expect(PHASE_LABELS[phase]).toBeTruthy()
    }
  })
})
