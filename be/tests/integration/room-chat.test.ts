import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { io as connect, type Socket } from 'socket.io-client'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { roomRepository } from '../../src/modules/room'
import type { ChatRoom } from '../../src/communication/RoomChat'
import { emitChatChange } from '../../src/socket/handlers/chatHandlers'
import { ROOM_INACTIVITY_MS } from '../../src/retention'
import { ChatReportStore } from '../../src/communication/ChatReportStore'

const invitation = 'A'.repeat(43), roomId = 'owned-chat-runtime'
describe('real guarded room chat transport with isolated mock primary', () => {
  let server: Awaited<ReturnType<typeof createIsolatedServer>> | undefined
  let reports: ChatReportStore | undefined
  const clients: Socket[] = []
  afterEach(async () => {
    vi.restoreAllMocks()
    clients.forEach(socket => socket.disconnect()); clients.length = 0
    await server?.close(); server = undefined; roomRepository.clear(); try { reports?.close() } catch { /* explicitly closed in outage test */ } reports = undefined; vi.unstubAllEnvs()
  })
  async function client() {
    const socket = connect(server!.url, { transports: ['websocket'], reconnection: false })
    clients.push(socket)
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject) })
    return socket
  }
  const action = (socket: Socket, event: string, payload: object) => new Promise<any>((resolve, reject) =>
    socket.timeout(3000).emit(event, payload, (error: Error | null, ack: unknown) => error ? reject(Error(`CHAT_FIXTURE_ACK_TIMEOUT_${event}`)) : resolve(ack)))
  const state = (socket: Socket) => action(socket, 'get_chat_state', { roomId })
  const room = () => roomRepository.findById(roomId)! as ChatRoom
  const input = (fields: object, revision = room().chat?.revision ?? 0) => ({ roomId, expectedRevision: revision, requestId: randomUUID(), ...fields })
  const command = (socket: Socket, fields: object) => action(socket, 'chat_command', input(fields))
  async function setup(flag: string | undefined) {
    if (flag === undefined) delete process.env.EMCOIN_ROOM_CHAT_ENABLED
    else vi.stubEnv('EMCOIN_ROOM_CHAT_ENABLED', flag)
    reports = new ChatReportStore(':memory:')
    server = await createIsolatedServer({ chatReports: reports })
    const host = await client(), guest = await client(), outsider = await client()
    const hostAdmission = await action(host, 'join_room', { roomId, userId: 'chat-host', name: 'Synthetic host', createIfMissing: true })
    const guestAdmission = await action(guest, 'join_room', { roomId, userId: 'chat-guest', name: 'Synthetic guest' })
    return { host, guest, outsider, hostAdmission, guestAdmission }
  }
  async function enabled() {
    const context = await setup('true')
    expect((await command(context.host, { kind: 'enable', invitation })).success).toBe(true)
    expect((await command(context.guest, { kind: 'join', invitation })).success).toBe(true)
    return context
  }
  async function nextEvent(socket: Socket, event: string, execute: () => Promise<unknown>) {
    const pending = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => { socket.off(event, receive); reject(Error('Owned chat event deadline')) }, 3000)
      const receive = (value: unknown) => { clearTimeout(timeout); resolve(value) }
      socket.once(event, receive)
    })
    await execute(); return pending
  }

  it.each([undefined, 'false', '1', 'TRUE'])('stays disabled with flag=%s without creating chat state', async flag => {
    const { host } = await setup(flag)
    expect(await state(host)).toEqual({ success: false, error: 'CHAT_DISABLED' })
    expect(await command(host, { kind: 'enable', invitation })).toEqual({ success: false, error: 'CHAT_DISABLED' })
    expect(room().chat).toBeUndefined()
  })
  it('requires an active room member and host invitation before any content can be read or sent', async () => {
    const { host, guest, outsider } = await setup('true')
    expect(await state(outsider)).toMatchObject({ success: false, error: 'NOT_ROOM_MEMBER' })
    expect(await command(outsider, { kind: 'enable', invitation })).toMatchObject({ success: false, error: 'NOT_ROOM_MEMBER' })
    expect(await command(guest, { kind: 'enable', invitation })).toEqual({ success: false, error: 'NOT_HOST' })
    await command(host, { kind: 'enable', invitation })
    expect((await state(guest)).data).toMatchObject({ admitted: false, messages: [] })
    expect(await command(guest, { kind: 'send', text: 'Not invited' })).toEqual({ success: false, error: 'CHAT_INVITATION_REQUIRED' })
    expect(await command(guest, { kind: 'join', invitation: 'B'.repeat(43) })).toEqual({ success: false, error: 'INVALID_CHAT_INVITATION' })
    expect((await command(guest, { kind: 'join', invitation })).data.canSend).toBe(true)
  })
  it('derives sender identity, confirms persistence and emits only the new-message delta', async () => {
    const { host, guest } = await enabled()
    const updates = await nextEvent(host, 'chat_update', () => command(guest, { kind: 'send', text: '<b>Plain text</b>' }))
    expect(updates).toEqual({ version: 'room-chat/v1', roomId, revision: 3,
      message: { id: expect.any(String), senderId: 'chat-guest', senderName: 'Synthetic guest', text: '<b>Plain text</b>', sentAt: expect.any(Number) } })
    expect(updates).not.toHaveProperty('messages')
    expect((await state(host)).data.messages).toHaveLength(1)
    expect(room().chat!.messages).toHaveLength(1)
  })
  it('rejects contact/link publications with closed codes and no save, receipt, activity or delivery', async () => {
    const { host, guest } = await enabled(), before = JSON.stringify(room())
    const save = vi.spyOn(roomRepository, 'saveAndWait'), delivered: unknown[] = []
    host.on('chat_update', value => delivered.push(value))
    for (const [text, error] of [['qa@example.invalid', 'CHAT_CONTACT_NOT_ALLOWED'], ['https://example.invalid', 'CHAT_LINK_NOT_ALLOWED'],
      ['090 123 4567', 'CHAT_CONTACT_NOT_ALLOWED'], ['abc\u202ecom', 'CHAT_TEXT_FORMAT_NOT_ALLOWED'],
      ['fuck', 'CHAT_PROFANITY_NOT_ALLOWED'], ['địt mẹ', 'CHAT_PROFANITY_NOT_ALLOWED']]) {
      const result = await command(guest, { kind: 'send', text }).catch(() => { throw Error(`REJECTION_ACK_TIMEOUT_${error}`) })
      expect(result).toEqual({ success: false, error })
    }
    await state(host) // queued barrier, not a guessed delivery sleep
    expect(save).not.toHaveBeenCalled(); expect(delivered).toEqual([])
    expect(JSON.stringify(room())).toBe(before); expect(reports!.list('all').total).toBe(0)
    expect((await command(guest, { kind: 'send', text: 'Mình buồn và muốn được lắng nghe' })).success).toBe(true)
  })
  it('waits for primary commit before ACK or chat delivery and keeps the room queue held', async () => {
    const { host, guest } = await enabled()
    const original = roomRepository.saveAndWait.bind(roomRepository), before = JSON.stringify(room())
    let release!: () => void, started!: () => void
    const gate = new Promise<void>(resolve => { release = resolve }), entered = new Promise<void>(resolve => { started = resolve })
    const save = vi.spyOn(roomRepository, 'saveAndWait').mockImplementationOnce(async value => { started(); await gate; return original(value) })
    const deliveries = vi.fn(); host.on('chat_update', deliveries)
    let acknowledged = false
    const first = command(guest, { kind: 'send', text: 'Waiting for commit' }).then(value => { acknowledged = true; return value })
    await entered
    const read = state(host); let hydrated = false; void read.then(() => { hydrated = true })
    await new Promise<void>(resolve => setTimeout(resolve, 30))
    expect(acknowledged).toBe(false); expect(hydrated).toBe(false); expect(deliveries).not.toHaveBeenCalled()
    expect(JSON.stringify(room())).toBe(before)
    release()
    expect((await first).success).toBe(true)
    expect((await read).data.messages).toHaveLength(1)
    expect(save).toHaveBeenCalledTimes(1)
  })
  it('rejects failed primary storage without changing state, publishing or leaking the exception', async () => {
    const { host, guest } = await enabled(), before = JSON.stringify(room())
    const broadcast = vi.fn(); host.on('chat_update', broadcast)
    vi.spyOn(roomRepository, 'saveAndWait').mockRejectedValueOnce(Error('synthetic-private-token-path'))
    expect(await command(guest, { kind: 'send', text: 'Do not publish' })).toEqual({ success: false, error: 'CHAT_UNAVAILABLE' })
    expect(JSON.stringify(room())).toBe(before); expect(broadcast).not.toHaveBeenCalled()
  })
  it('returns the exact committed retry without another primary write or delivery', async () => {
    const { host, guest } = await enabled(), payload = input({ kind: 'send', text: 'Only once' })
    await nextEvent(host, 'chat_update', () => action(guest, 'chat_command', payload))
    const before = JSON.stringify(room()), save = vi.spyOn(roomRepository, 'saveAndWait'), broadcast = vi.fn()
    host.on('chat_update', broadcast)
    expect(await action(guest, 'chat_command', payload)).toMatchObject({ success: true, replayed: true })
    expect(save).not.toHaveBeenCalled(); expect(JSON.stringify(room())).toBe(before); expect(broadcast).not.toHaveBeenCalled()
    expect(await action(guest, 'chat_command', { ...payload, text: 'Changed' })).toEqual({ success: false, error: 'CHAT_REQUEST_CONFLICT' })
  })
  it('serializes concurrent chat commands with one shared expected revision', async () => {
    const { host, guest } = await enabled(), revision = room().chat!.revision
    const results = await Promise.all([action(host, 'chat_command', input({ kind: 'send', text: 'Host' }, revision)),
      action(guest, 'chat_command', input({ kind: 'send', text: 'Guest' }, revision))])
    expect(results.filter(value => value.success)).toHaveLength(1)
    expect(results.filter(value => value.error === 'CHAT_REVISION_CONFLICT')).toHaveLength(1)
    expect(room().chat!.messages).toHaveLength(1)
  })
  it('filters blocks in deltas and history but still advances the blocked recipient revision', async () => {
    const { host, guest } = await enabled()
    await command(host, { kind: 'block', targetId: 'chat-guest', value: true })
    const delta = await nextEvent(host, 'chat_update', () => command(guest, { kind: 'send', text: 'Hidden for host' }))
    expect(delta).toEqual({ version: 'room-chat/v1', roomId, revision: 4 })
    expect((await state(host)).data.messages).toEqual([])
    expect((await state(guest)).data.messages).toHaveLength(1)
  })
  it('keeps host safety mute separate from gameplay role silence/healing', async () => {
    const { host, guest } = await enabled()
    room().mutedPlayer = 'chat-guest'
    expect((await command(guest, { kind: 'send', text: 'Game silence does not mute chat' })).success).toBe(true)
    await command(host, { kind: 'mute', targetId: 'chat-guest', value: true })
    room().mutedPlayer = null
    expect(await command(guest, { kind: 'send', text: 'Healing cannot clear safety mute' })).toEqual({ success: false, error: 'SAFETY_MUTED' })
    expect((await state(guest)).data.canSend).toBe(false)
  })
  it('rejects forged identity/extra fields and fire-and-forget commands before writing', async () => {
    const { guest } = await enabled(), before = JSON.stringify(room())
    expect(await action(guest, 'chat_command', { ...input({ kind: 'send', text: 'Forged' }), senderId: 'chat-host' }))
      .toEqual({ success: false, error: 'INVALID_CHAT_COMMAND' })
    expect(await action(guest, 'get_chat_state', { roomId, senderId: 'chat-host' })).toEqual({ success: false, error: 'INVALID_CHAT_COMMAND' })
    const failure = await nextEvent(guest, 'error', async () => { guest.emit('chat_command', input({ kind: 'send', text: 'No ack' })) })
    expect(failure).toEqual({ code: 'CHAT_ACK_REQUIRED' }); expect(JSON.stringify(room())).toBe(before)
  })
  it('supports explicit retry after authenticating a replacement socket, without authorizing the old seat', async () => {
    const { guest, guestAdmission } = await enabled(), payload = input({ kind: 'send', text: 'Before replacement' })
    await action(guest, 'chat_command', payload)
    const replacement = await client()
    expect((await action(replacement, 'reconnect_room', { roomId, userId: 'chat-guest', sessionToken: guestAdmission.session.token })).success).toBe(true)
    expect(await action(replacement, 'chat_command', payload)).toMatchObject({ success: true, replayed: true })
    expect(room().chat!.messages).toHaveLength(1)
    const connected = server!.io.sockets.sockets.get(replacement.id!)!
    connected.data.seatSession.generation--
    expect(await state(replacement)).toMatchObject({ success: false, error: 'STALE_SESSION' })
  })
  it('does not deliver snapshots to a socket with stale generation metadata', async () => {
    const { guest } = await enabled(), received = vi.fn()
    guest.on('chat_state', received)
    const socket = server!.io.sockets.sockets.get(guest.id!)!
    socket.data.seatSession.generation--
    await emitChatChange(server!.io, room(), false)
    expect(received).not.toHaveBeenCalled()
  })
  it('never includes invitation, session hash or receipt fingerprint in ACK, delta or hydration', async () => {
    const { host, guest, guestAdmission } = await enabled()
    const delta = await nextEvent(host, 'chat_update', () => command(guest, { kind: 'send', text: 'Visible text' }))
    const data = JSON.stringify([delta, await state(guest), await state(host)])
    for (const secret of [invitation, guestAdmission.session.token, room().chat!.invitationHash!, 'tokenHash', 'fingerprint', 'receipts']) expect(data).not.toContain(secret)
  })
  it('rejects ended, expired or deleted rooms rather than re-creating chat', async () => {
    const { host } = await enabled()
    room().lastActivity = Date.now() - ROOM_INACTIVITY_MS
    expect(await state(host)).toEqual({ success: false, error: 'ROOM_EXPIRED' })
    room().lastActivity = Date.now(); room().status = 'ended'
    expect(await state(host)).toMatchObject({ success: false, error: 'GAME_ENDED' })
    roomRepository.getRawMap().delete(roomId)
    expect(await state(host)).toMatchObject({ success: false, error: 'NOT_ROOM_MEMBER' })
  })
  it('stores only a selected server-authored message report without changing game/chat state', async () => {
    const { host, guest, outsider } = await enabled()
    const sent = await command(guest, { kind: 'send', text: 'Selected report evidence' }), messageId = sent.data.messages[0].id
    const requestId = randomUUID(), before = JSON.stringify(room())
    const payload = { roomId, messageId, requestId, reason: 'harassment' }
    expect(await action(host, 'report_chat_message', payload)).toEqual({ success: true, id: requestId, replayed: false })
    expect(await action(host, 'report_chat_message', payload)).toEqual({ success: true, id: requestId, replayed: true })
    expect(await action(outsider, 'report_chat_message', payload)).toMatchObject({ success: false, error: 'NOT_ROOM_MEMBER' })
    expect(await action(host, 'report_chat_message', { ...payload, text: 'Forged', senderId: 'other' })).toEqual({ success: false, error: 'INVALID_CHAT_REPORT' })
    expect(await action(host, 'report_chat_message', { ...payload, requestId: randomUUID(), messageId: randomUUID() })).toEqual({ success: false, error: 'INVALID_REPORT_TARGET' })
    expect(await action(guest, 'report_chat_message', { ...payload, requestId: randomUUID() })).toEqual({ success: false, error: 'INVALID_REPORT_TARGET' })
    expect(reports!.list('all').reports[0].message.text).toBe('Selected report evidence')
    expect(JSON.stringify(room())).toBe(before)
  })
  it('fails closed when report storage is down but keeps committed retries and host safety controls available', async () => {
    const { host, guest } = await enabled(), payload = input({ kind: 'send', text: 'Already committed' })
    await action(guest, 'chat_command', payload)
    reports!.close()
    expect((await state(guest)).data).toMatchObject({ safetyAvailable: false, canSend: false })
    expect(await action(guest, 'chat_command', payload)).toMatchObject({ success: true, replayed: true })
    // A host who has not sent before hits safety readiness, not the sender's message rate gate.
    expect(await command(host, { kind: 'send', text: 'No safety storage' })).toEqual({ success: false, error: 'CHAT_SAFETY_UNAVAILABLE' })
    expect((await command(host, { kind: 'mute', targetId: 'chat-guest', value: true })).success).toBe(true)
    expect(await action(host, 'report_chat_message', { roomId, messageId: room().chat!.messages[0].id, requestId: randomUUID(), reason: 'unsafe' }))
      .toEqual({ success: false, error: 'REPORT_UNAVAILABLE' })
    expect((await command(host, { kind: 'disable' })).success).toBe(true)
  })
  it('does not grant content reporting to an uninvited member', async () => {
    const { host, guest } = await setup('true')
    await command(host, { kind: 'enable', invitation })
    const sent = await command(host, { kind: 'send', text: 'Private invited chat' })
    expect(await action(guest, 'report_chat_message', { roomId, messageId: sent.data.messages[0].id, requestId: randomUUID(), reason: 'privacy' }))
      .toEqual({ success: false, error: 'CHAT_INVITATION_REQUIRED' })
    expect(reports!.list('all').total).toBe(0)
  })
  it('keeps a committed ACK successful when adapter delivery fails, then hydrates the missing message', async () => {
    const { host, guest } = await enabled()
    const delivery = vi.spyOn(server!.io, 'in').mockReturnValue({ fetchSockets: async () => { throw Error('synthetic-private-adapter-error') } } as never)
    const payload = input({ kind: 'send', text: 'Committed despite adapter outage' })
    const committed = await action(guest, 'chat_command', payload)
    expect(committed).toMatchObject({ success: true, replayed: false })
    // The queued read waits for both failed deliveries to finish; not an arbitrary sleep.
    expect((await state(guest)).data.messages).toHaveLength(1)
    delivery.mockRestore()
    expect((await state(host)).data.messages[0].text).toBe('Committed despite adapter outage')
    expect(await action(guest, 'chat_command', payload)).toMatchObject({ success: true, replayed: true })
    expect(room().chat!.messages).toHaveLength(1)
  })
  it('keeps actual transport rate limits enabled without rejecting committed same-ID retry', async () => {
    const { guest } = await enabled()
    vi.stubEnv('DISABLE_RATE_LIMIT', 'false')
    const payload = input({ kind: 'send', text: 'Rate-aware message' })
    expect((await action(guest, 'chat_command', payload)).success).toBe(true)
    expect(await action(guest, 'chat_command', payload)).toMatchObject({ success: true, replayed: true })
    expect(await command(guest, { kind: 'send', text: 'Too fast' })).toEqual({ success: false, error: 'CHAT_RATE_LIMITED' })
  })
})
