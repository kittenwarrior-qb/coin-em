import type { CoinType, RoomState } from '../components/game/types'
type Balance = Record<CoinType, number>
const zero = (): Balance => ({ red: 0, green: 0, yellow: 0 })

export function coinCheckpointLocked(room: Pick<RoomState, 'coinCycle'>): boolean {
  const cycle = room.coinCycle
  return Boolean(cycle && (cycle.closed || Object.values(cycle.received).some(balance => Object.values(balance).some(amount => amount > 0))))
}

/** Present receipts at checkpoints; physical holdings are collected back to zero. */
export function displayedCoins(room: Pick<RoomState, 'coinCycle' | 'phase' | 'status'>, userId: string | undefined, holdings?: Balance): Balance {
  if (!room.coinCycle) return { ...(holdings ?? zero()) }
  const cycle = room.coinCycle
  if (room.status === 'ended') {
    const rounds = cycle.closed ? cycle.history : [...cycle.history, { round: -1, received: cycle.received }]
    return rounds.reduce((total, entry) => {
      const received = entry.received[userId ?? ''] ?? zero()
      return { red: total.red + received.red, green: total.green + received.green, yellow: total.yellow + received.yellow }
    }, zero())
  }
  if (room.phase === 'reward') return { ...(cycle.received[userId ?? ''] ?? zero()) }
  return { ...(holdings ?? zero()) }
}
