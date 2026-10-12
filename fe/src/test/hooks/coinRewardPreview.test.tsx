import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useCoinRewardPreview } from '@/hooks/useCoinRewardPreview'
import type { GameLogEntry } from '@/components/game/types'

const gift = (patch: Partial<GameLogEntry> = {}): GameLogEntry => ({
  type: 'GIVE_COIN', actorId: 'sender', targetId: 'recipient', timestamp: 100,
  data: { coinType: 'red', amount: 2, requestId: 'fixture-receipt', round: 1 }, ...patch,
})
const options = (gameLog: GameLogEntry[] = []) => ({ gameLog, playerCount: 10, myUserId: 'recipient',
  activePhase: 'give-coins', roomId: 'fixture', currentRound: 1, rulesVersion: 'web-16-coin60/v1', isConnected: true })
afterEach(cleanup)
describe('finite-Coin committed receipt preview', () => {
  it('never replays historical gifts or legacy automatic bonuses on hydration/reveal', () => {
    const { result } = renderHook(() => useCoinRewardPreview(options([gift(),
      { type: 'REWARDS_CALCULATED', actorId: 'system', timestamp: 101, data: { silencerId: 'recipient', silencerFound: true, correctGuesserIds: ['recipient'] } },
      { type: 'ROLE_REWARD', actorId: 'narrator', targetId: 'recipient', timestamp: 102, data: {} },
    ])))
    expect(result.current.coinPreview).toBeNull()
    act(() => result.current.showRevealRewardPreview())
    expect(result.current.coinPreview).toBeNull()
  })
  it('shows the actual committed color and amount only once across revisions/phase revisits', () => {
    const { result, rerender } = renderHook(props => useCoinRewardPreview(props), { initialProps: options() })
    rerender(options([gift()]))
    expect(result.current.coinPreview).toEqual({ coinType: 'red', title: 'Bạn đã nhận được 2 coin đỏ' })
    act(() => result.current.setCoinPreview(null))
    rerender({ ...options([gift()]), activePhase: 'collect-coins' })
    rerender(options([gift({ timestamp: 999 })]))
    expect(result.current.coinPreview).toBeNull()
  })
  it.each(['room', 'round', 'viewer', 'reconnect'])('rebases without replay after %s', kind => {
    const { result, rerender } = renderHook(props => useCoinRewardPreview(props), { initialProps: options() })
    if (kind === 'reconnect') rerender({ ...options(), isConnected: false })
    const next = { ...options([gift()]), ...(kind === 'room' ? { roomId: 'other' } : kind === 'round' ? { currentRound: 2 } : kind === 'viewer' ? { myUserId: 'other' } : {}) }
    rerender(next)
    expect(result.current.coinPreview).toBeNull()
  })
  it('distinguishes receipts with an identical timestamp', () => {
    const { result, rerender } = renderHook(props => useCoinRewardPreview(props), { initialProps: options() })
    rerender(options([gift()]))
    act(() => result.current.setCoinPreview(null))
    rerender(options([gift(), gift({ data: { coinType: 'green', amount: 1, requestId: 'different-receipt', round: 1 } })]))
    expect(result.current.coinPreview).toEqual({ coinType: 'green', title: 'Bạn đã nhận được 1 coin xanh' })
  })
  it.each(['wrong-recipient', 'self', 'zero', 'invalid-color', 'fraction', 'over-budget', 'missing-amount', 'unknown-rules', 'ended', 'wrong-round', 'missing-receipt'])('does not infer a reward for %s', kind => {
    const { result, rerender } = renderHook(props => useCoinRewardPreview(props), { initialProps: options() })
    const data = { ...gift().data, ...(kind === 'zero' ? { amount: 0 } : kind === 'invalid-color' ? { coinType: 'purple' } : kind === 'fraction' ? { amount: 0.5 } : kind === 'over-budget' ? { amount: 21 } : kind === 'missing-amount' ? { amount: undefined } : kind === 'wrong-round' ? { round: 0 } : kind === 'missing-receipt' ? { requestId: undefined } : {}) }
    const entry = gift({ data, ...(kind === 'wrong-recipient' ? { targetId: 'other' } : kind === 'self' ? { actorId: 'recipient' } : {}) })
    rerender({ ...options([entry]), ...(kind === 'unknown-rules' ? { rulesVersion: 'unapproved' } : kind === 'ended' ? { activePhase: 'ended' } : {}) })
    expect(result.current.coinPreview).toBeNull()
  })
})
