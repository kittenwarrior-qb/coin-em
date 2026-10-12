import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoomState, GameLogEntry } from '@/components/game/types'

type CoinPreview = { coinType: 'red' | 'yellow' | 'green'; title?: string }
interface Options {
  gameLog: NonNullable<RoomState['gameLog']>
  playerCount: number // Call-site compatibility; never derive a reward from seat count.
  myUserId: string
  activePhase: string
  roomId: string
  currentRound?: number
  rulesVersion?: string
  isConnected: boolean
}
const fingerprint = (entry: GameLogEntry) => JSON.stringify([
  entry.data?.round, entry.data?.requestId,
])

/** A visual receipt for actual finite-pool transfers, never a reward calculator. */
export function useCoinRewardPreview({ gameLog, myUserId, activePhase, roomId, currentRound, rulesVersion, isConnected }: Options) {
  const [coinPreview, setCoinPreview] = useState<CoinPreview | null>(null)
  const observed = useRef<{ scope: string; connected: boolean; seen: Set<string> } | null>(null)

  useEffect(() => {
    const entries = gameLog.filter(entry => entry.type === 'GIVE_COIN')
    const scope = JSON.stringify([roomId, currentRound, myUserId, rulesVersion])
    const previous = observed.current
    if (!previous || previous.scope !== scope || !isConnected || !previous.connected) {
      observed.current = { scope, connected: isConnected, seen: new Set(entries.map(fingerprint)) }
      setCoinPreview(null)
      return // Hydration/reconnect is a baseline, not a fresh transfer notification.
    }
    const fresh = entries.filter(entry => !previous.seen.has(fingerprint(entry)))
    for (const entry of fresh) previous.seen.add(fingerprint(entry))
    if (typeof currentRound !== 'number' || !Number.isSafeInteger(currentRound) || currentRound < 1 || rulesVersion !== 'web-16-coin60/v1' || activePhase === 'ended') { setCoinPreview(null); return }
    for (const entry of fresh) {
      if (entry.targetId !== myUserId || entry.actorId === myUserId) continue
      if (entry.data?.round !== currentRound || typeof entry.data?.requestId !== 'string' || !entry.data.requestId) continue
      const color = entry.data?.coinType, amount = entry.data?.amount
      if ((color !== 'red' && color !== 'green' && color !== 'yellow') || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0 || amount > 20) continue
      const label = color === 'red' ? 'đỏ' : color === 'yellow' ? 'vàng' : 'xanh'
      setCoinPreview({ coinType: color, title: `Bạn đã nhận được ${amount} coin ${label}` })
    }
  }, [gameLog, myUserId, activePhase, roomId, currentRound, rulesVersion, isConnected])

  // Finite-Coin role/guess completion does not mint a reward. Retain the existing
  // reveal-overlay callback while its composition is being migrated in R19.
  const showRevealRewardPreview = useCallback(() => {}, [])
  const resetForNewRound = useCallback(() => { setCoinPreview(null) }, [])
  return { coinPreview, setCoinPreview, showRevealRewardPreview, resetForNewRound }
}
