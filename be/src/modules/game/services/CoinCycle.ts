import { GameAction, GameResult, Room } from '../types'

export type CoinColor = 'red' | 'green' | 'yellow'
export type CoinBalance = Record<CoinColor, number>
export interface CoinTransfer {
  id: string
  round: number
  from: string
  to: string
  color: CoinColor
  amount: number
}
export interface CoinCycle {
  version: 'coin-cycle-60/v1'
  round: number
  closed: boolean
  reserve: CoinBalance
  received: Record<string, CoinBalance>
  transfers: CoinTransfer[]
  history: Array<{ round: number; received: Record<string, CoinBalance> }>
}
const empty = (): CoinBalance => ({ red: 0, green: 0, yellow: 0 })

/** Recorded appreciation, not the physical allocation remaining on the table. */
export function receivedCoinTotal(room: Room, userId: string): CoinBalance {
  if (!room.coinCycle) return room.players.find(p => p.userId === userId)?.coins ?? empty()
  const cycle = room.coinCycle
  const rounds = cycle.closed ? cycle.history : [...cycle.history, { round: cycle.round, received: cycle.received }]
  return rounds.reduce((total, entry) => {
    const received = entry.received[userId] ?? empty()
    return { red: total.red + received.red, green: total.green + received.green, yellow: total.yellow + received.yellow }
  }, empty())
}

export function allocateCoinRound(room: Room): Room {
  if (!room.currentNTG || !room.players.some(p => p.userId === room.currentNTG) || room.players.length < 2) {
    throw new Error('Cannot allocate coins without a unique sender and other seats')
  }
  const recipients = room.players.length - 1
  const share = Math.floor(20 / recipients)
  return {
    ...room,
    rulesVersion: 'web-16-coin60/v1',
    players: room.players.map(p => ({ ...p, coins: p.userId === room.currentNTG
      ? { red: 20, green: 0, yellow: 0 }
      : { red: 0, green: share, yellow: share } })),
    coinCycle: {
      version: 'coin-cycle-60/v1', round: room.currentRound, closed: false,
      reserve: { red: 0, green: 20 - share * recipients, yellow: 20 - share * recipients },
      received: Object.fromEntries(room.players.map(p => [p.userId, empty()])),
      transfers: [], history: room.coinCycle?.history ?? [],
    },
  }
}

export function transferCoin(room: Room, action: GameAction): GameResult {
  const cycle = room.coinCycle!
  const { coinType, amount = 1, requestId, round } = action.data ?? {}
  if (!['red', 'green', 'yellow'].includes(coinType)) return { success: false, error: 'INVALID_COIN_TYPE' }
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 20) return { success: false, error: 'Invalid coin amount' }
  if (round !== undefined && round !== cycle.round) return { success: false, error: 'STALE_ROUND' }
  if (requestId !== undefined && (typeof requestId !== 'string' || requestId.length < 1 || requestId.length > 128)) {
    return { success: false, error: 'INVALID_REQUEST_ID' }
  }
  const previous = requestId && cycle.transfers.find(t => t.id === requestId)
  if (previous) {
    if (previous.from !== action.actorId || previous.to !== action.targetId || previous.color !== coinType || previous.amount !== amount) {
      return { success: false, error: 'REQUEST_ID_CONFLICT' }
    }
    return { success: true, room }
  }
  if (room.status !== 'playing' || cycle.closed || !['group-response', 'give-coins'].includes(room.phase)) {
    return { success: false, error: 'Not give-coins phase' }
  }
  const giver = room.players.find(p => p.userId === action.actorId)
  const receiver = room.players.find(p => p.userId === action.targetId)
  if (!giver || !receiver) return { success: false, error: 'PLAYER_NOT_FOUND' }
  if (giver.userId === receiver.userId) return { success: false, error: 'Cannot give coin to self' }
  if (coinType === 'red' && giver.userId !== room.currentNTG) return { success: false, error: 'ONLY_SENDER_GIVES_RED' }
  if (coinType === 'green' && receiver.userId !== room.currentNTG) return { success: false, error: 'GREEN_TARGET_MUST_BE_SENDER' }
  const color = coinType as CoinColor
  // Received coins are records of appreciation, separate from the original allocation available to give.
  const available = giver.coins[color] - (cycle.received[giver.userId]?.[color] ?? 0)
  if (available < amount) return { success: false, error: `Insufficient ${color} coins` }
  const receipt = { ...cycle.received[receiver.userId], [color]: (cycle.received[receiver.userId]?.[color] ?? 0) + amount }
  const transfer: CoinTransfer = {
    id: requestId ?? `round-${cycle.round}-transfer-${cycle.transfers.length + 1}`,
    round: cycle.round, from: giver.userId, to: receiver.userId, color, amount,
  }
  return {
    success: true,
    room: {
      ...room,
      players: room.players.map(p => p.userId === giver.userId
        ? { ...p, coins: { ...p.coins, [color]: p.coins[color] - amount } }
        : p.userId === receiver.userId ? { ...p, coins: { ...p.coins, [color]: p.coins[color] + amount } } : p),
      coinCycle: { ...cycle, received: { ...cycle.received, [receiver.userId]: receipt }, transfers: [...cycle.transfers, transfer] },
      lastActivity: Date.now(),
      gameLog: [...room.gameLog, {
        type: 'GIVE_COIN', actorId: giver.userId, targetId: receiver.userId, timestamp: Date.now(),
        data: { coinType: color, amount, requestId: transfer.id, round: cycle.round, preservesColor: true },
      }],
    },
  }
}

export function collectCoinRound(room: Room): Room {
  if (!room.coinCycle || room.coinCycle.closed) return room
  const cycle = room.coinCycle
  return {
    ...room,
    players: room.players.map(p => ({ ...p, coins: empty() })),
    coinCycle: { ...cycle, closed: true, history: [...cycle.history, { round: cycle.round, received: structuredClone(cycle.received) }] },
    gameLog: [...room.gameLog, { type: 'COINS_COLLECTED', actorId: 'system', timestamp: Date.now(), data: { round: cycle.round } }],
  }
}
