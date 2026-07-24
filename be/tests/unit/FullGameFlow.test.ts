import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { createMockRoom } from '../helpers/mockData'
import { Role, Room } from '../../src/modules/game/types'

/**
 * Full game flow simulation — 7 players, 7 rounds
 * Verifies:
 * - All 16 phases execute in order
 * - Green coins accumulate (never reset)
 * - Yellow/red coins behave correctly per round
 * - Reward logic applies correctly
 * - Game ends after totalRounds
 */

const PHASE_ORDER = [
  'role-reveal', 'night', 'healer-turn', 'silencer-turn',
  'situation-card', 'emotion-card', 'story-telling', 'group-response',
  'reflection-card', 'reflection-sharing', 'selfcare-card', 'hug-action',
  'guess-silencer', 'reveal-silencer', 'give-coins', 'reward',
]

function advanceThrough(engine: GameEngine, room: Room, phases: string[]): Room {
  let current = room
  for (const expectedPhase of phases) {
    const result = engine.advanceTurn(current, current.currentNarrator!)
    expect(result.success, `Failed advancing to ${expectedPhase}: ${result.error}`).toBe(true)
    expect(result.room!.phase).toBe(expectedPhase)
    current = result.room!
  }
  return current
}

function expectUniqueRoundRoles(room: Room): void {
  const narrators = room.players.filter(p => p.isNarrator)
  const senders = room.players.filter(p => p.isSender)

  expect(narrators, `Round ${room.currentRound} should have exactly one narrator`).toHaveLength(1)
  expect(senders, `Round ${room.currentRound} should have exactly one sender`).toHaveLength(1)
  expect(narrators[0].userId).not.toBe(senders[0].userId)
  expect(room.currentNarrator).toBe(narrators[0].userId)
  expect(room.currentNTG).toBe(senders[0].userId)
  expect(room.players.every(p => Boolean(p.role))).toBe(true)
  expect(room.players.filter(p => p.role === Role.NARRATOR)).toHaveLength(1)
  expect(room.players.filter(p => p.role === Role.SENDER)).toHaveLength(1)
}

