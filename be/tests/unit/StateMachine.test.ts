import { describe, it, expect, beforeEach } from 'vitest'
import { StateMachine } from '../../src/modules/game/engine/StateMachine'
import { GamePhase } from '../../src/modules/game/types'

const ALL_PHASES: GamePhase[] = [
  'role-reveal', 'night', 'healer-turn', 'silencer-turn',
  'situation-card', 'emotion-card', 'story-telling', 'group-response',
  'reflection-card', 'reflection-sharing', 'selfcare-card', 'hug-action',
  'guess-silencer', 'reveal-silencer', 'give-coins', 'reward',
]

describe('StateMachine', () => {
  let stateMachine: StateMachine

  beforeEach(() => {
    stateMachine = new StateMachine()
  })

  describe('transition', () => {
    it('transitions role-reveal → night', () => {
      expect(stateMachine.transition('role-reveal', 'NEXT')).toBe('night')
    })

    it('transitions reward → role-reveal (new round)', () => {
      expect(stateMachine.transition('reward', 'NEXT')).toBe('role-reveal')
    })

    it('transitions to ended from any phase via END', () => {
      ALL_PHASES.forEach(phase => {
        expect(stateMachine.transition(phase, 'END')).toBe('ended')
      })
    })

    it('throws on invalid phase', () => {
      expect(() => stateMachine.transition('invalid' as GamePhase, 'NEXT')).toThrow('Invalid phase')
    })

    it('throws on invalid event', () => {
      expect(() => stateMachine.transition('night', 'INVALID')).toThrow('Invalid transition')
    })

    it('throws on transition from ended', () => {
      expect(() => stateMachine.transition('ended', 'NEXT')).toThrow('Invalid transition')
    })
  })

  describe('canTransition', () => {
    it('returns true for valid transitions', () => {
      expect(stateMachine.canTransition('role-reveal', 'NEXT')).toBe(true)
      expect(stateMachine.canTransition('night', 'END')).toBe(true)
    })

    it('returns false for invalid transitions', () => {
      expect(stateMachine.canTransition('ended', 'NEXT')).toBe(false)
      expect(stateMachine.canTransition('night', 'INVALID')).toBe(false)
    })
  })

  describe('getValidTransitions', () => {
    it('returns NEXT and END for active phases', () => {
      const t = stateMachine.getValidTransitions('role-reveal')
      expect(t).toContain('NEXT')
      expect(t).toContain('END')
      expect(t.length).toBe(2)
    })

    it('returns empty array for ended', () => {
      expect(stateMachine.getValidTransitions('ended')).toEqual([])
    })
  })

  describe('complete phase cycle', () => {
    it('walks through all 16 phases in order', () => {
      let current: GamePhase = 'role-reveal'

      for (let i = 0; i < ALL_PHASES.length - 1; i++) {
        expect(current).toBe(ALL_PHASES[i])
        current = stateMachine.transition(current, 'NEXT')
      }

      expect(current).toBe('reward')

      // Loops back to role-reveal
      expect(stateMachine.transition(current, 'NEXT')).toBe('role-reveal')
    })
  })
})
