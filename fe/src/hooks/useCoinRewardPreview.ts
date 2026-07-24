import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoomState } from '@/components/game/types'

type GameLog = NonNullable<RoomState['gameLog']>
type CoinPreview = { coinType: 'red' | 'yellow' | 'green'; title?: string }

interface Options {
  gameLog: GameLog
  playerCount: number
  myUserId: string
  activePhase: string
}

export function useCoinRewardPreview({ gameLog, playerCount, myUserId, activePhase }: Options) {
  const [coinPreview, setCoinPreview] = useState<CoinPreview | null>(null)

  const lastNtgRef = useRef<number | null>(null)
  const lastReflectionRef = useRef<number | null>(null)
  const lastRoleRef = useRef<number | null>(null)
  const lastSilencerRef = useRef<number | null>(null)
  const lastGivePhaseSilencerRef = useRef<number | null>(null)
  const lastCorrectGuessRef = useRef<number | null>(null)
  const lastGiveCoinRef = useRef<number | null>(null)

  // NTG votes a player → that player gets +5 yellow
  useEffect(() => {
    if (activePhase !== 'group-response') return
    const entry = [...gameLog].reverse().find((e) => e.type === 'NTG_VOTE' && e.targetId === myUserId)
    if (!entry || entry.timestamp === lastNtgRef.current || entry.actorId === myUserId) return
    lastNtgRef.current = entry.timestamp
    setCoinPreview({ coinType: 'yellow', title: 'Bạn đã được Người Trao Gửi tặng 5 coin vàng' })
  }, [activePhase, myUserId, gameLog])

  // NTG shares reflection → NTG gets +5 yellow
  useEffect(() => {
    if (activePhase !== 'reflection-sharing') return
    const entry = [...gameLog].reverse().find((e) => e.type === 'SHARE_REFLECTION' && e.actorId === myUserId)
    if (!entry || entry.timestamp === lastReflectionRef.current) return
    lastReflectionRef.current = entry.timestamp
    setCoinPreview({ coinType: 'yellow', title: 'Bạn đã hoàn thành vai trò và nhận 5 coin vàng' })
  }, [activePhase, myUserId, gameLog])

  // Narrator confirms role completion → player gets +2 yellow
  useEffect(() => {
    const entry = [...gameLog].reverse().find((e) => e.type === 'ROLE_REWARD' && e.targetId === myUserId)
    if (!entry || entry.timestamp === lastRoleRef.current) return
    const bonus = entry.data?.bonus ?? 2
    lastRoleRef.current = entry.timestamp
    setCoinPreview({ coinType: 'yellow', title: `Bạn đã hoàn thành vai trò và nhận ${bonus} coin vàng` })
  }, [myUserId, gameLog])

  // Silencer reward (shown after reveal, not during it)
  useEffect(() => {
    if (activePhase === 'reveal-silencer') return
    const entry = [...gameLog].reverse().find((e) => e.type === 'REWARDS_CALCULATED')
    if (!entry || entry.timestamp === lastSilencerRef.current || entry.data?.silencerId !== myUserId) return
    const bonus = entry.data?.silencerYellowBonus ?? (entry.data?.silencerFound ? 2 : 7)
    lastSilencerRef.current = entry.timestamp
    setCoinPreview({
      coinType: 'yellow',
      title: entry.data?.silencerFound
        ? `Bạn đã hoàn thành vai trò Người Im Lặng: bị đoán ra, nhận ${bonus} coin vàng`
        : `Bạn đã hoàn thành vai trò Người Im Lặng: không bị đoán ra, nhận ${bonus} coin vàng`,
    })
  }, [activePhase, myUserId, gameLog])

  // Silencer reward shown again at give-coins phase
  useEffect(() => {
    if (activePhase !== 'give-coins') return
    const entry = [...gameLog].reverse().find((e) => e.type === 'REWARDS_CALCULATED')
    if (!entry || entry.timestamp === lastGivePhaseSilencerRef.current || entry.data?.silencerId !== myUserId) return
    const bonus = entry.data?.silencerYellowBonus ?? (entry.data?.silencerFound ? 2 : 7)
    lastGivePhaseSilencerRef.current = entry.timestamp
    setCoinPreview({
      coinType: 'yellow',
      title: entry.data?.silencerFound
        ? `Bạn nhận ${bonus} coin vàng khi bị đoán ra là Người Im Lặng`
        : `Bạn nhận ${bonus} coin vàng vì không bị đoán ra là Người Im Lặng`,
    })
  }, [activePhase, myUserId, gameLog])

  // Correct guess → green coins
  useEffect(() => {
    if (activePhase === 'reveal-silencer') return
    const entry = [...gameLog].reverse().find((e) => e.type === 'REWARDS_CALCULATED')
    if (!entry || entry.timestamp === lastCorrectGuessRef.current) return
    if (!entry.data?.correctGuesserIds?.includes(myUserId)) return
    const bonus = entry.data?.greenGuessBonus ?? (entry.data?.silencerFound ? playerCount : Math.max(0, playerCount - 3))
    lastCorrectGuessRef.current = entry.timestamp
    setCoinPreview({ coinType: 'green', title: `Bạn đã đoán trúng Người Im Lặng và nhận ${bonus} coin xanh` })
  }, [activePhase, myUserId, gameLog, playerCount])

  // Someone gave me coins
  useEffect(() => {
    const entry = [...gameLog].reverse().find((e) => e.type === 'GIVE_COIN' && e.targetId === myUserId)
    if (!entry || entry.timestamp === lastGiveCoinRef.current || entry.actorId === myUserId) return
    const amount = entry.data?.receiverGainsGreen ?? entry.data?.amount ?? 1
    lastGiveCoinRef.current = entry.timestamp
    setCoinPreview({ coinType: 'green', title: `Bạn đã nhận được ${amount} coin xanh` })
  }, [myUserId, gameLog])

  // Called from RevealSilencerOverlay onCloseComplete — show reward at that exact moment
  const showRevealRewardPreview = useCallback(() => {
    const entry = [...gameLog].reverse().find((e) => e.type === 'REWARDS_CALCULATED')
    if (!entry) return

    if (entry.data?.silencerId === myUserId && entry.timestamp !== lastSilencerRef.current) {
      const bonus = entry.data?.silencerYellowBonus ?? (entry.data?.silencerFound ? 2 : 7)
      lastSilencerRef.current = entry.timestamp
      setCoinPreview({
        coinType: 'yellow',
        title: `Bạn nhận được ${bonus} coin vàng khi hoàn thành vai trò Người Im Lặng`,
      })
      return
    }

    if (entry.data?.correctGuesserIds?.includes(myUserId) && entry.timestamp !== lastCorrectGuessRef.current) {
      const bonus = entry.data?.greenGuessBonus ?? (entry.data?.silencerFound ? playerCount : Math.max(0, playerCount - 3))
      lastCorrectGuessRef.current = entry.timestamp
      setCoinPreview({ coinType: 'green', title: `Bạn nhận được ${bonus} coin xanh khi đoán đúng Người Im Lặng` })
    }
  }, [myUserId, gameLog, playerCount])

  // Reset dedup refs on round change so rewards can show again next round
  const resetForNewRound = useCallback(() => {
    lastNtgRef.current = null
    lastReflectionRef.current = null
    lastRoleRef.current = null
    lastSilencerRef.current = null
    lastGivePhaseSilencerRef.current = null
    lastCorrectGuessRef.current = null
    lastGiveCoinRef.current = null
  }, [])

  return { coinPreview, setCoinPreview, showRevealRewardPreview, resetForNewRound }
}
