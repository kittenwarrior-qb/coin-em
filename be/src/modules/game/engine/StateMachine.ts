import { GamePhase } from '../types'

/**
 * StateMachine — mirrors TurnManager phase order.
 * Used for validation; actual transitions driven by TurnManager.getNextPhase().
 */
export class StateMachine {
  private transitions: Map<GamePhase, Map<string, GamePhase>>

  constructor() {
    this.transitions = new Map([
      ['role-reveal',        new Map([['NEXT', 'night'],            ['END', 'ended']])],
      ['night',              new Map([['NEXT', 'healer-turn'],      ['END', 'ended']])],
      ['healer-turn',        new Map([['NEXT', 'silencer-turn'],    ['END', 'ended']])],
      ['silencer-turn',      new Map([['NEXT', 'situation-card'],   ['END', 'ended']])],
      ['situation-card',     new Map([['NEXT', 'emotion-card'],     ['END', 'ended']])],
      ['emotion-card',       new Map([['NEXT', 'story-telling'],    ['END', 'ended']])],
      ['story-telling',      new Map([['NEXT', 'group-response'],   ['END', 'ended']])],
      ['group-response',     new Map([['NEXT', 'reflection-card'],  ['END', 'ended']])],
      ['reflection-card',    new Map([['NEXT', 'reflection-sharing'],['END', 'ended']])],
      ['reflection-sharing', new Map([['NEXT', 'selfcare-card'],    ['END', 'ended']])],
      ['selfcare-card',      new Map([['NEXT', 'hug-action'],       ['END', 'ended']])],
      ['hug-action',         new Map([['NEXT', 'guess-silencer'],   ['END', 'ended']])],
      ['guess-silencer',     new Map([['NEXT', 'reveal-silencer'],  ['END', 'ended']])],
      ['reveal-silencer',    new Map([['NEXT', 'give-coins'],       ['END', 'ended']])],
      ['give-coins',         new Map([['NEXT', 'reward'],           ['END', 'ended']])],
      ['reward',             new Map([['NEXT', 'role-reveal'],      ['END', 'ended']])],
      ['ended',              new Map()],
    ])
  }

  transition(currentPhase: GamePhase, event: string): GamePhase {
    const map = this.transitions.get(currentPhase)
    if (!map) throw new Error(`Invalid phase: ${currentPhase}`)
    const next = map.get(event)
    if (!next) throw new Error(`Invalid transition: ${currentPhase} → ${event}`)
    return next
  }

  canTransition(currentPhase: GamePhase, event: string): boolean {
    return this.transitions.get(currentPhase)?.has(event) ?? false
  }

  getValidTransitions(currentPhase: GamePhase): string[] {
    const map = this.transitions.get(currentPhase)
    return map ? Array.from(map.keys()) : []
  }
}
