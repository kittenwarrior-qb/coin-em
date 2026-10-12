import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import { startDisconnectedRoomCleanup, stopDisconnectedRoomCleanup } from '../../src/socket/handlers/playerHandlers'
import { roomService } from '../../src/modules/room'
import { ROOM_CLEANUP_INTERVAL_MS } from '../../src/retention'

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })
const fakeServer = () => {
  const emit = vi.fn(), leave = vi.fn()
  const io = { to: vi.fn(() => ({ emit })), in: vi.fn(() => ({ socketsLeave: leave })) } as unknown as Server
  return { io, emit, leave }
}
describe('one-minute committed room cleanup lifecycle', () => {
  it('publishes closure only after awaited deletion, avoids overlapping ticks and drains on stop', async () => {
    vi.useFakeTimers()
    const { io, emit, leave } = fakeServer()
    let finish!: (value: string[]) => void
    const cleanup = vi.spyOn(roomService, 'cleanupDisconnectedRooms').mockImplementation(() => new Promise(resolve => { finish = resolve }))
    startDisconnectedRoomCleanup(io)
    startDisconnectedRoomCleanup(io)
    await vi.advanceTimersByTimeAsync(ROOM_CLEANUP_INTERVAL_MS * 2)
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(emit).not.toHaveBeenCalled()
    let stopped = false
    const stop = stopDisconnectedRoomCleanup(io).then(() => { stopped = true })
    await Promise.resolve()
    expect(stopped).toBe(false)
    finish(['expired-fixture'])
    await stop
    expect(emit).toHaveBeenCalledWith('room_closed', { roomId: 'expired-fixture', reason: 'inactive_timeout' })
    expect(leave).toHaveBeenCalledWith('expired-fixture')
    await vi.advanceTimersByTimeAsync(ROOM_CLEANUP_INTERVAL_MS * 2)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
  it('does not announce deletion on primary failure and retries on the next tick', async () => {
    vi.useFakeTimers()
    const { io, emit } = fakeServer()
    const cleanup = vi.spyOn(roomService, 'cleanupDisconnectedRooms').mockRejectedValueOnce(new Error('fixture unavailable')).mockResolvedValueOnce([])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    startDisconnectedRoomCleanup(io)
    await vi.advanceTimersByTimeAsync(ROOM_CLEANUP_INTERVAL_MS * 2)
    await stopDisconnectedRoomCleanup(io)
    expect(cleanup).toHaveBeenCalledTimes(2)
    expect(emit).not.toHaveBeenCalled()
  })
})
