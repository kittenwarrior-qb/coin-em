import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/modules/room', () => ({
  roomRepository: { findById: vi.fn() },
  roomService: { addFakePlayers: vi.fn() },
}))
vi.mock('../../src/socket/handlers/playerHandlers', () => ({ cancelDisconnectTimer: vi.fn() }))

import { roomRepository, roomService } from '../../src/modules/room'
import { registerRoomHandlers } from '../../src/socket/handlers/roomHandlers'

describe('release debug guardrails', () => {
  let handlers: Record<string, (payload: any) => void>
  let emit: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.clearAllMocks()
    handlers = {}
    emit = vi.fn()
    registerRoomHandlers({} as any, {
      id: 'host-socket', emit,
      on: (event: string, handler: (payload: any) => void) => { handlers[event] = handler },
    } as any)
  })
  afterEach(() => vi.unstubAllEnvs())

  it.each(['add_fake_players', 'set_debug_role_preference'])('rejects %s in production even with debug enabled', (event) => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DEBUG_ROLE_PICKER', 'true')
    handlers[event]({ roomId: 'fixture', count: 1 })
    expect(emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: expect.stringContaining('disabled') }))
    expect(roomRepository.findById).not.toHaveBeenCalled()
    expect(roomService.addFakePlayers).not.toHaveBeenCalled()
  })

  it('rejects a non-host debug bot caller before mutation', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.mocked(roomRepository.findById).mockReturnValue({ host: 'owner', players: [{ userId: 'guest', socketId: 'host-socket' }] } as any)
    handlers.add_fake_players({ roomId: 'fixture', count: 1 })
    expect(emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'not_host' }))
    expect(roomService.addFakePlayers).not.toHaveBeenCalled()
  })

  it.each([0, -1, 1.5, 11, '2'])('rejects invalid bot count %s', (count) => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.mocked(roomRepository.findById).mockReturnValue({ host: 'owner', players: [{ userId: 'owner', socketId: 'host-socket' }] } as any)
    handlers.add_fake_players({ roomId: 'fixture', count })
    expect(emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'invalid_params' }))
    expect(roomService.addFakePlayers).not.toHaveBeenCalled()
  })
})
