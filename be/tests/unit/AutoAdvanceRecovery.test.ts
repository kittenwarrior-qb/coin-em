import { afterEach, describe, expect, it, vi } from 'vitest'
import { startAutoAdvanceScheduler } from '../../src/socket/AutoAdvanceScheduler'
import { roomRepository } from '../../src/modules/room/repository/RoomRepository'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { createMockRoom } from '../helpers/mockData'
import { loadRooms } from '../../src/persistence'

describe('persisted after-action deadline recovery', () => {
  let stop: (() => Promise<void>) | undefined
  afterEach(async () => { await stop?.(); roomRepository.clear(); vi.useRealTimers() })
  function fixture() {
    const room = { ...new GameEngine().startGame(createMockRoom(5, { id: 'deadline-fixture' })).room!, phase: 'emotion-card' as const }
    return { ...room, pendingAutoAdvance: { kind: 'card' as const, dueAt: Date.now() + 1000,
      phase: room.phase, phaseInstance: room.phaseInstance, round: room.currentRound, narratorId: room.currentNarrator! } }
  }
  it('reloads a persisted deadline and commits one transition, clearing the deadline', async () => {
    vi.useFakeTimers()
    const room = fixture()
    await roomRepository.saveAndWait(room)
    roomRepository.clear()
    roomRepository.load(loadRooms())
    const emit = vi.fn()
    stop = startAutoAdvanceScheduler({ in: () => ({ fetchSockets: async () => [{ id: room.players[0].socketId, data: {}, emit }] }) } as any)
    await vi.advanceTimersByTimeAsync(1500)
    const recovered = roomRepository.findById(room.id)!
    expect(recovered.phase).toBe('story-telling')
    expect(recovered.phaseInstance).not.toBe(room.phaseInstance)
    expect(recovered.pendingAutoAdvance).toBeNull()
    expect(emit).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(3000)
    expect(emit).toHaveBeenCalledTimes(1)
  })
  it.each(['instance', 'round', 'narrator', 'terminal'])('ignores an obsolete %s deadline', async mismatch => {
    vi.useFakeTimers()
    const room = fixture()
    if (mismatch === 'instance') room.pendingAutoAdvance.phaseInstance = 'obsolete'
    if (mismatch === 'round') room.pendingAutoAdvance.round++
    if (mismatch === 'narrator') room.pendingAutoAdvance.narratorId = 'former-narrator'
    const candidate = mismatch === 'terminal' ? { ...room, status: 'ended' as const } : room
    roomRepository.getRawMap().set(room.id, candidate)
    const emit = vi.fn()
    stop = startAutoAdvanceScheduler({ in: () => ({ fetchSockets: async () => [] }) } as any)
    await vi.advanceTimersByTimeAsync(2000)
    expect(emit).not.toHaveBeenCalled()
    expect(roomRepository.findById(room.id)!.phase).toBe('emotion-card')
  })
  it('does not enable general phase timeouts and tears down its interval', async () => {
    vi.useFakeTimers()
    const room = new GameEngine().startGame(createMockRoom(5)).room!
    roomRepository.getRawMap().set(room.id, room)
    const emit = vi.fn()
    stop = startAutoAdvanceScheduler({ in: () => ({ fetchSockets: async () => [] }) } as any)
    await vi.advanceTimersByTimeAsync(60000)
    expect(roomRepository.findById(room.id)!.phase).toBe('role-reveal')
    expect(emit).not.toHaveBeenCalled()
    await stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
