import { describe, expect, it } from 'vitest'
import type { Room } from '../../src/modules/game/types'
import { COMMUNICATION_POLICY, communicationAccess, normalizeCommunicationText } from '../../src/communication/policy'

const room = (overrides: Partial<Room> = {}): Room => ({
  status: 'playing', mutedPlayer: null,
  players: [{ userId: 'member', socketId: 'active' },
    { userId: 'disconnected', socketId: 'old', isDisconnected: true },
    { userId: 'fixture', socketId: 'bot', isFake: true }],
  ...overrides,
} as Room)

describe('approved room communication boundary (not a chat/voice implementation)', () => {
  it('bounds text/history/report retention and excludes recording/DM/stranger matching', () => {
    expect(COMMUNICATION_POLICY).toMatchObject({ maxTextCharacters: 500, maxRecentMessages: 100,
      reportRetentionMs: 604800000, recording: false, directMessages: false, strangerMatching: false })
    expect(Object.isFrozen(COMMUNICATION_POLICY)).toBe(true)
  })
  it.each(['foreign', 'old', 'bot'])('rejects foreign/disconnected/fixture socket %s', socketId => {
    expect(communicationAccess(room(), socketId)).toEqual({ canReceive: false, canPublish: false, error: 'NOT_ROOM_MEMBER' })
  })
  it('permits active membership but shuts down ended rooms', () => {
    expect(communicationAccess(room(), 'active')).toEqual({ canReceive: true, canPublish: true, error: null })
    expect(communicationAccess(room({ status: 'ended' }), 'active').canReceive).toBe(false)
  })
  it('game silence prevents publishing, healing restores it without clearing safety mute', () => {
    expect(communicationAccess(room({ mutedPlayer: 'member' }), 'active').error).toBe('GAME_MUTED')
    expect(communicationAccess(room({ mutedPlayer: null }), 'active').canPublish).toBe(true)
    expect(communicationAccess(room({ mutedPlayer: null }), 'active', ['member']).error).toBe('SAFETY_MUTED')
  })
  it('does not infer a mute from a different player or stale presentation flags', () => {
    expect(communicationAccess(room({ mutedPlayer: 'other' }), 'active').canPublish).toBe(true)
  })
  it.each([null, 123, {}, '', '  ', 'a'.repeat(501), 'bad\u0000text'])('rejects malformed/empty/oversized text %j', value => {
    expect(normalizeCommunicationText(value)).toBeNull()
  })
  it('keeps multilingual plain text and never treats it as rendered HTML', () => {
    expect(normalizeCommunicationText('  Mình đang lắng nghe\nBạn nhé  ')).toBe('Mình đang lắng nghe\nBạn nhé')
    expect(normalizeCommunicationText('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>')
    expect(normalizeCommunicationText('a'.repeat(500))).toHaveLength(500)
  })
})
