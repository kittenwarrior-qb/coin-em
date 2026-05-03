import { describe, it, expect, beforeEach } from 'vitest'
import { ActionValidator } from '../../src/modules/game/engine/ActionValidator'
import { createPlayingRoom, setRoomPhase } from '../helpers/mockData'

describe('ActionValidator — NTG_VOTE, SEND_RESPONSE, SHARE_REFLECTION', () => {
  let validator: ActionValidator

  beforeEach(() => {
    validator = new ActionValidator()
  })

  // ── SEND_RESPONSE ──────────────────────────────────────────────────────────

  describe('validate SEND_RESPONSE', () => {
    it('accepts valid response in group-response phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'group-response')
      const player = room.players[2]

      const result = validator.validate(room, {
        type: 'SEND_RESPONSE',
        actorId: player.userId,
        data: { message: 'Tôi cảm thấy đồng cảm với bạn.' },
      })

      expect(result.valid).toBe(true)
    })

    it('rejects response in wrong phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'night')
      const player = room.players[2]

      const result = validator.validate(room, {
        type: 'SEND_RESPONSE',
        actorId: player.userId,
        data: { message: 'hello' },
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Not group-response phase')
    })

    it('rejects response with no message', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'group-response')
      const player = room.players[2]

      const result = validator.validate(room, {
        type: 'SEND_RESPONSE',
        actorId: player.userId,
        data: {},
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('No message provided')
    })
  })

  // ── NTG_VOTE ───────────────────────────────────────────────────────────────

  describe('validate NTG_VOTE', () => {
    it('accepts valid NTG vote in group-response phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'group-response')
      const ntg = room.players.find(p => p.isSender)!
      const target = room.players.find(p => !p.isSender)!

      const result = validator.validate(room, {
        type: 'NTG_VOTE',
        actorId: ntg.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(true)
    })

    it('rejects vote from non-NTG player', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'group-response')
      const nonNTG = room.players.find(p => !p.isSender)!
      const target = room.players.find(p => p.userId !== nonNTG.userId)!

      const result = validator.validate(room, {
        type: 'NTG_VOTE',
        actorId: nonNTG.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ONLY_NTG_CAN_VOTE')
    })

    it('rejects vote in wrong phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reflection-card')
      const ntg = room.players.find(p => p.isSender)!
      const target = room.players.find(p => !p.isSender)!

      const result = validator.validate(room, {
        type: 'NTG_VOTE',
        actorId: ntg.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Not group-response phase')
    })

    it('rejects duplicate NTG vote for same target', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'group-response')
      const ntg = room.players.find(p => p.isSender)!
      const target = room.players.find(p => !p.isSender)!

      // Already voted for this target (array format)
      room.ntgVotes = { [ntg.userId]: [target.userId] } as any

      const result = validator.validate(room, {
        type: 'NTG_VOTE',
        actorId: ntg.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ALREADY_VOTED_FOR_THIS_PLAYER')
    })

    it('allows NTG to vote multiple different players', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'group-response')
      const ntg = room.players.find(p => p.isSender)!
      const target1 = room.players.find(p => !p.isSender && !p.isNarrator)!
      const target2 = room.players.find(p => !p.isSender && !p.isNarrator && p.userId !== target1.userId)!

      // Already voted for target1
      room.ntgVotes = { [ntg.userId]: [target1.userId] } as any

      // Can still vote for target2
      const result = validator.validate(room, {
        type: 'NTG_VOTE',
        actorId: ntg.userId,
        targetId: target2.userId,
      })

      expect(result.valid).toBe(true)
    })

    it('rejects NTG voting for self', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'group-response')
      const ntg = room.players.find(p => p.isSender)!

      const result = validator.validate(room, {
        type: 'NTG_VOTE',
        actorId: ntg.userId,
        targetId: ntg.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Cannot vote for self')
    })
  })

  // ── SHARE_REFLECTION ───────────────────────────────────────────────────────

  describe('validate SHARE_REFLECTION', () => {
    it('accepts valid share in reflection-sharing phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reflection-sharing')
      const ntg = room.players.find(p => p.isSender)!

      const result = validator.validate(room, {
        type: 'SHARE_REFLECTION',
        actorId: ntg.userId,
        data: { message: 'Tôi chọn thẻ này vì...' },
      })

      expect(result.valid).toBe(true)
    })

    it('rejects share from non-NTG player', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reflection-sharing')
      const nonNTG = room.players.find(p => !p.isSender)!

      const result = validator.validate(room, {
        type: 'SHARE_REFLECTION',
        actorId: nonNTG.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ONLY_NTG_CAN_SHARE')
    })

    it('rejects share in wrong phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reflection-card')
      const ntg = room.players.find(p => p.isSender)!

      const result = validator.validate(room, {
        type: 'SHARE_REFLECTION',
        actorId: ntg.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Not reflection-sharing phase')
    })
  })
})
