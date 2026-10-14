import { randomUUID, createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { applyChatCommand, chatView, parseChatCommand, type ChatRoom } from '../../src/communication/RoomChat'
import { createMockRoom } from '../helpers/mockData'
import { roomView } from '../../src/modules/game/services/RoomView'
import { ROOM_INACTIVITY_MS } from '../../src/retention'

const now = 10_000, invite = 'A'.repeat(43), badInvite = 'B'.repeat(43)
function fixture() {
  const room = createMockRoom(3, { id: 'chat-owned', lastActivity: now }) as ChatRoom
  room.players.forEach((player, i) => { player.userId = `member-${i}`; player.socketId = `socket-${i}`; player.name = `Synthetic member ${i}` })
  room.host = 'member-0'
  return room
}
const command = (room: ChatRoom, fields: object) => ({ requestId: randomUUID(), expectedRevision: room.chat?.revision ?? 0, ...fields })
function enabled() { const room = fixture(); return applyChatCommand(room, 'socket-0', command(room, { kind: 'enable', invitation: invite }), now) }
function admitted() { const room = enabled(); return applyChatCommand(room, 'socket-1', command(room, { kind: 'join', invitation: invite }), now) }
function send(room: ChatRoom, text = 'Mình đang lắng nghe', time = now) { return applyChatCommand(room, 'socket-1', command(room, { kind: 'send', text }), time) }

describe('invitation-only immutable chat domain; no transport enabled', () => {
  it('rejects new contact/link publications before revision, receipt, rate or activity changes', () => {
    const room = admitted(), before = JSON.stringify(room)
    for (const text of ['0901234567', 'qa@example.invalid', 'https://example.invalid']) expect(() => send(room, text)).toThrow(/CHAT_(CONTACT|LINK)_NOT_ALLOWED/)
    expect(JSON.stringify(room)).toBe(before)
    expect(send(room, 'Mình đang buồn và cần được lắng nghe').chat!.messages).toHaveLength(1)
  })
  it('keeps an existing committed receipt replayable without re-publication under a newer filter', () => {
    const room = admitted(), input = command(room, { kind: 'send', text: 'qa@example.invalid' })
    // Explicit legacy snapshot: commit happened before publication checks existed.
    const old = send(room, 'allowed')
    const fingerprint = createHash('sha256').update(JSON.stringify(Object.keys(input).sort().map(key => [key, input[key as keyof typeof input]]))).digest('hex')
    old.chat!.receipts = [{ requestId: input.requestId, actorId: 'member-1', fingerprint }]
    old.chat!.messages[0] = { ...old.chat!.messages[0], id: input.requestId, text: 'qa@example.invalid' }
    expect(applyChatCommand(old, 'socket-1', input, now + 1000)).toBe(old)
  })
  it('does not mutate gameplay, Coin, original input, or expose chat through existing room snapshots', () => {
    const room = fixture(), before = JSON.stringify(room)
    const next = applyChatCommand(room, 'socket-0', command(room, { kind: 'enable', invitation: invite }), now)
    expect(JSON.stringify(room)).toBe(before)
    const { chat, ...rest } = next
    expect(rest).toEqual(room); expect(chat).toBeDefined()
    expect(roomView(next, room.host)).not.toHaveProperty('chat')
    expect(JSON.stringify(roomView(next, room.host))).not.toContain(invite)
  })
  it('requires the host to enable and a valid invitation before a member sees or sends content', () => {
    const room = fixture()
    expect(() => applyChatCommand(room, 'socket-1', command(room, { kind: 'enable', invitation: invite }), now)).toThrow('NOT_HOST')
    const open = enabled()
    expect(chatView(open, 'socket-1', now)).toMatchObject({ enabled: true, admitted: false, messages: [] })
    expect(() => send(open)).toThrow('CHAT_INVITATION_REQUIRED')
    expect(() => applyChatCommand(open, 'socket-1', command(open, { kind: 'join', invitation: badInvite }), now)).toThrow('INVALID_CHAT_INVITATION')
    expect(chatView(admitted(), 'socket-1', now).canSend).toBe(true)
  })
  it.each(['foreign', 'disconnected', 'fixture'])('rejects %s sockets', kind => {
    const room = admitted()
    if (kind === 'disconnected') room.players[1].isDisconnected = true
    if (kind === 'fixture') room.players[1].isFake = true
    expect(() => applyChatCommand(room, kind === 'foreign' ? 'missing' : 'socket-1', command(room, { kind: 'send', text: 'Hi' }), now)).toThrow('NOT_ROOM_MEMBER')
    expect(() => chatView(room, kind === 'foreign' ? 'missing' : 'socket-1', now)).toThrow('NOT_ROOM_MEMBER')
  })
  it('rejects ended and expired rooms; reading history never extends inactivity', () => {
    const room = admitted(), activity = room.lastActivity
    chatView(room, 'socket-1', now + 1000); expect(room.lastActivity).toBe(activity)
    expect(() => chatView({ ...room, status: 'ended' }, 'socket-1', now)).toThrow('GAME_ENDED')
    expect(() => send(room, 'Hi', now + ROOM_INACTIVITY_MS)).toThrow('ROOM_EXPIRED')
    expect(() => chatView(room, 'socket-1', now + ROOM_INACTIVITY_MS)).toThrow('ROOM_EXPIRED')
  })
  it('derives sender identity from server state and retains plain text, not trusted markup', () => {
    const text = '<img src=x onerror=alert(1)>'
    const next = send(admitted(), text)
    expect(chatView(next, 'socket-0', now).messages[0]).toMatchObject({ senderId: 'member-1', senderName: 'Synthetic member 1', text })
    expect(parseChatCommand({ ...command(next, { kind: 'send', text }), senderId: 'member-0' })).toBeNull()
  })
  it('deduplicates exact retries without another timestamp/revision/message, rejects changed or foreign requests', () => {
    const room = admitted(), input = command(room, { kind: 'send', text: 'Xin chào' })
    const first = applyChatCommand(room, 'socket-1', input, now)
    expect(applyChatCommand(first, 'socket-1', input, now + 2000)).toBe(first)
    expect(() => applyChatCommand(first, 'socket-1', { ...input, text: 'Changed' }, now + 2000)).toThrow('CHAT_REQUEST_CONFLICT')
    expect(() => applyChatCommand(first, 'socket-0', input, now + 2000)).toThrow('CHAT_REQUEST_CONFLICT')
    expect(first.chat!.messages).toHaveLength(1)
  })
  it('rejects stale revision without changing the input', () => {
    const room = admitted(), before = JSON.stringify(room)
    expect(() => applyChatCommand(room, 'socket-1', { ...command(room, { kind: 'send', text: 'Hi' }), expectedRevision: 0 }, now)).toThrow('CHAT_REVISION_CONFLICT')
    expect(JSON.stringify(room)).toBe(before)
  })
  it('rate limits new messages but does not rate limit the same committed retry', () => {
    const room = admitted(), input = command(room, { kind: 'send', text: 'Hi' })
    const first = applyChatCommand(room, 'socket-1', input, now)
    expect(applyChatCommand(first, 'socket-1', input, now + 1)).toBe(first)
    expect(() => send(first, 'Again', now + 999)).toThrow('CHAT_RATE_LIMITED')
    expect(send(first, 'Again', now + 1000).chat!.messages).toHaveLength(2)
  })
  it('bounds messages and receipts; evicted retries remain stale rather than silently duplicating messages', () => {
    let room = admitted(), old: object | undefined
    for (let i = 0; i < 210; i++) {
      const input = command(room, { kind: 'send', text: String(i) }); if (!i) old = input
      room = applyChatCommand(room, 'socket-1', input, now + i * 1000)
    }
    expect(room.chat!.messages).toHaveLength(100); expect(room.chat!.receipts).toHaveLength(200)
    expect(() => applyChatCommand(room, 'socket-1', old, now + 211000)).toThrow('CHAT_REVISION_CONFLICT')
  })
  it('host mute survives gameplay silence, healing, disable and invitation rotation', () => {
    let room = admitted()
    room = applyChatCommand(room, 'socket-0', command(room, { kind: 'mute', targetId: 'member-1', value: true }), now)
    expect(chatView({ ...room, mutedPlayer: null }, 'socket-1', now).canSend).toBe(false)
    expect(() => send({ ...room, mutedPlayer: 'member-2' })).toThrow('SAFETY_MUTED')
    room = applyChatCommand(room, 'socket-0', command(room, { kind: 'disable' }), now)
    room = applyChatCommand(room, 'socket-0', command(room, { kind: 'enable', invitation: badInvite }), now)
    room = applyChatCommand(room, 'socket-1', command(room, { kind: 'join', invitation: badInvite }), now)
    expect(chatView(room, 'socket-1', now).canSend).toBe(false)
    expect(() => applyChatCommand(room, 'socket-1', command(room, { kind: 'mute', targetId: 'member-2', value: true }), now)).toThrow('NOT_HOST')
  })
  it('gameplay silence alone does not block chat and local blocks filter both live/history projections', () => {
    let room = send({ ...admitted(), mutedPlayer: 'member-1' })
    room = applyChatCommand(room, 'socket-0', command(room, { kind: 'block', targetId: 'member-1', value: true }), now)
    expect(chatView(room, 'socket-0', now).messages).toEqual([])
    expect(chatView(room, 'socket-1', now).messages).toHaveLength(1)
    expect(chatView(room, 'socket-1', now)).not.toHaveProperty('safetyMuted')
    room = applyChatCommand(room, 'socket-0', command(room, { kind: 'block', targetId: 'member-1', value: false }), now)
    expect(chatView(room, 'socket-0', now).messages).toHaveLength(1)
  })
  it('never returns invitation hashes, other users blocks or receipt fingerprints and protects copies', () => {
    const room = send(admitted()), view = chatView(room, 'socket-1', now), serialized = JSON.stringify(view)
    for (const key of ['invitationHash', 'fingerprint', 'lastSent', 'receipts', invite]) expect(serialized).not.toContain(key)
    view.messages[0].text = 'Changed only in view'; view.blocked.push('member-0')
    expect(room.chat!.messages[0].text).toBe('Mình đang lắng nghe')
    expect(room.chat!.blocks['member-1']).toBeUndefined()
  })
  it.each(['__proto__', 'constructor', 'toString'])('handles reserved record key %s without prototype bypass', id => {
    let room = enabled(); room.players[1].userId = id
    room = applyChatCommand(room, 'socket-1', command(room, { kind: 'join', invitation: invite }), now)
    room = send(room)
    expect(() => send(room, 'Again', now + 1)).toThrow('CHAT_RATE_LIMITED')
    room = applyChatCommand(room, 'socket-1', command(room, { kind: 'block', targetId: 'member-0', value: true }), now)
    expect(chatView(room, 'socket-1', now).blocked).toEqual(['member-0'])
    expect(Object.getPrototypeOf(room.chat!.blocks)).toBe(Object.prototype)
  })
  it.each([null, [], {}, { kind: 'send' }, { kind: 'send', requestId: 'bad', expectedRevision: 0, text: 'Hi' }])('rejects malformed contract %j', input => {
    expect(parseChatCommand(input)).toBeNull()
  })
  it.each(['', ' ', 'x'.repeat(501), 'bad\u0000text'])('rejects invalid message content', text => {
    const room = admitted(); expect(() => send(room, text)).toThrow('INVALID_CHAT_COMMAND')
  })
})