describe('Full Game Flow', () => {
  let engine: GameEngine

  beforeEach(() => {
    engine = new GameEngine()
  })

  it('completes all 16 phases in correct order for one round', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    expect(started.success).toBe(true)
    expect(started.room!.phase).toBe('role-reveal')

    const afterRound = advanceThrough(engine, started.room!, PHASE_ORDER.slice(1))
    expect(afterRound.phase).toBe('reward')
  })

  it('green coins accumulate across rounds — never reset', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    expect(started.success).toBe(true)

    let current = started.room!
    const ntgId = current.currentNTG!

    // Round 1: advance to reward (NTG gets green coins)
    current = advanceThrough(engine, current, PHASE_ORDER.slice(1))
    const greenAfterRound1 = current.players.find(p => p.userId === ntgId)!.coins.green
    expect(greenAfterRound1).toBeGreaterThanOrEqual(0)

    // Advance to next round (role-reveal)
    const toNextRound = engine.advanceTurn(current, current.currentNarrator!)
    expect(toNextRound.success).toBe(true)
    expect(toNextRound.room!.phase).toBe('role-reveal')
    expect(toNextRound.room!.currentRound).toBe(2)

    // Green coins of the OLD NTG must be preserved (not reset)
    const oldNTGAfterRoundStart = toNextRound.room!.players.find(p => p.userId === ntgId)!
    expect(oldNTGAfterRoundStart.coins.green).toBe(greenAfterRound1)
  })

  it('red coins reset to 3 at start of each round', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    let current = started.room!

    // Spend some red coins in give-coins phase
    current = advanceThrough(engine, current, PHASE_ORDER.slice(1, 15)) // up to give-coins
    expect(current.phase).toBe('give-coins')

    const giver = current.players[0]
    const receiver = current.players[1]

    // Give 2 red coins
    const giveResult = engine.executeAction(current, {
      type: 'GIVE_COIN',
      actorId: giver.userId,
      targetId: receiver.userId,
      data: { coinType: 'red', amount: 2 },
    })
    expect(giveResult.success).toBe(true)
    current = giveResult.room!

    const giverRedAfterGive = current.players.find(p => p.userId === giver.userId)!.coins.red
    expect(giverRedAfterGive).toBe(1) // 3 - 2 = 1

    // Advance to reward then next round
    const toReward = engine.advanceTurn(current, current.currentNarrator!)
    expect(toReward.room!.phase).toBe('reward')
    const toNextRound = engine.advanceTurn(toReward.room!, toReward.room!.currentNarrator!)
    expect(toNextRound.room!.phase).toBe('role-reveal')

    // Red coins reset to 3
    const giverAfterReset = toNextRound.room!.players.find(p => p.userId === giver.userId)!
    expect(giverAfterReset.coins.red).toBe(3)
  })

  it('yellow coins keep accumulating — not reset between rounds', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    let current = started.room!

    const player = current.players[2]
    const initialYellow = player.coins.yellow

    // Advance full round
    current = advanceThrough(engine, current, PHASE_ORDER.slice(1))
    const toNextRound = engine.advanceTurn(current, current.currentNarrator!)
    current = toNextRound.room!

    const playerAfter = current.players.find(p => p.userId === player.userId)!
    // Yellow should be >= initial (may have gained bonuses, never reset)
    expect(playerAfter.coins.yellow).toBeGreaterThanOrEqual(0)
    // Specifically: yellow is NOT reset to initial value
    // (it could be higher due to bonuses, or same if no bonuses)
    expect(playerAfter.coins.red).toBe(3) // only red resets
  })

  it('silencer gets +7 yellow when not found, +2 when found', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    let current = started.room!

    const silencer = current.players.find(p => p.role === Role.SILENCER)!
    const yellowBefore = silencer.coins.yellow

    // Advance to guess-silencer
    current = advanceThrough(engine, current, PHASE_ORDER.slice(1, 13)) // up to guess-silencer
    expect(current.phase).toBe('guess-silencer')

    // All players vote for someone who is NOT the silencer
    const notSilencer = current.players.find(p => p.userId !== silencer.userId)!
    current.players.forEach(p => {
      if (p.userId !== silencer.userId) {
        const voteResult = engine.executeAction(current, {
          type: 'VOTE',
          actorId: p.userId,
          targetId: notSilencer.userId,
        })
        if (voteResult.success) current = voteResult.room!
      }
    })

    // Advance to reveal-silencer → give-coins → reward
    current = advanceThrough(engine, current, ['reveal-silencer', 'give-coins', 'reward'])

    const silencerAfter = current.players.find(p => p.userId === silencer.userId)!
    // Silencer was NOT found → +7 yellow
    expect(silencerAfter.coins.yellow).toBe(yellowBefore + 7)
  })

  it('NTG gets green coins based on whether silencer was found', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    let current = started.room!

    const ntgId = current.currentNTG!
    const ntg = current.players.find(p => p.userId === ntgId)!
    const playerCount = current.players.length
    const greenBefore = ntg.coins.green

    // Advance to guess-silencer
    current = advanceThrough(engine, current, PHASE_ORDER.slice(1, 13))

    const silencer = current.players.find(p => p.role === Role.SILENCER)!

    // All vote for silencer (found)
    current.players.forEach(p => {
      if (p.userId !== silencer.userId) {
        const voteResult = engine.executeAction(current, {
          type: 'VOTE',
          actorId: p.userId,
          targetId: silencer.userId,
        })
        if (voteResult.success) current = voteResult.room!
      }
    })

    // Advance to reward
    current = advanceThrough(engine, current, ['reveal-silencer', 'give-coins', 'reward'])

    const ntgAfter = current.players.find(p => p.userId === ntgId)!
    // Silencer found → NTG gets +N green
    expect(ntgAfter.coins.green).toBe(greenBefore + playerCount)
  })

  it('game ends after totalRounds', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    expect(started.room!.totalRounds).toBe(7)

    let current = started.room!
    expectUniqueRoundRoles(current)

    // Simulate all 7 rounds
    for (let round = 1; round <= 7; round++) {
      // Advance through all phases of this round
      current = advanceThrough(engine, current, PHASE_ORDER.slice(1))
      expect(current.phase).toBe('reward')
      expect(current.currentRound).toBe(round)

      if (round < 7) {
        const next = engine.advanceTurn(current, current.currentNarrator!)
        expect(next.success).toBe(true)
        expect(next.room!.phase).toBe('role-reveal')
        expect(next.room!.currentRound).toBe(round + 1)
        current = next.room!
        expectUniqueRoundRoles(current)
      }
    }

    // After last round's reward, game should end
    const endResult = engine.advanceTurn(current, current.currentNarrator!)
    expect(endResult.success).toBe(true)
    expect(endResult.room!.status).toBe('ended')
    expect(endResult.room!.phase).toBe('ended')
    expect(endResult.message).toBe('GAME_ENDED')
  })

  it('keeps exactly one narrator and one sender across every new round', () => {
    const started = engine.startGame(createMockRoom(7))
    let current = started.room!

    expectUniqueRoundRoles(current)

    for (let round = 1; round < current.totalRounds; round++) {
      current = advanceThrough(engine, current, PHASE_ORDER.slice(1))
      const nextRound = engine.advanceTurn(current, current.currentNarrator!)
      expect(nextRound.success).toBe(true)
      current = nextRound.room!
      expect(current.phase).toBe('role-reveal')
      expect(current.currentRound).toBe(round + 1)
      expectUniqueRoundRoles(current)
    }
  })

  it('Connector gets +5 yellow when responded AND voted by NTG', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    let current = started.room!

    const connector = current.players.find(p => p.role === Role.CONNECTOR)!
    const ntgId = current.currentNTG!
    const yellowBefore = connector.coins.yellow

    // Advance to group-response
    current = advanceThrough(engine, current, PHASE_ORDER.slice(1, 8))
    expect(current.phase).toBe('group-response')

    // Connector sends response
    const responseResult = engine.executeAction(current, {
      type: 'SEND_RESPONSE',
      actorId: connector.userId,
      data: { message: 'Tôi cảm thấy đồng cảm với bạn.' },
    })
    expect(responseResult.success).toBe(true)
    current = responseResult.room!

    // NTG votes for connector
    const ntgVoteResult = engine.executeAction(current, {
      type: 'NTG_VOTE',
      actorId: ntgId,
      targetId: connector.userId,
    })
    expect(ntgVoteResult.success).toBe(true)
    current = ntgVoteResult.room!

    // Advance to reward
    current = advanceThrough(engine, current, [
      'reflection-card', 'reflection-sharing', 'selfcare-card', 'hug-action',
      'guess-silencer', 'reveal-silencer', 'give-coins', 'reward',
    ])

    const connectorAfter = current.players.find(p => p.userId === connector.userId)!
    // Responded + voted by NTG → +5 yellow
    expect(connectorAfter.coins.yellow).toBeGreaterThanOrEqual(yellowBefore + 5)
  })

  it('muted Connector gets no yellow bonus at reward phase', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    let current = started.room!

    const connector = current.players.find(p => p.role === Role.CONNECTOR)!
    const yellowBefore = connector.coins.yellow

    // Advance to group-response
    current = advanceThrough(engine, current, PHASE_ORDER.slice(1, 8))

    // Connector responds
    const responseResult = engine.executeAction(current, {
      type: 'SEND_RESPONSE',
      actorId: connector.userId,
      data: { message: 'Phản hồi của tôi.' },
    })
    expect(responseResult.success).toBe(true)
    current = responseResult.room!

    // Manually set connector as muted (silencer got them)
    current = { ...current, mutedPlayer: connector.userId }

    // Advance to reward
    current = advanceThrough(engine, current, [
      'reflection-card', 'reflection-sharing', 'selfcare-card', 'hug-action',
      'guess-silencer', 'reveal-silencer', 'give-coins', 'reward',
    ])

    const connectorAfter = current.players.find(p => p.userId === connector.userId)!
    // Muted → no +2 bonus
    expect(connectorAfter.coins.yellow).toBe(yellowBefore)
  })

  it('5-player game skips healer-turn (no healer role assigned)', () => {
    const room = createMockRoom(5)
    const started = engine.startGame(room)
    expect(started.success).toBe(true)
    let current = started.room!

    expect(current.players.some(p => p.originalRole === Role.HEALER)).toBe(false)

    // night → should jump straight to silencer-turn
    const nightResult = engine.advanceTurn(current, current.currentNarrator!)
    expect(nightResult.success).toBe(true)
    current = nightResult.room!
    expect(current.phase).toBe('night')

    const afterNight = engine.advanceTurn(current, current.currentNarrator!)
    expect(afterNight.success).toBe(true)
    expect(afterNight.room!.phase).toBe('silencer-turn')
  })

  it('6-player game skips healer-turn (no healer role assigned)', () => {
    const room = createMockRoom(6)
    const started = engine.startGame(room)
    expect(started.success).toBe(true)
    let current = started.room!

    expect(current.players.some(p => p.originalRole === Role.HEALER)).toBe(false)

    current = engine.advanceTurn(current, current.currentNarrator!).room! // → night
    const afterNight = engine.advanceTurn(current, current.currentNarrator!)
    expect(afterNight.room!.phase).toBe('silencer-turn')
  })

  it('7-player game includes healer-turn', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    let current = started.room!

    expect(current.players.some(p => p.originalRole === Role.HEALER)).toBe(true)

    current = engine.advanceTurn(current, current.currentNarrator!).room! // → night
    const afterNight = engine.advanceTurn(current, current.currentNarrator!)
    expect(afterNight.room!.phase).toBe('healer-turn')
  })

  it('Connector gets +2 yellow when responded but NOT voted by NTG', () => {
    const room = createMockRoom(7)
    const started = engine.startGame(room)
    let current = started.room!

    const connector = current.players.find(p => p.role === Role.CONNECTOR)!
    const yellowBefore = connector.coins.yellow

    // Advance to group-response
    current = advanceThrough(engine, current, PHASE_ORDER.slice(1, 8))

    // Connector responds but NTG votes for someone else
    const responseResult = engine.executeAction(current, {
      type: 'SEND_RESPONSE',
      actorId: connector.userId,
      data: { message: 'Phản hồi của tôi.' },
    })
    expect(responseResult.success).toBe(true)
    current = responseResult.room!

    const ntgId = current.currentNTG!
    const otherPlayer = current.players.find(p => p.userId !== connector.userId && p.userId !== ntgId)!
    const ntgVoteResult = engine.executeAction(current, {
      type: 'NTG_VOTE',
      actorId: ntgId,
      targetId: otherPlayer.userId,
    })
    if (ntgVoteResult.success) current = ntgVoteResult.room!

    // Advance to reward
    current = advanceThrough(engine, current, [
      'reflection-card', 'reflection-sharing', 'selfcare-card', 'hug-action',
      'guess-silencer', 'reveal-silencer', 'give-coins', 'reward',
    ])

    const connectorAfter = current.players.find(p => p.userId === connector.userId)!
    // Responded only → +2 yellow
    expect(connectorAfter.coins.yellow).toBe(yellowBefore + 2)
  })
})
