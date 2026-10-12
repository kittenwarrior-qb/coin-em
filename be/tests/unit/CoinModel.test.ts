import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { collectCoinRound, receivedCoinTotal } from '../../src/modules/game/services/CoinCycle'
import { createMockRoom } from '../helpers/mockData'

const colors = ['red', 'green', 'yellow'] as const
const seeds = [17, 314159, 0x51c01]
const cases = [5, 6, 7, 8, 9, 10].flatMap(count => seeds.map(seed => ({ count, seed })))
const empty = () => ({ red: 0, green: 0, yellow: 0 })

describe('bounded seeded model of owner-approved finite Coin transfers', () => {
  it.each(cases)('$count seats / seed $seed conserves colors without spending received Coins', ({ count, seed }) => {
    const engine = new GameEngine()
    // Domain fixture starts at the approved gifting phase; protocol traversal
    // and storage durability are tested separately, not fabricated here.
    let room = { ...engine.startGame(createMockRoom(count)).room!, phase: 'give-coins' as const }
    const ids = room.players.map(player => player.userId)
    const sender = ids.indexOf(room.currentNTG!)
    const share = Math.floor(20 / (count - 1))
    const original = ids.map((_, i) => i === sender ? { red: 20, green: 0, yellow: 0 } : { red: 0, green: share, yellow: share })
    const remaining = original.map(coins => ({ ...coins }))
    const received = ids.map(empty)
    const accepted = empty()
    let state = seed
    const random = (limit: number) => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5
      return (state >>> 0) % limit
    }
    let receipts = 0
    for (let step = 0; step < 100; step++) {
      const color = colors[random(colors.length)]
      const actor = color === 'red' ? sender : random(count)
      let target = color === 'green' ? sender : random(count)
      let amount = 1
      let targetId = ids[target]
      switch (step % 7) {
        case 1: target = actor; targetId = ids[actor]; break
        case 2: amount = 0; break
        case 3: amount = 20; break
        case 4: targetId = 'absent-model-seat'; break
        case 5: amount = 0.5; break
      }
      const expected = ids.includes(targetId) && actor !== target && Number.isSafeInteger(amount) && amount > 0 && amount <= 20 &&
        (color !== 'red' || actor === sender) && (color !== 'green' || target === sender) && remaining[actor][color] >= amount
      const action = { type: 'GIVE_COIN' as const, actorId: ids[actor], targetId,
        data: { coinType: color, amount, requestId: `model-${seed}-${step}`, round: 1 } }
      const before = JSON.stringify(room)
      const result = engine.executeAction(room, action)
      expect(JSON.stringify(room), `input mutated at step${step}`).toBe(before)
      expect(result.success, `seed${seed}/step${step}`).toBe(expected)
      if (expected) {
        room = result.room as typeof room
        remaining[actor][color] -= amount
        received[target][color] += amount
        accepted[color]++
        receipts++
        const committed = JSON.stringify(room)
        expect(JSON.stringify(engine.executeAction(room, action).room)).toBe(committed)
        expect(engine.executeAction(room, { ...action, data: { ...action.data, amount: amount + 1 } }).success).toBe(false)
        expect(JSON.stringify(room)).toBe(committed)
      } else {
        expect(JSON.stringify(room)).toBe(before)
      }
      for (const [i, id] of ids.entries()) {
        expect(room.players.find(player => player.userId === id)!.coins).toEqual({
          red: remaining[i].red + received[i].red,
          green: remaining[i].green + received[i].green,
          yellow: remaining[i].yellow + received[i].yellow,
        })
        expect(room.coinCycle!.received[id]).toEqual(received[i])
      }
      for (const color of colors) {
        expect(room.players.reduce((sum, player) => sum + player.coins[color], room.coinCycle!.reserve[color])).toBe(20)
      }
      expect(room.coinCycle!.transfers).toHaveLength(receipts)
    }
    for (const color of colors) expect(accepted[color]).toBeGreaterThan(0)
    expect(engine.previousTurn(room, room.currentNarrator!).error).toBe('COIN_CHECKPOINT_LOCKED')
    const closed = engine.advanceTurn(room, room.currentNarrator!).room!
    expect(closed.phase).toBe('reward')
    expect(closed.players.every(player => colors.every(color => player.coins[color] === 0))).toBe(true)
    expect(closed.coinCycle!.history).toEqual([{ round: 1, received: Object.fromEntries(ids.map((id, i) => [id, received[i]])) }])
    expect(collectCoinRound(closed)).toBe(closed)
    for (const [i, id] of ids.entries()) expect(receivedCoinTotal(closed, id)).toEqual(received[i])
    const next = engine.advanceTurn(closed, closed.currentNarrator!).room!
    expect(next.currentRound).toBe(2)
    expect(next.coinCycle!.transfers).toEqual([])
    expect(next.coinCycle!.history).toEqual(closed.coinCycle!.history)
    for (const player of next.players) expect(player.coins).toEqual(player.isSender
      ? { red: 20, green: 0, yellow: 0 } : { red: 0, green: share, yellow: share })
  })
})
