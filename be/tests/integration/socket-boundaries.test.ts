import { afterEach, describe, expect, it, vi } from 'vitest'
import { io as connect, Socket } from 'socket.io-client'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { roomRepository } from '../../src/modules/room'
import { createMockRoom } from '../helpers/mockData'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { redisClient } from '../../src/redis'
import { loadRooms } from '../../src/persistence'
import { roomView } from '../../src/modules/game/services/RoomView'

describe('production socket admission and terminal boundaries', () => {
  let server: Awaited<ReturnType<typeof createIsolatedServer>> | undefined
  const clients: Socket[] = []
  afterEach(async () => {
    clients.forEach(client => client.disconnect())
    await server?.close()
    roomRepository.clear()
  })
  async function client() {
    const socket = connect(server!.url, { transports: ['websocket'], reconnection: false })
    clients.push(socket)
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject) })
    return socket
  }
  function action(socket: Socket, event: string, payload: unknown): Promise<any> {
    return new Promise((resolve, reject) => socket.timeout(2000).emit(event, payload, (error: Error | null, ack: unknown) => error ? reject(error) : resolve(ack)))
  }
  it.each([true, false])('redacts private primary exceptions with callback=%s and leaves state unchanged', async withCallback => {
    server = await createIsolatedServer()
    const owner = await client()
    const room = createMockRoom(5, { id: 'redacted-primary-failure', revision: 1 })
    room.players[0].socketId = owner.id!
    roomRepository.getRawMap().set(room.id, room)
    await server.io.sockets.sockets.get(owner.id!)!.join(room.id)
    const before = JSON.stringify(room)
    const broadcast = vi.fn()
    owner.on('game_started', broadcast)
    owner.on('room_state', broadcast)
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('synthetic-private-server-path-and-token'))
    const rejected = withCallback ? await action(owner, 'start_game', { roomId: room.id })
      : await new Promise<any>(resolve => { owner.once('error', resolve); owner.emit('start_game', { roomId: room.id }) })
    expect(rejected).toEqual({ success: false, error: 'INTERNAL_ERROR', message: 'Chưa thể xác nhận thao tác. Vui lòng kiểm tra lại trạng thái phòng.' })
    expect(JSON.stringify(rejected)).not.toContain('synthetic-private')
    expect(JSON.stringify(roomRepository.findById(room.id))).toBe(before)
    expect(broadcast).not.toHaveBeenCalled()
  })
  it('returns exact committed settings projection and rejects invalid groups without another commit', async () => {
    server = await createIsolatedServer()
    const owner = await client()
    const room = createMockRoom(5, { id: 'settings-ack', revision: 1 })
    room.players[0].socketId = owner.id!
    roomRepository.getRawMap().set(room.id, room)
    const settings = { situationGroups: ['light', 'medium'], emotionGroups: ['basic', 'light'] }
    const ack = await action(owner, 'update_room_settings', { roomId: room.id, userId: room.host, settings })
    expect(ack.success).toBe(true)
    expect(ack.data).toEqual(roomView(roomRepository.findById(room.id)!, room.host))
    expect(ack.data.settings).toEqual(settings)
    expect(ack.data.revision).toBeGreaterThan(1)
    const invalid = await action(owner, 'update_room_settings', { roomId: room.id, userId: room.host, settings: { ...settings, situationGroups: ['light', 'light'] } })
    expect(invalid.success).toBe(false)
    expect(invalid.data).toBeUndefined()
    expect(roomRepository.findById(room.id)!.revision).toBe(ack.data.revision)
  })
  it('does not acknowledge settings or publish on failed primary commit', async () => {
    server = await createIsolatedServer()
    const owner = await client()
    const room = createMockRoom(5, { id: 'settings-primary-fail', revision: 1 })
    room.players[0].socketId = owner.id!
    roomRepository.getRawMap().set(room.id, room)
    await server.io.sockets.sockets.get(owner.id!)!.join(room.id)
    const broadcast = vi.fn()
    owner.on('room_state', broadcast)
    owner.on('room_settings_updated', broadcast)
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture primary unavailable'))
    const ack = await action(owner, 'update_room_settings', { roomId: room.id, userId: room.host, settings: { situationGroups: ['light'], emotionGroups: ['basic'] } })
    expect(ack.success).toBe(false)
    expect(ack.data).toBeUndefined()
    expect(roomRepository.findById(room.id)!.revision).toBe(1)
    expect(broadcast).not.toHaveBeenCalled()
  })
  it.each(['waiting', 'playing', 'ended'] as const)('acknowledges committed leave in %s preserving existing seat policy', async status => {
    server = await createIsolatedServer()
    const owner = await client()
    const initial = createMockRoom(5, { id: `leave-${status}`, revision: 1, status })
    initial.players[0].socketId = owner.id!
    roomRepository.getRawMap().set(initial.id, initial)
    const ack = await action(owner, 'leave_room', { roomId: initial.id })
    expect(ack.success).toBe(true)
    const stored = roomRepository.findById(initial.id)!
    expect(stored.revision).toBeGreaterThan(1)
    if (status === 'waiting') expect(stored.players.some(player => player.userId === initial.host)).toBe(false)
    else expect(stored.players.find(player => player.userId === initial.host)?.isDisconnected).toBe(true)
  })
  it('confirms last waiting seat leave only after strict room deletion', async () => {
    server = await createIsolatedServer()
    const owner = await client()
    const initial = createMockRoom(1, { id: 'leave-last', revision: 1 })
    initial.players[0].socketId = owner.id!
    roomRepository.getRawMap().set(initial.id, initial)
    expect((await action(owner, 'leave_room', { roomId: initial.id })).success).toBe(true)
    expect(roomRepository.findById(initial.id)).toBeNull()
  })
  it('does not confirm leave or remove the seat after primary failure', async () => {
    server = await createIsolatedServer()
    const owner = await client()
    const initial = createMockRoom(5, { id: 'leave-fail', revision: 1 })
    initial.players[0].socketId = owner.id!
    roomRepository.getRawMap().set(initial.id, initial)
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture unavailable'))
    expect((await action(owner, 'leave_room', { roomId: initial.id })).success).toBe(false)
    expect(roomRepository.findById(initial.id)!.players).toHaveLength(5)
  })
  it('fails profile confirmation without publishing or replacing profile when primary storage fails', async () => {
    server = await createIsolatedServer()
    const owner = await client()
    const room = createMockRoom(5, { id: 'profile-failure', revision: 1 })
    room.players[0].socketId = owner.id!
    roomRepository.getRawMap().set(room.id, room)
    await server.io.sockets.sockets.get(owner.id!)!.join(room.id)
    const broadcast = vi.fn()
    owner.on('room_state', broadcast)
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture primary unavailable'))
    const ack = await action(owner, 'update_profile', { roomId: room.id, userId: room.host, name: 'Not committed', avatarIndex: 1, bgIndex: 2 })
    expect(ack.success).toBe(false)
    expect(ack.data).toBeUndefined()
    expect(roomRepository.findById(room.id)!.players[0].name).toBe(room.players[0].name)
    expect(broadcast).not.toHaveBeenCalled()
  })
  it('returns committed profile projection and rejects invalid palette without changing profile', async () => {
    server = await createIsolatedServer()
    const owner = await client()
    const room = createMockRoom(5, { id: 'profile-ack', revision: 1 })
    room.players[0].socketId = owner.id!
    roomRepository.getRawMap().set(room.id, room)
    const payload = { roomId: room.id, userId: room.host, name: 'Confirmed', avatarIndex: 1, bgIndex: 2 }
    const ack = await action(owner, 'update_profile', payload)
    expect(ack.success).toBe(true)
    expect(ack.data).toEqual(roomView(roomRepository.findById(room.id)!, room.host))
    expect(ack.data.players[0].name).toBe('Confirmed')
    expect(ack.data.revision).toBeGreaterThan(1)
    const before = JSON.stringify(roomRepository.findById(room.id))
    expect((await action(owner, 'update_profile', { ...payload, bgIndex: 13 })).success).toBe(false)
    expect(JSON.stringify(roomRepository.findById(room.id))).toBe(before)
  })
  it('acknowledges start and end with the committed recipient projection, not the raw room', async () => {
    server = await createIsolatedServer()
    const seats = await Promise.all(Array.from({ length: 5 }, () => client()))
    const room = createMockRoom(5, { id: 'lifecycle-ack', revision: 1 })
    room.players = room.players.map((player, i) => ({ ...player, socketId: seats[i].id!, deviceId: `fixture-device-${i}` }))
    // Legacy fixture seats have no socket auth; retain existing membership compatibility.
    roomRepository.getRawMap().set(room.id, room)
    const started = await action(seats[0], 'start_game', { roomId: room.id })
    const committedStart = roomRepository.findById(room.id)!
    expect(started.success).toBe(true)
    expect(started.data).toEqual(roomView(committedStart, room.host))
    expect(started.data.status).toBe('playing')
    expect(started.data.revision).toBeGreaterThan(1)
    expect(JSON.stringify(started.data)).not.toContain('deviceId')
    expect(JSON.stringify(started.data)).not.toContain('sessionToken')
    const narratorIndex = committedStart.players.findIndex(player => player.userId === committedStart.currentNarrator)
    const ended = await action(seats[narratorIndex], 'end_game', { roomId: room.id })
    const committedEnd = roomRepository.findById(room.id)!
    expect(ended.success).toBe(true)
    expect(ended.data).toEqual(roomView(committedEnd, committedEnd.currentNarrator!))
    expect(ended.data.status).toBe('ended')
    expect(ended.data.phase).toBe('ended')
    expect(ended.data.revision).toBeGreaterThan(started.data.revision)
    expect(ended.data.coinCycle.closed).toBe(true)
  })

  it.each(['start_game', 'end_game'])('does not confirm %s or publish its transition after a failed primary commit', async event => {
    server = await createIsolatedServer()
    const seat = await client()
    const waiting = createMockRoom(5, { id: `fail-${event}`, revision: 1 })
    const initial = event === 'start_game' ? waiting : new GameEngine().startGame(waiting).room!
    const actorId = event === 'start_game' ? initial.host : initial.currentNarrator!
    const room = { ...initial, players: initial.players.map(player => player.userId === actorId ? { ...player, socketId: seat.id! } : player) }
    roomRepository.getRawMap().set(room.id, room)
    await server.io.sockets.sockets.get(seat.id!)!.join(room.id)
    const transition = vi.fn()
    seat.on(event === 'start_game' ? 'game_started' : 'game_ended', transition)
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture primary unavailable'))
    const ack = await action(seat, event, { roomId: room.id })
    expect(ack.success).toBe(false)
    expect(ack.data).toBeUndefined()
    expect(roomRepository.findById(room.id)!.status).toBe(room.status)
    expect(transition).not.toHaveBeenCalled()
  })
  it('rejects outsider reads, forged narrator commands and relay writes', async () => {
    server = await createIsolatedServer()
    const outsider = await client()
    const room = new GameEngine().startGame(createMockRoom(5, { id: 'boundary' })).room!
    roomRepository.getRawMap().set(room.id, room)
    const before = JSON.stringify(room)
    for (const event of ['get_room_state', 'next_turn', 'prev_turn', 'end_game', 'card_preview', 'situation_fan_state']) {
      const ack = await action(outsider, event, { roomId: room.id, userId: room.currentNarrator, activePosition: 0 })
      expect(ack.error).toBe('NOT_ROOM_MEMBER')
    }
    expect(JSON.stringify(roomRepository.findById(room.id))).toBe(before)
  })
  it('rejects malformed payloads and all mutations after end, allowing member hydration', async () => {
    server = await createIsolatedServer()
    const member = await client()
    const room = new GameEngine().startGame(createMockRoom(5, { id: 'terminal' })).room!
    const ended = { ...room, status: 'ended' as const, phase: 'ended' as const,
      players: room.players.map((p, i) => i === 0 ? { ...p, socketId: member.id! } : p) }
    roomRepository.getRawMap().set(room.id, ended)
    expect((await action(member, 'next_turn', null)).error).toBe('INVALID_PARAMS')
    expect((await action(member, 'next_turn', { roomId: '../escape' })).error).toBe('INVALID_PARAMS')
    for (const event of ['next_turn', 'prev_turn', 'give_coin', 'select_card', 'end_game', 'update_profile']) {
      expect((await action(member, event, { roomId: room.id })).error).toBe('GAME_ENDED')
    }
    const state = new Promise<any>(resolve => member.once('room_state', resolve))
    member.emit('get_room_state', { roomId: room.id })
    expect((await state).status).toBe('ended')
  })
  it('serializes actual concurrent coin events without overspending, and persists retry receipts', async () => {
    server = await createIsolatedServer()
    const sender = await client(), receiver = await client()
    const initial = new GameEngine().startGame(createMockRoom(5, { id: 'concurrent-coins' })).room!
    const senderId = initial.currentNTG!
    const target = initial.players.find(p => p.userId !== senderId)!.userId
    const room = { ...initial, phase: 'give-coins' as const, players: initial.players.map(p =>
      p.userId === senderId ? { ...p, socketId: sender.id! } : p.userId === target ? { ...p, socketId: receiver.id! } : p) }
    roomRepository.getRawMap().set(room.id, room)
    const payload = { roomId: room.id, receiverSocketId: receiver.id!, coinType: 'red', amount: 1, round: 1 }
    const receipts = await Promise.all(Array.from({ length: 25 }, (_, i) => action(sender, 'give_coin', { ...payload, requestId: `gift-${i}` })))
    expect(receipts.filter(ack => ack.success)).toHaveLength(20)
    expect(roomRepository.findById(room.id)!.coinCycle!.received[target].red).toBe(20)
    expect(roomRepository.findById(room.id)!.players.find(p => p.userId === senderId)!.coins.red).toBe(0)
    expect((await action(sender, 'give_coin', { ...payload, requestId: 'gift-0' })).success).toBe(true)
    const restored = loadRooms().get(room.id)!
    expect(restored.coinCycle!.transfers).toHaveLength(20)
    expect(restored.coinCycle!.received[target].red).toBe(20)
  })
  it('does not acknowledge or publish a gift if the primary commit fails', async () => {
    server = await createIsolatedServer()
    const sender = await client()
    const initial = new GameEngine().startGame(createMockRoom(5, { id: 'coin-commit-failure' })).room!
    const room = { ...initial, phase: 'give-coins' as const, players: initial.players.map(p => p.isSender ? { ...p, socketId: sender.id! } : p) }
    roomRepository.getRawMap().set(room.id, room)
    const before = JSON.stringify(room)
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture primary down'))
    const target = room.players.find(p => !p.isSender)!
    const ack = await action(sender, 'give_coin', { roomId: room.id, receiverSocketId: target.socketId, coinType: 'red', requestId: 'failed-gift' })
    expect(ack.success).toBe(false)
    expect(JSON.stringify(roomRepository.findById(room.id))).toBe(before)
  })
  it.each([false, true])('replays committed coin ACKs without writes/revisions/broadcasts (intervening lease=%s)', async interveningLease => {
    server = await createIsolatedServer()
    const sender = await client(), receiver = await client()
    const initial = new GameEngine().startGame(createMockRoom(5, { id: 'receipt-replay' })).room!
    const target = initial.players.find(p => p.userId !== initial.currentNTG)!
    const room = { ...initial, phase: 'give-coins' as const, players: initial.players.map(p =>
      p.userId === initial.currentNTG ? { ...p, socketId: sender.id! }
        : p.userId === target.userId ? { ...p, socketId: receiver.id! } : p) }
    roomRepository.getRawMap().set(room.id, room)
    const payload = { roomId: room.id, receiverSocketId: receiver.id!, coinType: 'red', amount: 1, round: 1, requestId: 'lost-ack' }
    await server.io.sockets.sockets.get(receiver.id!)!.join(room.id)
    await server.io.sockets.sockets.get(sender.id!)!.join(room.id)
    const broadcast = vi.fn()
    receiver.on('coin_given', broadcast)
    const rateSetting = process.env.DISABLE_RATE_LIMIT
    process.env.DISABLE_RATE_LIMIT = 'false'
    try {
      const committed = await action(sender, 'give_coin', payload)
      expect(committed.success).toBe(true)
      expect(committed.data.coinCycle.transfers).toHaveLength(1)
      const receipt = expect.objectContaining({ type: 'GIVE_COIN', actorId: room.currentNTG,
        targetId: target.userId, data: expect.objectContaining({ requestId: payload.requestId,
          round: payload.round, coinType: payload.coinType, amount: payload.amount }) })
      expect(committed.data.id).toBe(room.id)
      expect(committed.data.gameLog).toEqual(expect.arrayContaining([receipt]))
      if (interveningLease) {
        const current = roomRepository.findById(room.id)!
        await roomRepository.saveAndWait({ ...current, players: current.players.map(player => ({ ...player, lastSeenAt: Date.now() + 1 })) })
        expect(roomRepository.findById(room.id)!.revision).toBe(committed.data.revision + 1)
      }
      const snapshot = JSON.stringify(roomRepository.findById(room.id))
      const revisionBeforeReplay = roomRepository.findById(room.id)!.revision
      const writes = vi.mocked(redisClient.eval).mock.calls.length
      const replay = await action(sender, 'give_coin', payload)
      expect(replay.success).toBe(true)
      expect(replay.data.revision).toBe(revisionBeforeReplay)
      expect(replay.data.coinCycle).toEqual(committed.data.coinCycle)
      expect(replay.data.id).toBe(room.id)
      expect(replay.data.gameLog).toEqual(expect.arrayContaining([receipt]))
      expect(JSON.stringify(roomRepository.findById(room.id))).toBe(snapshot)
      expect(vi.mocked(redisClient.eval).mock.calls.length).toBe(writes)
      // This receiver's real Socket.IO connection observes only the first effect.
      const hydrated = new Promise(resolve => receiver.once('room_state', resolve))
      receiver.emit('get_room_state', { roomId: room.id })
      await hydrated
      expect(broadcast).toHaveBeenCalledOnce()
      expect((await action(sender, 'give_coin', { ...payload, amount: 2 })).error).toBe('REQUEST_ID_CONFLICT')
      expect((await action(sender, 'give_coin', { ...payload, round: 2 })).error).toBe('STALE_ROUND')
      expect((await action(sender, 'give_coin', { ...payload, requestId: 'new-gift' })).error).toBe('RATE_LIMITED')
      expect(JSON.stringify(roomRepository.findById(room.id))).toBe(snapshot)
    } finally {
      if (rateSetting === undefined) delete process.env.DISABLE_RATE_LIMIT
      else process.env.DISABLE_RATE_LIMIT = rateSetting
    }
  })
  it('ignores delayed selection callbacks from a previous entry into the same phase', async () => {
    server = await createIsolatedServer()
    const sender = await client()
    const engine = new GameEngine()
    const initial = engine.startGame(createMockRoom(5, { id: 'stale-phase-callback' })).room!
    const room = { ...initial, phase: 'situation-card' as const, players: initial.players.map(p => p.isSender ? { ...p, socketId: sender.id! } : p) }
    roomRepository.getRawMap().set(room.id, room)
    const ack = await action(sender, 'select_card', { roomId: room.id, card: { id: 'TH1', category: 'situation' } })
    expect(ack.success).toBe(true)
    const selected = roomRepository.findById(room.id)!
    const next = engine.advanceTurn(selected, selected.currentNarrator!).room!
    const reentered = engine.previousTurn(next, next.currentNarrator!).room!
    expect(reentered.phase).toBe('situation-card')
    expect(reentered.phaseInstance).not.toBe(selected.phaseInstance)
    await roomRepository.saveAndWait(reentered)
    await new Promise(resolve => setTimeout(resolve, 2200))
    expect(roomRepository.findById(room.id)!.phaseInstance).toBe(reentered.phaseInstance)
    expect(roomRepository.findById(room.id)!.phase).toBe('situation-card')
  })
})
