import { afterEach, describe, expect, it, vi } from 'vitest'
import { io as connect, Socket } from 'socket.io-client'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { roomRepository } from '../../src/modules/room'
import { PHASE_ORDER, phaseApplies } from '../../src/modules/game/engine/PhaseRegistry'
import { phaseView } from '../../src/modules/game/services/PhaseView'
import { ActionValidator } from '../../src/modules/game/engine/ActionValidator'
import catalog from '../../src/constants/webCardBaseline.json'
import { loadRooms } from '../../src/persistence'

describe('actual approved 5–10-seat full-round guest protocol', () => {
  let server: Awaited<ReturnType<typeof createIsolatedServer>>
  const clients: Socket[] = []
  afterEach(async () => {
    clients.forEach(client => client.disconnect())
    clients.length = 0
    await server?.close()
    roomRepository.clear()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })
  let roomId: string
  async function client() {
    const socket = connect(server.url, { transports: ['websocket'], reconnection: false })
    clients.push(socket)
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject) })
    return socket
  }
  function action(socket: Socket, event: string, payload: object = {}): Promise<any> {
    return new Promise((resolve, reject) => socket.timeout(3000).emit(event, { roomId, ...payload },
      (error: Error | null, ack: unknown) => error ? reject(new Error(`${event} timeout: phase=${roomRepository.findById(roomId)?.phase}, round=${roomRepository.findById(roomId)?.currentRound}, connected=${socket.connected}`)) : resolve(ack)))
  }
  it.each([5, 6, 7, 8, 9, 10])('completes all rounds for %s seats with real limits, resume and finite gifts', async count => {
    roomId = `complete-${count}-seat-fixture`
    vi.stubEnv('DISABLE_RATE_LIMIT', 'false')
    let now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    vi.spyOn(Math, 'random').mockReturnValue(0.314159)
    // Controlled domain time must not cross Engine.IO's own ping deadline.
    // This fixture does not claim production heartbeat/timeout behavior.
    server = await createIsolatedServer({ pingInterval: 120000, pingTimeout: 120000 })
    const seats = new Map<string, Socket>()
    const secrets = new Map<string, string>()
    for (let index = 0; index < count; index++) {
      const socket = await client()
      const id = `fixture-seat-${index}`
      const ack = await action(socket, 'join_room', { userId: id, name: `Fixture ${index}`, createIfMissing: index === 0 })
      expect(ack.success).toBe(true)
      seats.set(id, socket); secrets.set(id, ack.session.token)
    }
    expect((await action(seats.get('fixture-seat-0')!, 'start_game')).success).toBe(true)
    expect(roomRepository.findById(roomId)!.totalRounds).toBe(count)
    const allocation = Math.floor(20 / (count - 1))
    const reserve = 20 - allocation * (count - 1)
    const narrators = new Set<string>(), senders = new Set<string>()
    let phaseVisits = 0
    for (let round = 1; round <= count; round++) {
      let room = roomRepository.findById(roomId)!
      expect(room.currentRound).toBe(round)
      expect(room.phase).toBe('role-reveal')
      expect(room.coinCycle?.reserve).toEqual({ red: 0, green: reserve, yellow: reserve })
      expect(room.players.filter(p => p.isSender)).toHaveLength(1)
      expect(room.players.filter(p => p.isNarrator)).toHaveLength(1)
      narrators.add(room.currentNarrator!); senders.add(room.currentNTG!)
      expect(room.players.find(p => p.isSender)?.coins).toEqual({ red: 20, green: 0, yellow: 0 })
      for (const player of room.players.filter(p => !p.isSender)) expect(player.coins).toEqual({ red: 0, green: allocation, yellow: allocation })
      if (round === 5) {
        const id = room.currentNarrator!
        const old = seats.get(id)!
        const replaced = new Promise<void>(resolve => old.once('disconnect', () => resolve()))
        const replacement = await client()
        const hydrated = new Promise<any>(resolve => replacement.once('room_state', resolve))
        const ack = await action(replacement, 'reconnect_room', { userId: id, sessionToken: secrets.get(id) })
        expect(ack.success).toBe(true)
        const view = await hydrated
        expect(view.currentRound).toBe(5)
        expect(view.phaseView.version).toBe('phase-view/v1')
        secrets.set(id, ack.session.token); seats.set(id, replacement)
        await replaced
        expect(old.connected).toBe(false)
        expect(roomRepository.findById(roomId)!.players.find(p => p.userId === id)?.socketId).toBe(replacement.id)
      }
      for (const phase of PHASE_ORDER) {
        room = roomRepository.findById(roomId)!
        if (!phaseApplies(phase, room)) {
          expect(phase).toBe('healer-turn')
          expect(count).toBeLessThan(7)
          expect(room.phase).toBe('silencer-turn')
          continue
        }
        expect(room.phase, `round ${round}`).toBe(phase)
        phaseVisits++
        const narrator = seats.get(room.currentNarrator!)!
        const sender = seats.get(room.currentNTG!)!
        if (phase === 'healer-turn' || phase === 'silencer-turn') {
          expect(room.pendingAutoAdvance).toBeFalsy()
          now += 1500
          const type = phase === 'healer-turn' ? 'HEAL' : 'SILENCE'
          const capability = phase === 'healer-turn' ? 'heal' : 'silence'
          const actor = room.players.find(p => phaseView(room, p.userId)!.capabilities[capability])!
          const target = room.players.find(p => new ActionValidator().validate(room, { type, actorId: actor.userId, targetId: p.userId }).valid)!
          expect((await action(seats.get(actor.userId)!, 'night_action', { action: type, targetSocketId: target.socketId })).success).toBe(true)
          expect(roomRepository.findById(roomId)!.nightActions[type === 'HEAL' ? 'healed' : 'silenced']).toBe(true)
        }
        if (['situation-card', 'emotion-card', 'reflection-card', 'selfcare-card'].includes(phase)) {
          expect(room.pendingAutoAdvance).toBeFalsy()
          const category = phase.replace('-card', '')
          const card = catalog.cards.find(c => c.category === category)!
          const chooser = phase === 'selfcare-card'
            ? room.players.find(p => phaseView(room, p.userId)!.capabilities.selectSelfcare)!.userId : room.currentNTG!
          if (phase === 'emotion-card') {
            const before = JSON.stringify(room)
            expect((await action(seats.get(chooser)!, 'select_card', { card: { id: card.id }, type: 'SELECT_CARD' })).error).toBe('RATE_LIMITED')
            expect(JSON.stringify(roomRepository.findById(roomId))).toBe(before)
          }
          now += 1500 // Production rate limits remain enabled; no past deadline is advanced.
          const selected = await action(seats.get(chooser)!, 'select_card', { card: { id: card.id }, type: phase === 'selfcare-card' ? 'SELECT_SELFCARE_CARD' : 'SELECT_CARD' })
          expect(selected.success, selected.error).toBe(true)
        }
        if (phase === 'group-response') {
          now += 1500
          const target = room.players.find(p => !p.isSender)!
          expect((await action(seats.get(target.userId)!, 'send_response', { message: 'Phản hồi giả lập cho kiểm thử.' })).success).toBe(true)
          const payload = { receiverSocketId: target.socketId, coinType: 'red', amount: 1, requestId: `round-${round}-red`, round }
          expect((await action(sender, 'give_coin', payload)).success).toBe(true)
          const revision = roomRepository.findById(roomId)!.revision
          expect((await action(sender, 'give_coin', payload)).success).toBe(true)
          expect(roomRepository.findById(roomId)!.revision).toBe(revision)
          expect((await action(narrator, 'prev_turn')).error).toBe('COIN_CHECKPOINT_LOCKED')
        }
        if (phase === 'reflection-sharing') {
          expect((await action(sender, 'share_reflection', { message: 'Phản tư giả lập cho kiểm thử.' })).success).toBe(true)
        }
        if (phase === 'guess-silencer') {
          const voters = room.players.filter(p => phaseView(room, p.userId)!.capabilities.guessSilencer)
          const voterCount = count - 1 - (count >= 8 ? 2 : 1)
          expect(voters).toHaveLength(voterCount) // Approved deck excludes narrator and all Silencers.
          for (const voter of voters) expect((await action(seats.get(voter.userId)!, 'submit_vote', { suspectSocketId: room.players[0].socketId })).success).toBe(true)
          expect(Object.keys(roomRepository.findById(roomId)!.votes!)).toHaveLength(voterCount)
        }
        if (phase === 'give-coins' && round === 1) {
          now += 1500
          const others = room.players.filter(p => !p.isSender)
          expect((await action(seats.get(others[0].userId)!, 'give_coin', { receiverSocketId: sender.id, coinType: 'green', amount: 1, requestId: 'first-green', round })).success).toBe(true)
          expect((await action(seats.get(others[1].userId)!, 'give_coin', { receiverSocketId: others[2].socketId, coinType: 'yellow', amount: 1, requestId: 'first-yellow', round })).success).toBe(true)
        }
        if (phase === 'reward') {
          room = roomRepository.findById(roomId)!
          expect(room.coinCycle?.closed).toBe(true)
          expect(room.coinCycle?.history).toHaveLength(round)
          const received = Object.values(room.coinCycle!.history[round - 1].received)
          expect(received.reduce((n, coins) => n + coins.red, 0)).toBe(1)
          expect(received.reduce((n, coins) => n + coins.green, 0)).toBe(round === 1 ? 1 : 0)
          expect(received.reduce((n, coins) => n + coins.yellow, 0)).toBe(round === 1 ? 1 : 0)
          expect(room.players.every(p => Object.values(p.coins).every(n => n === 0))).toBe(true)
        }
        const advanced = await action(narrator, 'next_turn')
        expect(advanced.success, advanced.error).toBe(true)
      }
    }
    const ended = roomRepository.findById(roomId)!
    expect(ended.status).toBe('ended')
    expect(ended.phase).toBe('ended')
    expect(narrators.size).toBe(count); expect(senders.size).toBe(count)
    expect(phaseVisits).toBe(count * (count < 7 ? 15 : 16))
    expect(loadRooms().get(roomId)!.coinCycle?.history).toHaveLength(count)
    const before = JSON.stringify(ended)
    expect((await action(seats.get(ended.currentNarrator!)!, 'next_turn')).error).toBe('GAME_ENDED')
    expect(JSON.stringify(roomRepository.findById(roomId))).toBe(before)
  }, 30000)
})
