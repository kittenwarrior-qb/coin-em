import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { performance } from 'node:perf_hooks'
import { LOAD_POLICY, automaticLoadPhase, automaticTransition, fixtureRoomIds, latencySummary, rateLimitWait } from './load-policy.mjs'
const require = createRequire(import.meta.url)
const { io } = require('socket.io-client')
const { PHASE_ORDER } = require('../dist/modules/game/engine/PhaseRegistry.js')
const catalog = require('../src/constants/webCardBaseline.json')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Target must be the URL allocated by the owning topology, never an environment URL.
export async function runLoadStage(url, count, runId, signal, cycle = 0) {
  assert([1, LOAD_POLICY.rooms].includes(count), 'INVALID_ROOM_COUNT')
  const roomIds = fixtureRoomIds(runId, count, cycle)
  const sockets = new Set(), ackSamples = [], readSamples = []
  const stats = { rooms: count, seats: count * LOAD_POLICY.seats, phaseVisits: 0, completedRounds: 0,
    receiptReplays: 0, expectedRejections: 0, reconnects: 0, convergedSeats: 0, unexpectedErrors: 0, liveCleanupRefusals: 0,
    replayPresenceCommits: 0, hydrationPresenceCommits: 0, automaticTransitions: 0, manualTransitions: 0 }
  const started = performance.now()
  const fail = code => { throw new Error(code) }
  const check = () => { if (signal.aborted) fail('STAGE_ABORTED') }
  const sample = (bucket, duration) => {
    check()
    if (bucket.length >= LOAD_POLICY.maxSamples) fail('SAMPLE_LIMIT')
    bucket.push(duration)
  }
  const abort = () => { for (const socket of sockets) socket.disconnect() }
  signal.addEventListener('abort', abort, { once: true })
  async function connect() {
    check()
    const socket = io(url, { transports: ['websocket'], reconnection: false, timeout: LOAD_POLICY.ackTimeoutMs })
    sockets.add(socket)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CONNECT_TIMEOUT')), LOAD_POLICY.ackTimeoutMs)
      socket.once('connect', () => { clearTimeout(timer); resolve() })
      socket.once('connect_error', () => { clearTimeout(timer); reject(new Error('CONNECT_ERROR')) })
    })
    return socket
  }
  async function action(seat, roomId, event, payload = {}, expectedError) {
    check()
    const time = performance.now()
    const ack = await new Promise((resolve, reject) => seat.socket.timeout(LOAD_POLICY.ackTimeoutMs).emit(event, { roomId, ...payload },
      (error, result) => error ? reject(new Error('ACK_TIMEOUT')) : resolve(result)))
    sample(ackSamples, performance.now() - time)
    if (expectedError) {
      assert.equal(ack?.success, false, 'EXPECTED_REJECTION_MISSING')
      assert.equal(ack?.error, expectedError, 'WRONG_REJECTION')
      stats.expectedRejections++
    } else if (ack?.success !== true) {
      const codes = new Set(['RATE_LIMITED', 'INTERNAL_ERROR', 'PRIMARY_STORAGE_UNAVAILABLE', 'STALE_SESSION', 'GAME_ENDED', 'ACTION_ALREADY_DONE'])
      const code = codes.has(ack?.error) ? ack.error : 'OTHER_REJECTION'
      fail(`UNEXPECTED_${event.toUpperCase()}_${code}`)
    }
    if (ack?.success === true) seat.last.set(event, performance.now())
    return ack
  }
  async function view(seat, roomId) {
    check()
    const time = performance.now()
    const result = await new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); seat.socket.off('room_state', receive); seat.socket.off('error', error) }
      const receive = value => { if (value?.id !== roomId) return; cleanup(); resolve(value) }
      const error = () => { cleanup(); reject(new Error('HYDRATION_REJECTED')) }
      const timer = setTimeout(() => { cleanup(); reject(new Error('HYDRATION_TIMEOUT')) }, LOAD_POLICY.ackTimeoutMs)
      seat.socket.on('room_state', receive); seat.socket.once('error', error)
      seat.socket.emit('get_room_state', { roomId })
    })
    sample(readSamples, performance.now() - time)
    assert.equal(result.phaseView?.version, 'phase-view/v1', 'BAD_PHASE_VIEW')
    return result
  }
  async function pace(seat, event, minimum = 1050) {
    // Pace from successful ACK, not send time. Proxy/queue latency can vary enough
    // that send-to-send1050ms is still <1000ms between server admission timestamps.
    const delay = rateLimitWait(seat.last.get(event), performance.now(), minimum)
    if (delay) await sleep(delay)
    check()
  }
  async function roomScenario(index) {
    const roomId = roomIds[index]
    let failureContext
    const context = (step, expected, snapshot) => {
      const phase = value => PHASE_ORDER.includes(value) || value === 'ended' ? value : 'unknown'
      failureContext = { step, expectedPhase: phase(expected), actualPhase: phase(snapshot?.phase),
        round: Number.isSafeInteger(snapshot?.currentRound) ? snapshot.currentRound : null,
        revision: Number.isSafeInteger(snapshot?.revision) ? snapshot.revision : null }
    }
    try {
    const seats = []
    for (let i = 0; i < LOAD_POLICY.seats; i++) {
      const seat = { userId: `synthetic-${i}`, socket: await connect(), token: null, last: new Map() }
      const ack = await action(seat, roomId, 'join_room', { userId: seat.userId, name: `Synthetic ${i}`, createIfMissing: i === 0 })
      assert.equal(typeof ack.session?.token, 'string', 'NO_SEAT_SESSION')
      seat.token = ack.session.token; seats.push(seat)
    }
    await action(seats[0], roomId, 'start_game')
    const refused = await fetch(`${url}/fixture-completed/${count}/${cycle}`, { method: 'DELETE', signal: AbortSignal.timeout(2000) })
    assert.equal(refused.status, 409, 'LIVE_CLEANUP_NOT_REFUSED')
    stats.liveCleanupRefusals++
    const narrators = new Set(), senders = new Set()
    const byId = id => seats.find(seat => seat.userId === id) ?? fail('UNKNOWN_SEAT')
    const allViews = () => Promise.all(seats.map(seat => view(seat, roomId)))
    const provePresence = async (from, to, code) => {
      assert(Number.isSafeInteger(from) && Number.isSafeInteger(to) && from >= 0 && to >= from, code)
      if (to === from) return 0
      const response = await fetch(`${url}/fixture-presence/${count}/${cycle}/${index}/${from}/${to}`, { signal: AbortSignal.timeout(2000) })
      assert.equal(response.status, 200, code)
      const proof = await response.json()
      assert(proof.presenceOnly === true && proof.commits === to - from, code)
      return proof.commits
    }
    const convergedRevisions = async (views, code) => {
      const revisions = views.map(snapshot => snapshot.revision)
      assert(revisions.length > 0 && revisions.every(value => Number.isSafeInteger(value) && value >= 0), code)
      stats.hydrationPresenceCommits += await provePresence(Math.min(...revisions), Math.max(...revisions), code)
    }
    for (let round = 1; round <= 10; round++) {
      let state = await view(seats[0], roomId)
      assert.equal(state.currentRound, round, 'WRONG_ROUND')
      assert.equal(state.phase, 'role-reveal', 'WRONG_ROUND_PHASE')
      narrators.add(state.currentNarrator); senders.add(state.currentNTG)
      assert.deepEqual(state.coinCycle.reserve, { red: 0, green: 2, yellow: 2 }, 'BAD_RESERVE')
      for (const player of state.players) assert.deepEqual(player.coins,
        player.userId === state.currentNTG ? { red: 20, green: 0, yellow: 0 } : { red: 0, green: 2, yellow: 2 }, 'BAD_ALLOCATION')
      if (round === 5) {
        // Across ten parallel rooms this is a burst of ten authentic seat resumes.
        // Disconnect first to cap active connections at100; no fake seat insertion.
        const seat = byId(state.currentNarrator)
        seat.socket.disconnect(); sockets.delete(seat.socket)
        seat.socket = await connect()
        const resumed = await action(seat, roomId, 'reconnect_room', { userId: seat.userId, sessionToken: seat.token })
        seat.token = resumed.session.token
        state = await view(seat, roomId)
        assert.equal(state.currentRound, round, 'RESUME_LOST_ROUND')
        assert.equal(state.phase, 'role-reveal', 'RESUME_LOST_PHASE')
        stats.reconnects++
      }
      for (const phase of PHASE_ORDER) {
        state = await view(seats[0], roomId)
        context('phase-entry', phase, state)
        assert.equal(state.phase, phase, 'PHASE_DRIFT')
        stats.phaseVisits++
        const narrator = byId(state.currentNarrator), sender = byId(state.currentNTG)
        if (phase === 'healer-turn' || phase === 'silencer-turn') {
          const capability = phase === 'healer-turn' ? 'heal' : 'silence'
          const views = await allViews()
          const actor = seats[views.findIndex(value => value.phaseView.capabilities[capability])]
          assert(actor, 'NO_NIGHT_ACTOR')
          const target = state.players.find(player => !player.isSender && !player.isNarrator && (capability === 'heal' || player.userId !== actor.userId))
          assert(target, 'NO_NIGHT_TARGET')
          await pace(actor, 'night_action')
          await action(actor, roomId, 'night_action', { action: capability === 'heal' ? 'HEAL' : 'SILENCE', targetSocketId: target.socketId })
        }
        if (['situation-card', 'emotion-card', 'reflection-card', 'selfcare-card'].includes(phase)) {
          let chooser = sender
          if (phase === 'selfcare-card') {
            const views = await allViews()
            chooser = seats[views.findIndex(value => value.phaseView.capabilities.selectSelfcare)]
          }
          assert(chooser, 'NO_CARD_ACTOR')
          const card = catalog.cards.find(card => card.category === phase.replace('-card', ''))
          assert(card, 'NO_CANONICAL_CARD')
          await pace(chooser, 'select_card')
          await action(chooser, roomId, 'select_card', { card: { id: card.id }, type: phase === 'selfcare-card' ? 'SELECT_SELFCARE_CARD' : 'SELECT_CARD' })
        }
        if (phase === 'group-response') {
          const target = state.players.find(player => !player.isSender)
          const responder = byId(target.userId)
          await pace(responder, 'send_response', 550)
          await action(responder, roomId, 'send_response', { message: 'Synthetic load response.' })
          await pace(sender, 'give_coin')
          const payload = { receiverSocketId: target.socketId, coinType: 'red', amount: 1, requestId: `load-red-${round}`, round }
          const first = await action(sender, roomId, 'give_coin', payload)
          const repeated = await action(sender, roomId, 'give_coin', payload)
          const { revision: firstRevision, ...firstDomain } = first.data
          const { revision: repeatedRevision, ...repeatedDomain } = repeated.data
          assert.deepEqual(repeatedDomain, firstDomain, 'DUPLICATE_DOMAIN')
          assert(Number.isSafeInteger(firstRevision) && Number.isSafeInteger(repeatedRevision) && repeatedRevision >= firstRevision, 'DUPLICATE_COMMIT')
          if (repeatedRevision > firstRevision) {
            stats.replayPresenceCommits += await provePresence(firstRevision, repeatedRevision, 'DUPLICATE_COMMIT')
          }
          assert.deepEqual(repeated.data.coinCycle, first.data.coinCycle, 'DUPLICATE_LEDGER')
          assert.equal(first.data.coinCycle.transfers.filter(receipt => receipt.id === payload.requestId).length, 1, 'MISSING_RECEIPT')
          stats.receiptReplays++
          await action(narrator, roomId, 'prev_turn', {}, 'COIN_CHECKPOINT_LOCKED')
        }
        if (phase === 'reflection-sharing') {
          await pace(sender, 'share_reflection', 2050)
          await action(sender, roomId, 'share_reflection', { message: 'Synthetic load reflection.' })
        }
        if (phase === 'guess-silencer') {
          const views = await allViews()
          const voters = seats.filter((_, i) => views[i].phaseView.capabilities.guessSilencer)
          assert.equal(voters.length, 7, 'WRONG_VOTER_COUNT')
          for (const voter of voters) {
            await pace(voter, 'submit_vote', 2050)
            await action(voter, roomId, 'submit_vote', { suspectSocketId: state.players[0].socketId })
          }
        }
        if (phase === 'give-coins' && round === 1) {
          const others = state.players.filter(player => !player.isSender)
          for (const [giver, target, color] of [[others[0], state.players.find(p => p.isSender), 'green'], [others[1], others[2], 'yellow']]) {
            await pace(byId(giver.userId), 'give_coin')
            await action(byId(giver.userId), roomId, 'give_coin', { receiverSocketId: target.socketId, coinType: color, amount: 1, requestId: `load-${color}`, round })
          }
        }
        if (phase === 'reward') {
          const views = await allViews()
          for (const snapshot of views) {
            assert.equal(snapshot.coinCycle.closed, true, 'NOT_COLLECTED')
            assert.equal(snapshot.coinCycle.history.length, round, 'MISSING_HISTORY')
            const received = Object.values(snapshot.coinCycle.history[round - 1].received)
            for (const color of ['red', 'green', 'yellow']) assert.equal(received.reduce((n, coins) => n + coins[color], 0), color === 'red' || round === 1 ? 1 : 0, 'GIFT_LOSS_OR_DUPLICATION')
            assert(snapshot.players.every(player => Object.values(player.coins).every(value => value === 0)), 'UNRETURNED_COIN')
          }
          await convergedRevisions(views, 'REWARD_NONCONVERGENCE')
          stats.completedRounds++
        }
        const expectedNext = PHASE_ORDER[PHASE_ORDER.indexOf(phase) + 1] ?? (round === 10 ? 'ended' : 'role-reveal')
        if (automaticLoadPhase(phase)) {
          // These actions already schedule production NEXT. Sending manual NEXT
          // after a delayed ACK can otherwise skip the following phase.
          const deadline = performance.now() + LOAD_POLICY.ackTimeoutMs
          let advanced = false
          do {
            const current = await view(seats[0], roomId)
            context('automatic-transition', expectedNext, current)
            advanced = automaticTransition(state, current, expectedNext)
            if (advanced) { stats.automaticTransitions++; break }
            if (performance.now() >= deadline) fail('AUTO_ADVANCE_TIMEOUT')
            await sleep(250); check()
          } while (!advanced)
        } else {
          const next = await action(narrator, roomId, 'next_turn')
          context('manual-transition', expectedNext, next.data)
          assert.equal(next.data?.phase, expectedNext, 'MANUAL_PHASE_DRIFT')
          assert.equal(next.data?.currentRound, phase === 'reward' && round < 10 ? round + 1 : round, 'MANUAL_ROUND_DRIFT')
          stats.manualTransitions++
        }
      }
    }
    const views = await allViews()
    for (const snapshot of views) {
      assert.equal(snapshot.phase, 'ended', 'NOT_TERMINAL')
      assert.equal(snapshot.status, 'ended', 'NOT_ENDED')
      assert.equal(snapshot.coinCycle.history.length, 10, 'LOST_ROUND')
      assert.deepEqual(snapshot.coinCycle, views[0].coinCycle, 'LEDGER_NONCONVERGENCE')
      stats.convergedSeats++
    }
    await convergedRevisions(views, 'TERMINAL_NONCONVERGENCE')
    assert.equal(narrators.size, 10, 'NARRATOR_ROTATION_DRIFT')
    assert.equal(senders.size, 10, 'SENDER_ROTATION_DRIFT')
    await action(byId(views[0].currentNarrator), roomId, 'next_turn', {}, 'GAME_ENDED')
    const terminalAfter = await view(seats[0], roomId)
    assert.equal(terminalAfter.phase, 'ended', 'TERMINAL_MUTATION')
    assert.deepEqual(terminalAfter.coinCycle, views[0].coinCycle, 'TERMINAL_MUTATION')
    stats.hydrationPresenceCommits += await provePresence(views[0].revision, terminalAfter.revision, 'TERMINAL_MUTATION')
    } catch (error) {
      if (error instanceof Error) error.loadContext = failureContext
      throw error
    }
  }
  try {
    await Promise.all(Array.from({ length: count }, (_, i) => roomScenario(i)))
    return { ...stats, elapsedMs: Math.round(performance.now() - started), ackLatency: latencySummary(ackSamples), hydrationLatency: latencySummary(readSamples),
      convergence: 'authenticated hydration after each reward and terminal, not broadcast-delivery loss measurement' }
  } finally { signal.removeEventListener('abort', abort); for (const socket of sockets) socket.disconnect() }
}
