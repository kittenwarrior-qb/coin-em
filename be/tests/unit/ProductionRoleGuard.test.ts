import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { RoleManager } from '../../src/modules/game/engine/RoleManager'
import { createMockRoom } from '../helpers/mockData'
import { Role } from '../../src/modules/game/types'

describe('production persisted debug preferences', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })
  it('ignores debug roles saved before a production restart', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DEBUG_ROLE_PICKER', 'true')
    const room = createMockRoom(7, { debugRolePickerEnabled: true })
    room.players[1].debugPreferredRole = Role.SILENCER
    const assign = vi.spyOn(RoleManager.prototype, 'assignRoles')
    expect(new GameEngine().startGame(room).success).toBe(true)
    expect(assign).toHaveBeenCalledWith(room.players, {})
  })
})
