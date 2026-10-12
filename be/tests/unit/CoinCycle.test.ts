import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { collectCoinRound, receivedCoinTotal } from '../../src/modules/game/services/CoinCycle'
import { createMockRoom } from '../helpers/mockData'
import { inRoomQueue } from '../../src/socket/roomQueue'
import { HealCommand } from '../../src/modules/game/commands/HealCommand'
import { NTGVoteCommand } from '../../src/modules/game/commands/NTGVoteCommand'
import { ShareReflectionCommand } from '../../src/modules/game/commands/ShareReflectionCommand'

describe('approved 60 coin cycle', () => {
  it('does not mint automatic role rewards or reverse nonexistent bonuses when moving back', () => {
    const engine = new GameEngine()
    let room = engine.startGame(createMockRoom(7)).room!
    const original = room.players.map(p => p.coins)
    const target = room.players.find(p => !p.isSender)!.userId
    room = new HealCommand().execute({ ...room, mutedPlayer: target }, { type: 'HEAL', actorId: room.currentNarrator!, targetId: target }).room!
    room = new NTGVoteCommand().execute({ ...room, phase: 'group-response' }, { type: 'NTG_VOTE', actorId: room.currentNTG!, targetId: target }).room!
    room = new ShareReflectionCommand().execute({ ...room, phase: 'reflection-sharing' }, { type: 'SHARE_REFLECTION', actorId: room.currentNTG!, data: { message: 'Cảm ơn' } }).room!
    expect(room.players.map(p => p.coins)).toEqual(original)
    const rolledBack = engine.previousTurn(room, room.currentNarrator!)
    expect(rolledBack.success).toBe(true)
    expect(rolledBack.room!.players.map(p => p.coins)).toEqual(original)
  })
  it.each([5, 6, 7, 8, 9, 10])('allocates exactly 20 of every color including unused remainder for %s seats', n => {
    const room = new GameEngine().startGame(createMockRoom(n)).room!
    expect(room.rulesVersion).toBe('web-16-coin60/v1')
    const sender = room.players.find(p => p.userId === room.currentNTG)!
    expect(sender.coins).toEqual({ red: 20, green: 0, yellow: 0 })
    for (const p of room.players.filter(p => p.userId !== sender.userId)) {
      expect(p.coins).toEqual({ red: 0, green: Math.floor(20 / (n - 1)), yellow: Math.floor(20 / (n - 1)) })
    }
    for (const color of ['red', 'green', 'yellow'] as const) {
      expect(room.players.reduce((sum, p) => sum + p.coins[color], room.coinCycle!.reserve[color])).toBe(20)
    }
  })

  it('preserves gifted color, records receipts, rejects a changed retry and does not spend received coins', () => {
    const engine = new GameEngine()
    let room = { ...engine.startGame(createMockRoom(5)).room!, phase: 'group-response' as const }
    const sender = room.players.find(p => p.isSender)!
    const other = room.players.find(p => !p.isSender)!
    const action = { type: 'GIVE_COIN' as const, actorId: sender.userId, targetId: other.userId, data: { coinType: 'red', amount: 2, requestId: 'gift-1', round: 1 } }
    const result = engine.executeAction(room, action)
    expect(result.success).toBe(true)
    room = result.room as typeof room
    expect(room.players.find(p => p.userId === sender.userId)!.coins.red).toBe(18)
    expect(room.players.find(p => p.userId === other.userId)!.coins.red).toBe(2)
    expect(room.coinCycle!.received[other.userId].red).toBe(2)
    expect(engine.executeAction(room, action).room!.coinCycle!.transfers).toHaveLength(1)
    expect(engine.executeAction(room, { ...action, data: { ...action.data, amount: 3 } }).error).toBe('REQUEST_ID_CONFLICT')
    expect(engine.executeAction(room, { ...action, actorId: other.userId, targetId: sender.userId, data: { coinType: 'red', amount: 1 } }).success).toBe(false)
    const green = engine.executeAction(room, { type: 'GIVE_COIN', actorId: other.userId, targetId: sender.userId, data: { coinType: 'green', amount: 1 } })
    expect(green.success).toBe(true)
    expect(green.room!.coinCycle!.received[sender.userId].green).toBe(1)
    expect(engine.executeAction(room, { type: 'GIVE_COIN', actorId: other.userId, targetId: room.players.find(p => p.userId !== sender.userId && p.userId !== other.userId)!.userId, data: { coinType: 'green', amount: 1 } }).success).toBe(false)
  })

  it('collects unused and received coins once, retains round history and redistributes next round', () => {
    const engine = new GameEngine()
    let room = { ...engine.startGame(createMockRoom(7)).room!, phase: 'give-coins' as const }
    const other = room.players.find(p => !p.isSender)!
    room = engine.executeAction(room, { type: 'GIVE_COIN', actorId: room.currentNTG!, targetId: other.userId, data: { coinType: 'red', amount: 3 } }).room as typeof room
    const closed = engine.advanceTurn(room, room.currentNarrator!).room!
    expect(closed.coinCycle!.history[0].received[other.userId].red).toBe(3)
    expect(closed.players.every(p => Object.values(p.coins).every(n => n === 0))).toBe(true)
    expect(collectCoinRound(closed).coinCycle!.history).toHaveLength(1)
    const next = engine.advanceTurn(closed, closed.currentNarrator!).room!
    expect(next.currentRound).toBe(2)
    expect(next.coinCycle!.transfers).toHaveLength(0)
    expect(next.coinCycle!.history).toHaveLength(1)
    expect(next.players.find(p => p.isSender)!.coins.red).toBe(20)
  })

  it.each(['bogus', '__proto__', null])('rejects invalid coin type %s without changing the snapshot', coinType => {
    const engine = new GameEngine()
    const room = { ...engine.startGame(createMockRoom(5)).room!, phase: 'give-coins' as const }
    const before = JSON.stringify(room)
    expect(engine.executeAction(room, { type: 'GIVE_COIN', actorId: room.currentNTG!, targetId: room.players.find(p => !p.isSender)!.userId, data: { coinType, amount: 1 } }).success).toBe(false)
    expect(JSON.stringify(room)).toBe(before)
  })

  it('serializes concurrent transfers and recovers the queue after rejection', async () => {
    let count = 0
    const work = () => inRoomQueue('fixture-queue', async () => {
      const prior = count
      await Promise.resolve()
      count = prior + 1
    })
    await Promise.all(Array.from({ length: 10 }, work))
    expect(count).toBe(10)
    await expect(inRoomQueue('fixture-queue', () => { throw new Error('fixture-failure') })).rejects.toThrow()
    await work()
    expect(count).toBe(11)
  })

  it.each([5, 6, 7, 8, 9, 10])('retains receipts across every round and ends without minting coins for %s seats', n => {
    const engine = new GameEngine()
    let room = engine.startGame(createMockRoom(n)).room!
    let totalGifts = 0
    while (room.status !== 'ended') {
      room = { ...room, phase: 'give-coins' }
      const target = room.players.find(p => p.userId !== room.currentNTG)!
      const result = engine.executeAction(room, {
        type: 'GIVE_COIN', actorId: room.currentNTG!, targetId: target.userId,
        data: { coinType: 'red', amount: 2, round: room.currentRound, requestId: `round-${room.currentRound}` },
      })
      expect(result.success).toBe(true)
      room = result.room!
      totalGifts += 2
      expect(engine.previousTurn(room, room.currentNarrator!).success).toBe(false)
      room = engine.advanceTurn(room, room.currentNarrator!).room!
      expect(room.phase).toBe('reward')
      expect(room.coinCycle!.history).toHaveLength(room.currentRound)
      room = engine.advanceTurn(room, room.currentNarrator!).room!
    }
    expect(room.coinCycle!.history).toHaveLength(room.totalRounds)
    expect(room.players.reduce((sum, p) => sum + receivedCoinTotal(room, p.userId).red, 0)).toBe(totalGifts)
    expect(room.players.every(p => Object.values(p.coins).every(value => value === 0))).toBe(true)
    expect(engine.advanceTurn(room, room.currentNarrator!).success).toBe(false)
    expect(engine.previousTurn(room, room.currentNarrator!).success).toBe(false)
    expect(engine.executeAction(room, { type: 'GIVE_COIN', actorId: room.currentNTG!, targetId: room.players[0].userId, data: { coinType: 'red' } }).success).toBe(false)
  })
})
