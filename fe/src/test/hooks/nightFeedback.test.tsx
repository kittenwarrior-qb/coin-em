import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { RoomState, GameLogEntry } from '@/components/game/types'
import { useNightFeedback } from '@/features/game/controllers/useNightFeedback'

const action = (type = 'SILENCE', actorId = 'actor', timestamp = 1): GameLogEntry => ({ type, actorId, targetId: 'target', timestamp })
const room = (gameLog: GameLogEntry[] = [], patch: Partial<RoomState> = {}): RoomState => ({
  id: 'fixture', host: 'host', currentRound: 1, status: 'playing', phase: 'silencer-turn', mutedPlayer: 'target', gameLog,
  players: [{ userId: 'actor', socketId: 'actor-socket', name: 'Actor' }, { userId: 'target', socketId: 'target-socket', name: 'Target' }], ...patch,
})
afterEach(cleanup)
describe('committed night feedback controller', () => {
  it('does not replay historical action or notice on cold hydration', () => {
    const { result } = renderHook(() => useNightFeedback(room([action()]), 'host', true))
    expect(result.current.flyingActionEffect).toBeNull()
    expect(result.current.mutedNotice).toBeNull()
  })
  it('shows one newly committed event using current socket IDs, then deduplicates revisions', () => {
    const { result, rerender } = renderHook(({ snapshot }) => useNightFeedback(snapshot, 'host', true), { initialProps: { snapshot: room() } })
    const snapshot = room([action()])
    rerender({ snapshot })
    expect(result.current.flyingActionEffect).toMatchObject({ fromId: 'actor-socket', toId: 'target-socket' })
    expect(result.current.mutedNotice).toMatchObject({ name: 'Target', isMe: false, avatarIndex: 1 })
    act(() => { result.current.setFlyingActionEffect(null); result.current.setMutedNotice(null) })
    rerender({ snapshot: { ...snapshot, players: snapshot.players.map(p => ({ ...p })) } })
    expect(result.current.flyingActionEffect).toBeNull()
    expect(result.current.mutedNotice).toBeNull()
  })
  it('does not deduplicate different actors/actions merely because timestamps match', () => {
    const { result, rerender } = renderHook(({ snapshot }) => useNightFeedback(snapshot, 'host', true), { initialProps: { snapshot: room() } })
    rerender({ snapshot: room([action()]) })
    const nonce = result.current.flyingActionEffect!.nonce
    rerender({ snapshot: room([action(), action('HEAL')]) })
    expect(result.current.flyingActionEffect!.nonce).toBeGreaterThan(nonce)
    expect(result.current.flyingActionEffect!.iconSrc).toBe('/emcoin/icons/orbit/heal.svg')
  })
  it('only plays private flight for narrator or visible action actor', () => {
    const { result, rerender } = renderHook(({ snapshot, viewer }) => useNightFeedback(snapshot, viewer, false), { initialProps: { snapshot: room(), viewer: 'spectator' } })
    rerender({ snapshot: room([action('HEAL')]), viewer: 'spectator' })
    expect(result.current.flyingActionEffect).toBeNull()
    rerender({ snapshot: room(), viewer: 'actor' })
    rerender({ snapshot: room([action('HEAL')]), viewer: 'actor' })
    expect(result.current.flyingActionEffect).not.toBeNull()
  })
  it.each(['room', 'round', 'role'] as const)('rebases historical logs after changing %s scope without replay', kind => {
    const { result, rerender } = renderHook(({ snapshot, narrator }) => useNightFeedback(snapshot, 'host', narrator), { initialProps: { snapshot: room(), narrator: false } })
    const patch = kind === 'room' ? { id: 'next' } : kind === 'round' ? { currentRound: 2 } : {}
    rerender({ snapshot: room([action()], patch), narrator: kind === 'role' })
    expect(result.current.flyingActionEffect).toBeNull()
    expect(result.current.mutedNotice).toBeNull()
  })
  it('ignores missing visible actors/targets and clears terminal feedback', () => {
    const { result, rerender } = renderHook(({ snapshot }) => useNightFeedback(snapshot, 'host', true), { initialProps: { snapshot: room() } })
    rerender({ snapshot: room([action()], { players: [] }) })
    expect(result.current.flyingActionEffect).toBeNull()
    rerender({ snapshot: room([action(), action('HEAL', 'actor', 2)]) })
    expect(result.current.flyingActionEffect).not.toBeNull()
    rerender({ snapshot: room([action()], { status: 'ended', phase: 'ended' }) })
    expect(result.current.flyingActionEffect).toBeNull()
    expect(result.current.mutedNotice).toBeNull()
  })
})
