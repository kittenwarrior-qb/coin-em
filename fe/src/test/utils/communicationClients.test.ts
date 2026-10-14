import { describe, expect, it, vi } from 'vitest'
import type { Socket } from 'socket.io-client'
import { chatRequest, invitationCode, parseChatView } from '@/features/communication/chatClient'
import { parseReports } from '@/features/admin/reportsClient'

const id = 'a1234567-1234-4123-8123-123456789abc'
export const chatFixture = () => ({ version: 'room-chat/v1', roomId: 'fixture', revision: 1, enabled: true, admitted: true,
  isHost: false, canSend: true, safetyAvailable: true, blocked: [], messages: [{ id, senderId: 'other', senderName: 'Bạn thử nghiệm', text: '<script>literal</script>', sentAt: 1000 }] })
export const reportsFixture = () => ({ version: 'chat-reports/v1', total: 1, reports: [{ id, roomId: 'fixture', reporterId: 'reporter', reason: 'unsafe', status: 'open',
  createdAt: 2000, expiresAt: 1000 + 7 * 86400000, resolvedAt: null, message: chatFixture().messages[0] }] })
describe('communication allowlisted clients', () => {
  it('removes private fields and preserves literal text', () => {
    const v = chatFixture(), parsed = parseChatView({ ...v, invitationHash: 'secret', messages: [{ ...v.messages[0], story: 'secret' }] }, 'fixture')
    expect(parsed).toEqual(v); expect(JSON.stringify(parsed)).not.toContain('secret')
    const r = reportsFixture()
    expect(parseReports({ ...r, history: 'secret', reports: [{ ...r.reports[0], fingerprint: 'secret' }] })).toEqual(r)
  })
  it.each([
    { roomId: 'different' }, { admitted: false }, { blocked: ['other'] }, { revision: -1 },
    { safetyAvailable: false }, { safetyMuted: ['other'] }, { messages: Array(101).fill(chatFixture().messages[0]) },
  ])('rejects unsafe chat projection %j', change => expect(() => parseChatView({ ...chatFixture(), ...change }, 'fixture')).toThrow())
  it.each([
    { expiresAt: 7 * 86400000 + 1001 }, { status: 'unknown' }, { reason: '__proto__' }, { resolvedAt: 10 },
    { message: { ...chatFixture().messages[0], text: 'a'.repeat(501) } },
  ])('rejects malformed selected evidence %j', change => {
    const r = reportsFixture(); expect(() => parseReports({ ...r, reports: [{ ...r.reports[0], ...change }] })).toThrow()
  })
  it('bounds reports and duplicate identifiers', () => {
    const r = reportsFixture()
    expect(() => parseReports({ ...r, total: 2, reports: [r.reports[0], r.reports[0]] })).toThrow()
    expect(() => parseReports({ ...r, total: 2001 })).toThrow()
  })
  it('generates 32 random bytes encoded as an invitation, not a room/session token', () => {
    expect(invitationCode()).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(invitationCode()).not.toBe(invitationCode())
  })
  it('does not auto retry an uncertain ACK', async () => {
    const emitWithAck = vi.fn().mockRejectedValue(Error('operation timed out'))
    const socket = { connected: true, timeout: vi.fn(() => ({ emitWithAck })) } as unknown as Socket
    await expect(chatRequest(socket, 'chat_command', { requestId: id })).rejects.toThrow('timed out')
    expect(emitWithAck).toHaveBeenCalledTimes(1)
  })
  it('does not submit when disconnected and rejects malformed success', async () => {
    const emitWithAck = vi.fn().mockResolvedValue({ secret: true })
    const socket = { connected: false, timeout: vi.fn(() => ({ emitWithAck })) } as unknown as Socket
    await expect(chatRequest(socket, 'get_chat_state', {})).rejects.toThrow('CHAT_DISCONNECTED')
    expect(emitWithAck).not.toHaveBeenCalled()
    socket.connected = true
    await expect(chatRequest(socket, 'get_chat_state', {})).rejects.toThrow('CHAT_UNCERTAIN')
  })
})
