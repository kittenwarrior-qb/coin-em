import { describe, expect, it } from 'vitest'
import { displayedCoins, coinCheckpointLocked } from '../../utils/coinSummary'
import type { RoomState } from '../../components/game/types'

describe('received coin summary', () => {
  it('locks previous-phase only after a gift or collection in the finite cycle', () => {
    const empty = { version: 'coin-cycle-60/v1', closed: false, received: { player: { red: 0, green: 0, yellow: 0 } }, history: [] }
    expect(coinCheckpointLocked({})).toBe(false)
    expect(coinCheckpointLocked({ coinCycle: empty })).toBe(false)
    expect(coinCheckpointLocked({ coinCycle: { ...empty, closed: true } })).toBe(true)
    expect(coinCheckpointLocked({ coinCycle: { ...empty, received: { player: { red: 0, green: 1, yellow: 0 } } } })).toBe(true)
  })
  const received = { player: { red: 2, green: 3, yellow: 1 } }
  const room: Pick<RoomState, 'coinCycle' | 'phase' | 'status'> = {
    phase: 'reward', status: 'playing',
    coinCycle: { version: 'coin-cycle-60/v1', closed: true, received,
      history: [{ round: 1, received: { player: { red: 1, green: 0, yellow: 4 } } }, { round: 2, received }] },
  }
  it('shows receipts rather than zero collected holdings at round end', () => {
    expect(displayedCoins(room, 'player', { red: 0, green: 0, yellow: 0 })).toEqual(received.player)
  })
  it('adds closed round history without counting the current receipt twice', () => {
    expect(displayedCoins({ ...room, status: 'ended', phase: 'ended' }, 'player')).toEqual({ red: 3, green: 3, yellow: 5 })
  })
  it('shows holdings during play, without counting allocation as appreciation', () => {
    expect(displayedCoins({ ...room, phase: 'give-coins' }, 'player', { red: 0, green: 5, yellow: 5 })).toEqual({ red: 0, green: 5, yellow: 5 })
  })
  it('retains the explicit legacy balance fallback and handles absent seats', () => {
    expect(displayedCoins({ phase: 'ended', status: 'ended' }, 'player', { red: 3, green: 2, yellow: 1 })).toEqual({ red: 3, green: 2, yellow: 1 })
    expect(displayedCoins(room, undefined)).toEqual({ red: 0, green: 0, yellow: 0 })
  })
})
