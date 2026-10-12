import { expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createMockRoom } from '../helpers/mockData'
import { changeRoundLimit, plannedRounds } from '../../src/modules/game/services/RoundLimit'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { roomView } from '../../src/modules/game/services/RoomView'
import { collectCoinRound } from '../../src/modules/game/services/CoinCycle'

it.each([[5,1],[5,3],[5,5],[10,1],[10,5],[10,10]])('freezes %s seats / %s rounds and preserves20red/green/yellow per round until terminal collection', (seats, rounds) => {
  const engine = new GameEngine()
  let room = engine.startGame({ ...createMockRoom(seats), roundLimit: rounds }).room!
  expect(room.totalRounds).toBe(rounds)
  for (let round = 1; round <= rounds; round++) {
    expect(room.currentRound).toBe(round)
    expect(room.totalRounds).toBe(rounds)
    const allocated = room.players.reduce((sum, player) => sum + player.coins.red + player.coins.green + player.coins.yellow, 0)
    expect(allocated).toBe(20 + 2 * Math.floor(20 / (seats - 1)) * (seats - 1))
    room = engine.advanceTurn({ ...collectCoinRound(room), phase: 'reward' }, room.currentNarrator!).room!
  }
  expect(room.status).toBe('ended')
  expect(room.coinCycle?.history).toHaveLength(rounds)
  expect(roomView(JSON.parse(JSON.stringify(room))).totalRounds).toBe(rounds)
})
it('defaults to roster size, preserves custom limit on join and blocks it if roster shrinks', () => {
  const room = createMockRoom(5)
  expect(plannedRounds(room)).toBe(5)
  expect(plannedRounds({ ...room, players: createMockRoom(10).players })).toBe(10)
  expect(plannedRounds({ ...room, roundLimit: 3, players: createMockRoom(10).players })).toBe(3)
  expect(new GameEngine().startGame({ ...createMockRoom(5), roundLimit: 6 }).error).toBe('INVALID_ROUND_LIMIT')
  expect(new GameEngine().startGame({ ...createMockRoom(4), roundLimit: 1 }).error).toBe('NOT_ENOUGH_PLAYERS')
})
it('authenticates host/waiting/revision and retries the same durable intent without exposing receipts', () => {
  const room = { ...createMockRoom(5), revision: 1 }
  const command = { limit: 3, expectedRevision: 1, requestId: randomUUID() }
  const changed = changeRoundLimit(room, room.host, command)
  const committed = { ...changed, revision: 2 }
  expect(changeRoundLimit(committed, room.host, command)).toBe(committed)
  expect(() => changeRoundLimit(committed, room.host, { ...command, limit: 2 })).toThrow('ROUND_REQUEST_CONFLICT')
  expect(() => changeRoundLimit(committed, room.host, { ...command, requestId: randomUUID() })).toThrow('ROUND_REVISION_CONFLICT')
  expect(() => changeRoundLimit(room, 'outsider', command)).toThrow('NOT_HOST')
  expect(() => changeRoundLimit({ ...room, status: 'playing' }, room.host, command)).toThrow('GAME_ALREADY_STARTED')
  expect(roomView(committed)).not.toHaveProperty('roundLimitReceipts')
})
it.each([0,11,6,1.5,'3',undefined,NaN,Infinity])('rejects invalid count %s rather than silently coercing', limit => {
  const room = { ...createMockRoom(5), revision: 0 }
  expect(() => changeRoundLimit(room, room.host, { limit, expectedRevision: 0, requestId: randomUUID() })).toThrow('INVALID_ROUND_LIMIT')
})
