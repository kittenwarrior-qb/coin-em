import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { CARD_IMAGES, ROLE_TO_IMAGE } from '../constants/cardImages'
import { useGameStore } from '../stores'
import { useGameState, useGameActions, useGameUI } from '../hooks/useGameState'
import { useGameFlow } from '../hooks/useGameFlow'
import type { CardData, SelectedCards } from '../stores/types'
import { PHASE_LABELS, type GamePhase } from '../stores/types'

import { CartoonButton, CartoonCircleButton } from '@/components/cartoon'
import { TableBoard }      from '@/components/game/TableBoard'
import { FlipCard }         from '@/components/game/FlipCard'
import { CoinCarousel }     from '@/components/game/CoinCarousel'
import { CardInventory, CARD_DATA } from '@/components/game/CardInventory'
import { PlayerLayout }     from '@/components/game/PlayerLayout'
import { MiniPlayerToken }  from '@/components/game/MiniPlayerToken'
import { CoinDisplay }      from '@/components/game/CoinDisplay'
import { GameMenuModal }    from '@/components/lobby/GameMenuModal'
import { NtgRewardPicker } from '@/components/game/NtgRewardPicker'
import { RoleRewardPicker } from '@/components/game/RoleRewardPicker'
import { RandomSituationFan } from '@/components/game/RandomSituationFan'
import {
  GuessSilencerOverlay,
  RevealSilencerOverlay,
  RewardOverlay,
  EndedOverlay,
} from '@/components/game/PhaseOverlays'
import type { RoomState } from '@/components/game/types'

interface GameBoardProps {
  roomId: string
  roomState: RoomState
  mySocketId: string
  myUserId: string
  onLeave: () => void
  onUpdateProfile?: (name: string, avatarIndex: number, bgIndex: number) => void
  nextTurn: (roomId: string) => void
  prevTurn: (roomId: string) => void
  nightAction: (roomId: string, action: string, targetSocketId?: string, cardData?: object) => void
  emitSelectCard: (roomId: string, card: object, type?: 'SELECT_CARD' | 'SELECT_SELFCARE_CARD') => void
  sendResponse: (roomId: string, message: string) => void
  ntgVote: (roomId: string, targetSocketId: string | string[]) => void
  confirmRoleRewards: (roomId: string, targetSocketIds: string[], onDone?: () => void) => void
  shareReflection: (roomId: string, message: string) => void
  submitVote: (roomId: string, suspectSocketId: string) => void
}

const PHASE_ORDER: GamePhase[] = [
  'role-reveal',
  'night',
  'healer-turn',
  'silencer-turn',
  'situation-card',
  'emotion-card',
  'story-telling',
  'group-response',
  'reflection-card',
  'reflection-sharing',
  'selfcare-card',
  'hug-action',
  'guess-silencer',
  'reveal-silencer',
  'give-coins',
  'reward',
]

const getPhaseNumber = (phase: GamePhase): number | '?' => {
  const index = PHASE_ORDER.indexOf(phase)
  return index >= 0 ? index + 1 : '?'
}

function FlyingActionIconEffect({
  fromId,
  toId,
  nonce,
  iconSrc,
  onDone,
}: {
  fromId: string
  toId: string
  nonce: number
  iconSrc: string
  onDone: () => void
}) {
  const [coords, setCoords] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null)

  useEffect(() => {
    const findToken = (id: string) =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-player-avatar-id]'))
        .find(el => el.dataset.playerAvatarId === id) ??
      Array.from(document.querySelectorAll<HTMLElement>('[data-player-token-id]'))
        .find(el => el.dataset.playerTokenId === id)

    const fromEl = findToken(fromId)
    const toEl = findToken(toId)
    if (!fromEl || !toEl) {
      onDone()
      return
    }

    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()
    setCoords({
      from: { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 },
      to: { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 },
    })
  }, [fromId, toId, nonce, onDone])

  if (!coords) return null

  return (
    <motion.img
      key={nonce}
      src={iconSrc}
      alt=""
      initial={{ x: coords.from.x - 18, y: coords.from.y - 18, scale: 0.9, opacity: 0 }}
      animate={{
        x: coords.to.x - 18,
        y: coords.to.y - 18,
        scale: [0.9, 1.08, 1.08, 1.85],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 1.45,
        times: [0, 0.56, 0.76, 1],
        ease: [0.25, 0.8, 0.25, 1],
      }}
      onAnimationComplete={onDone}
      className="fixed left-0 top-0 z-[70] h-9 w-9 pointer-events-none object-contain"
      style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))' }}
    />
  )
}

export default function GameBoard({
  roomState,
  mySocketId,
  myUserId,
  onLeave,
  onUpdateProfile,
  nextTurn,
  prevTurn,
  nightAction,
  emitSelectCard,
  ntgVote,
  confirmRoleRewards,
  shareReflection,
  submitVote,
}: GameBoardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [coinPreview, setCoinPreview] = useState<{ coinType: 'red' | 'yellow' | 'green'; title?: string } | null>(null)
  const [cardPreview, setCardPreview] = useState<{ card: CardData; revealed: boolean } | null>(null)
  const [flyingActionEffect, setFlyingActionEffect] = useState<{ fromId: string; toId: string; iconSrc: string; nonce: number } | null>(null)
  const [selectedNightAction, setSelectedNightAction] = useState<{
    type: 'heal' | 'silence'
    targetId: string
    targetName: string
    iconSrc: string
    confirmed: boolean
  } | null>(null)
  const [situationChoices, setSituationChoices] = useState<CardData[]>([])
  const [selectedSituationChoice, setSelectedSituationChoice] = useState<CardData | null>(null)
  const [hideOtherPlayerBadges, setHideOtherPlayerBadges] = useState(false)
  const [phaseNavigation, setPhaseNavigation] = useState<{ direction: 'next' | 'prev'; targetPhase: GamePhase } | null>(null)
  const [turnCountdownSeconds, setTurnCountdownSeconds] = useState(30)
  const [showNtgRewardPicker, setShowNtgRewardPicker] = useState(false)
  const [showRoleRewardPicker, setShowRoleRewardPicker] = useState(false)
  const [pendingNtgRewardIds, setPendingNtgRewardIds] = useState<Set<string>>(() => new Set())
  const [ntgRewardSuccess, setNtgRewardSuccess] = useState<{names: string[]} | null>(null)

  // Phase-local state
  const [ntgVotedIds, setNtgVotedIds] = useState<Set<string>>(() => new Set())
  const [hasSharedReflection, setHasSharedReflection] = useState(false)
  const [hasVoted,           setHasVoted]           = useState(false)
  const [hasHealed,           setHasHealed]          = useState(false)
  const [hasSilenced,         setHasSilenced]        = useState(false)

  // Stores
  const { players, myPlayer, isNarrator, selectedCards } = useGameState()
  const { setPlayers, selectCard, clearSelectedCards, clearSelectedCard } = useGameActions()
  const { expandedPlayer, showInventory, inventoryMode, setExpandedPlayer, setShowInventory, setInventoryMode } = useGameUI()
  const { gameStep, handleSelectCard }                   = useGameFlow()
  const setMyIds      = useGameStore(s => s.setMyIds)
  const [dismissedRoleRevealRound, setDismissedRoleRevealRound] = useState<number | null>(null)
  const lastNightActionEffectRef = useRef<number | null>(null)
  const lastNtgRewardPreviewRef = useRef<number | null>(null)
  const lastReflectionRewardPreviewRef = useRef<number | null>(null)
  const lastRoleRewardPreviewRef = useRef<number | null>(null)
  const lastSilencerRewardPreviewRef = useRef<number | null>(null)
  const lastCorrectGuessRewardPreviewRef = useRef<number | null>(null)

  // Init
  useEffect(() => { setMyIds(mySocketId, myUserId) }, [mySocketId, myUserId, setMyIds])

  // Sync players from roomState
  useEffect(() => {
    const converted = roomState.players.map(p => ({
      id: p.socketId,
      userId: p.userId,
      name: p.name,
      role: p.role || 'Chưa chia vai trò',
      isMe: p.userId ? p.userId === myUserId : p.socketId === mySocketId,
      isNarrator: p.isNarrator,
      isSender: p.isSender,
      isMuted: p.isMuted || Boolean(p.userId && p.userId === roomState.mutedPlayer),
      isHealed: p.isHealed,
      isDisconnected: p.isDisconnected,
      disconnectedAt: p.disconnectedAt,
      avatarIndex: p.avatarIndex,
      bgIndex: p.bgIndex,
      coins: p.coins || { red: 0, yellow: 0, green: 0 },
    }))
    setPlayers(converted.sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : 0)))
  }, [roomState.mutedPlayer, roomState.players, mySocketId, myUserId, setPlayers])

  useEffect(() => {
    const latestNightAction = [...(roomState.gameLog ?? [])]
      .reverse()
      .find((entry) => entry.type === 'HEAL' || entry.type === 'SILENCE')
    if (!latestNightAction || latestNightAction.timestamp === lastNightActionEffectRef.current) return

    const actor = roomState.players.find((p) => p.userId === latestNightAction.actorId)
    const target = roomState.players.find((p) => p.userId === latestNightAction.targetId)
    if (!actor || !target) return

    const shouldShowRealtime = isNarrator
    if (!shouldShowRealtime) return

    lastNightActionEffectRef.current = latestNightAction.timestamp
    setFlyingActionEffect({
      fromId: actor.socketId,
      toId: target.socketId,
      iconSrc: latestNightAction.type === 'HEAL'
        ? '/cartoon/icons/Potion-Green-Border.svg'
        : '/cartoon/icons/Lock-Sliver.svg',
      nonce: latestNightAction.timestamp,
    })
  }, [isNarrator, myUserId, roomState.gameLog, roomState.players])

  useEffect(() => {
    if (gameStep !== 'group-response') return

    const latestNtgReward = [...(roomState.gameLog ?? [])]
      .reverse()
      .find((entry) => entry.type === 'NTG_VOTE' && entry.targetId === myUserId)

    if (!latestNtgReward || latestNtgReward.timestamp === lastNtgRewardPreviewRef.current) return
    if (latestNtgReward.actorId === myUserId) return

    lastNtgRewardPreviewRef.current = latestNtgReward.timestamp
    setCoinPreview({
      coinType: 'yellow',
      title: 'Bạn đã được Người Trao Gửi tặng 5 coin vàng',
    })
  }, [gameStep, myUserId, roomState.gameLog])

  // Show coin preview when NTG receives reflection sharing reward
  useEffect(() => {
    if (gameStep !== 'reflection-sharing') return

    const latestReflectionReward = [...(roomState.gameLog ?? [])]
      .reverse()
      .find((entry) => entry.type === 'SHARE_REFLECTION' && entry.actorId === myUserId)

    if (!latestReflectionReward || latestReflectionReward.timestamp === lastReflectionRewardPreviewRef.current) return

    lastReflectionRewardPreviewRef.current = latestReflectionReward.timestamp
    setCoinPreview({
      coinType: 'yellow',
      title: 'Bạn đã hoàn thành vai trò và nhận 5 coin vàng',
    })
  }, [gameStep, myUserId, myPlayer?.isSender, roomState.gameLog])

  useEffect(() => {
    const latestRoleReward = [...(roomState.gameLog ?? [])]
      .reverse()
      .find((entry) => entry.type === 'ROLE_REWARD' && entry.targetId === myUserId)

    if (!latestRoleReward || latestRoleReward.timestamp === lastRoleRewardPreviewRef.current) return

    const bonus = latestRoleReward.data?.bonus ?? 2
    lastRoleRewardPreviewRef.current = latestRoleReward.timestamp
    setCoinPreview({
      coinType: 'yellow',
      title: `Bạn đã hoàn thành vai trò và nhận ${bonus} coin vàng`,
    })
  }, [myUserId, roomState.gameLog])

  useEffect(() => {
    const latestReward = [...(roomState.gameLog ?? [])]
      .reverse()
      .find((entry) => entry.type === 'REWARDS_CALCULATED')

    if (gameStep === 'reveal-silencer') return
    if (!latestReward || latestReward.timestamp === lastSilencerRewardPreviewRef.current) return
    if (latestReward.data?.silencerId !== myUserId) return

    const bonus = latestReward.data?.silencerYellowBonus ?? (latestReward.data?.silencerFound ? 2 : 7)
    lastSilencerRewardPreviewRef.current = latestReward.timestamp
    setCoinPreview({
      coinType: 'yellow',
      title: latestReward.data?.silencerFound
        ? `B\u1ea1n \u0111\u00e3 ho\u00e0n th\u00e0nh vai tr\u00f2 Ng\u01b0\u1eddi Im L\u1eb7ng: b\u1ecb \u0111o\u00e1n ra, nh\u1eadn ${bonus} coin v\u00e0ng`
        : `B\u1ea1n \u0111\u00e3 ho\u00e0n th\u00e0nh vai tr\u00f2 Ng\u01b0\u1eddi Im L\u1eb7ng: kh\u00f4ng b\u1ecb \u0111o\u00e1n ra, nh\u1eadn ${bonus} coin v\u00e0ng`,
    })
  }, [gameStep, myUserId, roomState.gameLog])

  useEffect(() => {
    const latestReward = [...(roomState.gameLog ?? [])]
      .reverse()
      .find((entry) => entry.type === 'REWARDS_CALCULATED')

    if (gameStep === 'reveal-silencer') return
    if (!latestReward || latestReward.timestamp === lastCorrectGuessRewardPreviewRef.current) return
    if (!latestReward.data?.correctGuesserIds?.includes(myUserId)) return

    const bonus = latestReward.data?.greenGuessBonus ?? (latestReward.data?.silencerFound ? roomState.players.length : Math.max(0, roomState.players.length - 3))
    lastCorrectGuessRewardPreviewRef.current = latestReward.timestamp
    setCoinPreview({
      coinType: 'green',
      title: `B\u1ea1n \u0111\u00e3 \u0111o\u00e1n tr\u00fang Ng\u01b0\u1eddi Im L\u1eb7ng v\u00e0 nh\u1eadn ${bonus} coin xanh`,
    })
  }, [gameStep, myUserId, roomState.gameLog, roomState.players.length])

  const showRevealRewardPreview = useCallback(() => {
    const latestReward = [...(roomState.gameLog ?? [])]
      .reverse()
      .find((entry) => entry.type === 'REWARDS_CALCULATED')

    if (!latestReward) return

    if (latestReward.data?.silencerId === myUserId && latestReward.timestamp !== lastSilencerRewardPreviewRef.current) {
      const bonus = latestReward.data?.silencerYellowBonus ?? (latestReward.data?.silencerFound ? 2 : 7)
      lastSilencerRewardPreviewRef.current = latestReward.timestamp
      setCoinPreview({
        coinType: 'yellow',
        title: `B\u1ea1n nh\u1eadn \u0111\u01b0\u1ee3c ${bonus} coin v\u00e0ng khi ho\u00e0n th\u00e0nh vai tr\u00f2 Ng\u01b0\u1eddi Im L\u1eb7ng`,
      })
      return
    }

    if (latestReward.data?.correctGuesserIds?.includes(myUserId) && latestReward.timestamp !== lastCorrectGuessRewardPreviewRef.current) {
      const bonus = latestReward.data?.greenGuessBonus ?? (latestReward.data?.silencerFound ? roomState.players.length : Math.max(0, roomState.players.length - 3))
      lastCorrectGuessRewardPreviewRef.current = latestReward.timestamp
      setCoinPreview({
        coinType: 'green',
        title: `B\u1ea1n nh\u1eadn \u0111\u01b0\u1ee3c ${bonus} coin xanh khi \u0111o\u00e1n \u0111\u00fang Ng\u01b0\u1eddi Im L\u1eb7ng`,
      })
    }
  }, [myUserId, roomState.gameLog, roomState.players.length])

  // Reset phase state on step change
  useEffect(() => {
    setNtgVotedIds(new Set())
    setHasSharedReflection(false); setHasVoted(false)
    setHasHealed(false)
    setHasSilenced(false)
    setSelectedNightAction(null)
  }, [gameStep])

  useEffect(() => {
    if (gameStep !== 'role-reveal') setDismissedRoleRevealRound(null)
  }, [gameStep])

  useEffect(() => {
    if (gameStep !== 'situation-card') {
      setSituationChoices([])
      setSelectedSituationChoice(null)
    }
  }, [gameStep])

  useEffect(() => {
    if (gameStep !== 'group-response') return
    const votedUserIds = new Set(roomState.ntgVotes?.[myUserId] ?? [])
    const votedSocketIds = roomState.players
      .filter((p) => p.userId && votedUserIds.has(p.userId))
      .map((p) => p.socketId)
    // Merge with existing instead of replacing to preserve optimistic updates
    setNtgVotedIds((prev) => {
      const merged = new Set([...prev, ...votedSocketIds])
      return merged
    })
  }, [gameStep, myUserId, roomState.ntgVotes, roomState.players])

  useEffect(() => {
    if (gameStep !== 'group-response') {
      setShowNtgRewardPicker(false)
      setPendingNtgRewardIds(new Set())
      setNtgRewardSuccess(null)
    }
  }, [gameStep])

  const hasConfirmedNtgRewards = gameStep === 'group-response' && ntgVotedIds.size > 0

  useEffect(() => {
    if (!roomState.selectedCard?.category) {
      const phase = roomState.phase ?? gameStep
      if (phase === 'role-reveal' || phase === 'night') {
        clearSelectedCards()
      } else if (phase === 'situation-card') {
        clearSelectedCards()
      } else if (phase === 'emotion-card') {
        clearSelectedCard('emotion')
      } else if (phase === 'reflection-card') {
        clearSelectedCard('reflection')
      } else if (phase === 'selfcare-card') {
        clearSelectedCard('selfcare')
      }
      return
    }
    selectCard(roomState.selectedCard, roomState.selectedCard.category)
  }, [roomState.phase, roomState.selectedCard, gameStep, selectCard, clearSelectedCards, clearSelectedCard])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  // reserved stubs — will be wired up when give-coins / night phases are re-implemented
  // const sendCoin = ...
  // const handleNightAction = ...

  const getSituationChoices = useCallback(() => {
    const settings = roomState.settings
    const allowedGroups = settings?.situationGroups ?? ['light', 'medium', 'sensitive']
    const filtered = CARD_DATA.situation.filter(card => {
      const n = parseInt(card.id.replace('situation-TH', ''))
      if (allowedGroups.includes('light') && n >= 1 && n <= 13) return true
      if (allowedGroups.includes('medium') && n >= 14 && n <= 24) return true
      if (allowedGroups.includes('sensitive') && n >= 25) return true
      return false
    })
    return [...filtered].sort(() => Math.random() - 0.5)
  }, [roomState.settings])

  useEffect(() => {
    if (gameStep !== 'situation-card' || !myPlayer?.isSender || selectedCards.situation || situationChoices.length > 0) return
    setSituationChoices(getSituationChoices())
  }, [gameStep, getSituationChoices, myPlayer?.isSender, selectedCards.situation, situationChoices.length])

  const handleConfirmSituationChoice = () => {
    if (!selectedSituationChoice) return
    selectCard(selectedSituationChoice, 'situation')
    emitSelectCard(roomState.id, selectedSituationChoice)
    setSituationChoices([])
    setSelectedSituationChoice(null)
  }

  const togglePendingNtgReward = (id: string) => {
    if (ntgVotedIds.has(id)) return
    setPendingNtgRewardIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmPendingNtgRewards = () => {
    if (pendingNtgRewardIds.size === 0) {
      setShowNtgRewardPicker(false)
      return
    }
    
    // Get names of rewarded players
    const rewardedNames = players
      .filter(p => pendingNtgRewardIds.has(p.id))
      .map(p => p.name)
    
    // Send all votes in one request
    const ids = Array.from(pendingNtgRewardIds)
    ntgVote(roomState.id, ids)
    
    // Optimistic update: immediately mark these players as rewarded
    setNtgVotedIds((prev) => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
    
    setPendingNtgRewardIds(new Set())
    setShowNtgRewardPicker(false)
    
    // Show success popup
    setNtgRewardSuccess({ names: rewardedNames })
  }

  const handleRoleRewards = (selectedPlayerIds: string[]) => {
    console.log('[Role Rewards] Selected players:', selectedPlayerIds)

    confirmRoleRewards(roomState.id, selectedPlayerIds, () => {
      nextTurn(roomState.id)
    })
    setShowRoleRewardPicker(false)
  }

  const handleVoteSilencer = (id: string) => {
    if (hasVoted || isNarrator || isMySilencerRole) return
    submitVote(roomState.id, id)
    setHasVoted(true)
  }

  const handleHealTarget = (targetId: string) => {
    const target = players.find((p) => p.id === targetId)
    // Healer CAN heal self - remove self-check
    if (!myPlayer || hasHealed || !target || target.isNarrator || target.isSender) return
    setSelectedNightAction({
      type: 'heal',
      targetId,
      targetName: target.name,
      iconSrc: '/cartoon/icons/Potion-Green-Border.svg',
      confirmed: false,
    })
  }

  const confirmHealTarget = (targetId: string) => {
    if (!myPlayer || hasHealed) return
    setHasHealed(true)
    setSelectedNightAction((action) => action?.targetId === targetId ? { ...action, confirmed: true } : action)
    setFlyingActionEffect({
      fromId: myPlayer.id,
      toId: targetId,
      iconSrc: '/cartoon/icons/Potion-Green-Border.svg',
      nonce: Date.now(),
    })
    nightAction(roomState.id, 'heal', targetId)
  }

  const handleSilenceTarget = (targetId: string) => {
    const target = players.find((p) => p.id === targetId)
    if (!myPlayer || hasSilenced || !target || targetId === myPlayer.id || target.isNarrator || target.isSender) return
    setSelectedNightAction({
      type: 'silence',
      targetId,
      targetName: target.name,
      iconSrc: '/cartoon/icons/Lock-Sliver.svg',
      confirmed: false,
    })
  }

  const confirmSilenceTarget = (targetId: string) => {
    if (!myPlayer || hasSilenced) return
    setHasSilenced(true)
    setSelectedNightAction((action) => action?.targetId === targetId ? { ...action, confirmed: true } : action)
    setFlyingActionEffect({
      fromId: myPlayer.id,
      toId: targetId,
      iconSrc: '/cartoon/icons/Lock-Sliver.svg',
      nonce: Date.now(),
    })
    nightAction(roomState.id, 'silence', targetId)
  }

  const handleInventorySelect = (card: CardData) => {
    if (gameStep === 'emotion-card') {
      handleSelectCard(card, 'emotion')
      emitSelectCard(roomState.id, card)
    } else if (gameStep === 'reflection-card') {
      handleSelectCard(card, 'reflection')
      emitSelectCard(roomState.id, card)
    } else if (gameStep === 'selfcare-card') {
      handleSelectCard(card, 'selfcare')
      emitSelectCard(roomState.id, card, 'SELECT_SELFCARE_CARD')
    }
  }

  const openInventory = (category?: CardData['category']) => {
    setInventoryMode({ category, showConfirm: !!category })
    setShowInventory(true)
  }

  const roomEmotionGroups = roomState.settings?.emotionGroups ?? ['basic', 'light', 'strong', 'advanced']
  const roomSituationGroups = roomState.settings?.situationGroups ?? ['light', 'medium', 'sensitive']

  // ─── Derived ───────────────────────────────────────────────────────────────
  const currentRound = roomState.currentRound || 1
  const totalRounds  = roomState.totalRounds || 1
  const myCoinCount  = myPlayer?.coins || { red: 0, yellow: 0, green: 0 }
  const healerActionDone = roomState.nightActions?.healed || hasHealed
  const silencerActionDone = roomState.nightActions?.silenced || hasSilenced
  const healerRole = Object.keys(ROLE_TO_IMAGE)[2]
  const guideRole = Object.keys(ROLE_TO_IMAGE)[3]
  const silencerRole = Object.keys(ROLE_TO_IMAGE)[5]
  const isMyHealerRole = myPlayer?.role === healerRole
  const isMySilencerRole = myPlayer?.role === silencerRole
  const canShowMyRole =
    !!myPlayer?.role &&
    myPlayer.role !== 'Chưa chia vai trò' &&
    myPlayer.role !== 'ChÆ°a chia vai trÃ²'
  const showRoleRevealOverlay =
    gameStep === 'role-reveal' &&
    dismissedRoleRevealRound !== currentRound &&
    canShowMyRole
  const isSenderChoosingSituation = gameStep === 'situation-card' && !!myPlayer?.isSender && !selectedCards.situation
  const showTurnStatus =
    (gameStep !== 'role-reveal' || dismissedRoleRevealRound === currentRound) &&
    !isSenderChoosingSituation

  const getTurnStatus = () => {
    switch (gameStep) {
      case 'role-reveal':
        return {
          title: 'Nhận vai trò',
          description: 'Quản trò bắt đầu trò chơi',
        }
      case 'night':
        return {
          title: 'Trời tối rồi',
          description: 'Quản trò đang chuẩn bị cho đêm',
        }
      case 'healer-turn':
        if (healerActionDone) {
          return {
            title: 'Người Chữa Lành đã chọn xong',
            description: 'Đang đợi quản trò tiếp tục',
          }
        }
        if (isMyHealerRole) {
          return {
            title: 'Lượt của bạn',
            description: 'Hãy chọn một người để bảo vệ (không được chọn Quản trò và Người Trao Gửi)',
          }
        }
        return {
          title: 'Lượt của Người Chữa Lành',
          description: 'Người Chữa Lành đang chọn ai đó để bảo vệ',
        }
      case 'silencer-turn':
        if (silencerActionDone) {
          return {
            title: 'Người Im Lặng đã chọn xong',
            description: 'Đang đợi quản trò tiếp tục',
          }
        }
        if (isMySilencerRole) {
          return {
            title: 'Lượt của bạn',
            description: 'Hãy chọn một người để làm im lặng (không được chọn Quản trò và Người Trao Gửi)',
          }
        }
        return {
          title: 'Lượt của Người Im Lặng',
          description: 'Người Im Lặng đang chọn ai đó để làm im lặng',
        }
      case 'situation-card':
        return {
          title: 'Lượt của Người trao gửi Chọn thẻ Tình huống',
          description: 'Người Trao Gửi đang chọn thẻ tình huống',
        }
      case 'emotion-card':
        if (myPlayer?.isSender && !selectedCards.emotion) {
          return {
            title: 'Chọn một thẻ Cảm xúc',
            description: 'Hãy chọn một thẻ cảm xúc dựa trên tình huống của bạn',
          }
        }
        return {
          title: 'Lượt của Người trao gửi Chọn thẻ Cảm xúc',
          description: 'Người Trao Gửi đang chọn thẻ cảm xúc',
        }
      case 'story-telling':
        return {
          title: 'Lượt của Người trao gửi Kể chuyện',
          description: 'Người Trao Gửi đang chia sẻ câu chuyện của mình',
        }
      case 'group-response':
        if (myPlayer?.isSender) {
          return {
            title: 'Tặng coin cho các bạn có phản hồi tốt',
            description: 'Cả bàn đã phản hồi, hãy tặng coin cho mọi người nếu bạn hài lòng nhé. Mở danh sách để chọn một hoặc nhiều người.',
          }
        }
        return {
          title: 'Phản hồi nhóm',
          description: 'Cả bàn cùng phản hồi offline theo hướng dẫn của quản trò.',
        }
      case 'reflection-card':
        return {
          title: 'Lượt của Người trao gửi Chọn thẻ Phản tư',
          description: 'Người Trao Gửi đang chọn thẻ phản tư',
        }
      case 'reflection-sharing':
        return {
          title: 'Lượt của Người trao gửi Chia sẻ suy nghĩ',
          description: 'Người Trao Gửi đang chia sẻ suy nghĩ của mình',
        }
      case 'selfcare-card':
        return {
          title: 'Lượt của Người trao gửi Chọn Bí kíp ôm',
          description: 'Người Dẫn Lối đang chọn bí kíp ôm',
        }
      case 'hug-action':
        return {
          title: 'Hành động ôm',
          description: 'Mọi người cùng thực hiện hành động ôm',
        }
      case 'guess-silencer':
        return {
          title: 'Đoán ai là Người Im Lặng',
          description: 'Hãy bình chọn ai bạn nghĩ là Người Im Lặng',
        }
      case 'reveal-silencer':
        return {
          title: 'Công bố Vai trò của người chơi',
          description: 'Xem ai là Người Im Lặng thật sự',
        }
      case 'give-coins':
        return {
          title: 'Tặng coin cho nhau',
          description: 'Hãy tặng coin cho những người bạn thích',
        }
      case 'reward':
        return {
          title: 'Kết thúc lượt',
          description: 'Quản trò sẽ chuyển sang lượt tiếp theo',
        }
      default:
        return {
          title: PHASE_LABELS[gameStep] ?? gameStep,
          description: 'Đang chờ lượt tiếp theo',
        }
    }
  }

  const turnStatus = getTurnStatus()
  const disconnectedPlayers = roomState.players.filter(p => !p.isFake && p.isDisconnected)
  const playerNameByUserId = (userId?: string) =>
    roomState.players.find((p) => p.userId === userId)?.name || (userId === 'system' ? 'Hệ thống' : 'Người chơi')
  const phaseName = (phase?: string) => phase && (PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? phase)
  const cardName = (card?: CardData) => {
    if (!card) return 'một thẻ'
    const match = card.id.match(/([A-Z]{1,3}\d+|\d+)$/i)
    if (card.category === 'situation') return `thẻ Tình huống ${match?.[1]?.toUpperCase() ?? ''}`.trim()
    if (card.category === 'emotion') return `thẻ Cảm xúc ${card.subType ? `nhóm ${card.subType}` : ''}`.trim()
    if (card.category === 'reflection') return `thẻ Phản tư ${match?.[1]?.toUpperCase() ?? ''}`.trim()
    if (card.category === 'selfcare') return `thẻ Bí kíp ôm ${match?.[1]?.toUpperCase() ?? ''}`.trim()
    return 'một thẻ'
  }
  const coinName = (coinType?: string) => {
    if (coinType === 'red') return 'coin đỏ'
    if (coinType === 'yellow') return 'coin vàng'
    if (coinType === 'green') return 'coin xanh'
    return 'coin'
  }
  const roundLogStart = (roomState.gameLog ?? []).reduce(
    (latest, entry, index) => entry.type === 'ROUND_STARTED' && entry.data?.round === currentRound ? index : latest,
    -1
  )
  const roundLogs = (roomState.gameLog ?? []).slice(roundLogStart >= 0 ? roundLogStart : 0)
  const renderHistoryEntry = (entry: NonNullable<RoomState['gameLog']>[number]) => {
    const actorName = playerNameByUserId(entry.actorId)
    const targetName = playerNameByUserId(entry.targetId)
    const card = entry.data?.card as CardData | undefined
    const narratorTitle = `Quản trò đã cho lượt chơi tiếp tục (${actorName})`
    const senderTitle = `Người Trao Gửi (${actorName})`

    switch (entry.type) {
      case 'GAME_STARTED':
        return null
      case 'PHASE_CHANGED':
        if ((entry.data as { direction?: string } | undefined)?.direction === 'previous') {
          return {
            title: `Quản trò đã cho quay về phase trước: ${phaseName(entry.data?.phase) ?? 'giai đoạn trước'} (${actorName})`,
            detail: `Cả bàn quay lại: ${phaseName(entry.data?.phase) ?? 'giai đoạn trước'}.`,
          }
        }
        return {
          title: narratorTitle,
          detail: `Cả bàn chuyển sang: ${phaseName(entry.data?.phase) ?? 'giai đoạn tiếp theo'}.`,
        }
      case 'SILENCE':
        return {
          title: 'Người Im Lặng đã chọn mục tiêu',
          detail: 'Một người chơi sẽ bị im lặng trong lượt này.',
        }
      case 'HEAL':
        return {
          title: 'Người Chữa Lành đã chọn mục tiêu',
          detail: 'Một người chơi được bảo vệ khỏi hiệu ứng im lặng.',
        }
      case 'SELECT_CARD':
        return {
          title: `${senderTitle} đã chọn thẻ tình huống`,
          detail: `Thẻ được chọn là ${cardName(card)}. Nhấn vào thẻ bên dưới để xem lại.`,
          card,
        }
      case 'SELECT_SELFCARE_CARD':
        return {
          title: `${senderTitle} đã chọn thẻ Bí kíp ôm`,
          detail: `Thẻ được chọn là ${cardName(card)}. Nhấn vào thẻ bên dưới để xem lại.`,
          card,
        }
      case 'SEND_RESPONSE':
        return {
          title: 'Một người chơi đã gửi phản hồi',
          detail: entry.data?.message ? `"${entry.data.message}"` : 'Người chơi đã gửi phản hồi cho câu chuyện.',
        }
      case 'NTG_VOTE':
        return {
          title: `${senderTitle} đã chọn phản hồi nổi bật`,
          detail: `${targetName} nhận thêm ${entry.data?.bonus ?? 5} coin vàng.`,
        }
      case 'SHARE_REFLECTION':
        return {
          title: `${senderTitle} đã chia sẻ phần phản tư`,
          detail: `Người Trao Gửi nhận thêm ${entry.data?.bonus ?? 5} coin vàng.`,
        }
      case 'ROLE_REWARD':
        return {
          title: `Quản trò đã xác nhận ${targetName} hoàn thành vai trò`,
          detail: `${targetName} nhận thêm ${entry.data?.bonus ?? 2} coin vàng.`,
        }
      case 'GIVE_COIN':
        return {
          title: `Một người chơi đã tặng ${coinName(entry.data?.coinType)} cho ${targetName}`,
          detail: `${targetName} nhận ${entry.data?.amount ?? 1} coin xanh từ lượt tặng này.`,
        }
      case 'REWARDS_CALCULATED':
        return {
          title: 'Đã tổng kết phần thưởng cuối lượt',
          detail: entry.data?.silencerFound ? 'Cả nhóm đã tìm ra Người Im Lặng.' : 'Cả nhóm chưa tìm ra Người Im Lặng.',
        }
      case 'ROUND_STARTED':
        return {
          title: `Bắt đầu round ${entry.data?.round ?? currentRound}`,
          detail: 'Vai trò lượt mới và trạng thái người chơi đã được làm mới.',
        }
      default:
        return {
          title: entry.type,
          detail: targetName !== 'Người chơi' ? `${actorName} tương tác với ${targetName}.` : `${actorName} vừa thực hiện một hành động.`,
        }
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const visibleRoundLogs = roundLogs
    .map((entry) => ({ entry, item: renderHistoryEntry(entry) }))
    .filter((log): log is { entry: NonNullable<RoomState['gameLog']>[number]; item: NonNullable<ReturnType<typeof renderHistoryEntry>> } => Boolean(log.item))

  const isNight = ['night', 'healer-turn', 'silencer-turn'].includes(gameStep)
  const isMyHealerTurn = gameStep === 'healer-turn' && myPlayer?.role === healerRole && !healerActionDone
  const isMySilencerTurn = gameStep === 'silencer-turn' && myPlayer?.role === silencerRole && !silencerActionDone
  const getCountdownKeyForPlayer = (player: typeof players[number]) => {
    const baseKey = `${currentRound}-${gameStep}-${healerActionDone}-${silencerActionDone}-${selectedCards.situation?.id ?? 'no-situation'}-${selectedCards.emotion?.id ?? 'no-emotion'}-${selectedCards.selfcare?.id ?? 'no-selfcare'}`

    if (gameStep === 'role-reveal' || gameStep === 'night') {
      return player.isNarrator ? `${baseKey}-narrator` : null
    }
    if (gameStep === 'healer-turn') {
      if (!healerActionDone && player.role === healerRole && (isNarrator || player.isMe)) return `${baseKey}-${player.id}`
      return healerActionDone && player.isNarrator ? `${baseKey}-narrator` : null
    }
    if (gameStep === 'silencer-turn') {
      if (!silencerActionDone && player.role === silencerRole && (isNarrator || player.isMe)) return `${baseKey}-${player.id}`
      return silencerActionDone && player.isNarrator ? `${baseKey}-narrator` : null
    }
    if (gameStep === 'situation-card') return (!selectedCards.situation ? player.isSender : player.isNarrator) ? baseKey : null
    if (gameStep === 'emotion-card') return (!selectedCards.emotion ? player.isSender : player.isNarrator) ? baseKey : null
    if (gameStep === 'story-telling' || gameStep === 'reflection-sharing') return player.isSender ? baseKey : null
    if (gameStep === 'reflection-card') return selectedCards.reflections.length < 3 && player.isSender ? baseKey : null
    if (gameStep === 'selfcare-card') return !selectedCards.selfcare && player.role === guideRole ? baseKey : null
    return null
  }
  const currentTurnCountdownKey = players.map(getCountdownKeyForPlayer).find(Boolean) ?? null
  const currentTurnCountdownDuration = gameStep === 'story-telling' ? 60 : 30

  useEffect(() => {
    if (!currentTurnCountdownKey) {
      setTurnCountdownSeconds(currentTurnCountdownDuration)
      return
    }

    setTurnCountdownSeconds(currentTurnCountdownDuration)
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setTurnCountdownSeconds(Math.max(0, currentTurnCountdownDuration - elapsed))
      if (elapsed >= currentTurnCountdownDuration) window.clearInterval(timer)
    }, 250)

    return () => window.clearInterval(timer)
  }, [currentTurnCountdownKey, currentTurnCountdownDuration])

  const currentPhaseIndex = PHASE_ORDER.indexOf(gameStep as GamePhase)
  const previousPhase = currentPhaseIndex > 0 ? PHASE_ORDER[currentPhaseIndex - 1] : null
  const nextPhase = currentPhaseIndex >= 0 && currentPhaseIndex < PHASE_ORDER.length - 1
    ? PHASE_ORDER[currentPhaseIndex + 1]
    : 'role-reveal'
  const isNarratorNextDisabled = gameStep === 'emotion-card' && !selectedCards.emotion
  const boardSelectedCards: SelectedCards = selectedCards.selfcare
    ? { ...selectedCards, situation: undefined }
    : selectedCards

  return (
    <div className="screen-cartoon" style={{ overflow: 'hidden' }}>
      <div
        className="screen-panel relative p-4 flex flex-col gap-4"
        id="game-panel"
        style={{
          width: 430,
          height: '100dvh',
          overflow: 'hidden',
          backgroundImage: 'url(/ingame_background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Night background — slides up from bottom on night phases, slides back down on day */}
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/ingame_dark_background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          animate={{ y: isNight ? '0%' : '100%' }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          initial={{ y: '100%' }}
        />

        {/* Coin display — top left */}
        {isSenderChoosingSituation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[9] pointer-events-none bg-black"
          />
        )}

        <div className="absolute top-2 left-2 z-20">
          <CoinDisplay coins={myCoinCount} onCoinClick={(_, __, coinType) => setCoinPreview({ coinType: coinType as 'red' | 'yellow' | 'green' })} />
        </div>

        {/* Menu button — top right */}
        <CartoonCircleButton
          color="purple"
          size="sm"
          iconSrc="/cartoon/icons/Settings.svg"
          iconAlt="Menu"
          iconSize="40%"
          className="absolute top-2 right-2 z-30"
          style={{ height: 38, width: 38 }}
          onClick={() => setShowMenu(true)}
          aria-label="Menu"
        />

        <AnimatePresence>
          {currentTurnCountdownKey && (
            <motion.div
              key={currentTurnCountdownKey}
              initial={{ opacity: 0, scale: 0.78, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.78, x: 10 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              className="absolute top-2 right-[54px] z-30 flex h-[38px] min-w-[52px] items-center justify-center rounded-full border-2 border-[var(--c-black)] bg-[#e6f9ff] px-3 text-center shadow-[0_3px_0_rgba(0,0,0,0.2)]"
              data-testid="turn-countdown-popup"
            >
              <span className="font-display text-base leading-none text-[var(--c-black)]">
                {turnCountdownSeconds}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History log button */}
        <div className="absolute bottom-3 left-3 z-30 flex flex-col items-center gap-0.5">
          <CartoonCircleButton
            color="light"
            size="sm"
            iconSrc="/cartoon/icons/Book.svg"
            iconAlt="Nhật ký"
            iconSize="52%"
            onClick={() => setShowHistory(true)}
            aria-label="Nhật ký lượt chơi"
            data-testid="btn-history-log"
          />
          <div className="font-display text-[9px] text-[var(--c-pink)] leading-none drop-shadow-sm">Nhật ký</div>
        </div>

        <div className="absolute bottom-3 right-3 z-30">
          <CartoonCircleButton
            color={hideOtherPlayerBadges ? 'gray' : 'light'}
            size="sm"
            onClick={() => setHideOtherPlayerBadges((hidden) => !hidden)}
            aria-label={hideOtherPlayerBadges ? 'Hien badge nguoi choi' : 'An badge nguoi choi'}
            aria-pressed={hideOtherPlayerBadges}
            data-testid="btn-toggle-player-badges"
          >
            {hideOtherPlayerBadges ? (
              <Eye className="h-[45%] w-[45%] text-white drop-shadow-sm" strokeWidth={3} />
            ) : (
              <EyeOff className="h-[45%] w-[45%] text-[#2f76ac] drop-shadow-sm" strokeWidth={3} />
            )}
          </CartoonCircleButton>
        </div>

        {/* Phase info */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
          <div
            className="px-3 py-1 text-center rounded-full"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }}
          >
            <div data-testid="game-phase" data-phase={gameStep} className="font-display text-[10px] text-white/70">
              Round {currentRound}/{totalRounds} · Phase {getPhaseNumber(gameStep)}/{PHASE_ORDER.length}
            </div>
          </div>
        </div>

        {disconnectedPlayers.length > 0 && (
          <div className="absolute top-12 left-1/2 z-20 w-[min(92%,360px)] -translate-x-1/2 rounded-2xl bg-white/90 px-3 py-2 text-center shadow-[0_4px_0_rgba(0,0,0,0.16)]">
            <div className="font-display text-[11px] text-[var(--c-pink)]">
              {disconnectedPlayers.length} người chơi đã rời phòng
            </div>
            <div className="font-body text-[11px] leading-snug text-black/60">
              {disconnectedPlayers.map(p => p.name).join(', ')}
            </div>
          </div>
        )}

        {/* Player layout around center board */}
        <div data-testid="players-grid" className="relative z-10 flex-1 min-h-0 mt-10 h-full">
          <PlayerLayout
            players={players}
            renderCenter={() => (
              <TableBoard
                selectedCards={boardSelectedCards}
                phase={gameStep}
                revealSituation={gameStep !== 'situation-card'}
                onCardClick={(card, revealed) => setCardPreview({ card, revealed })}
                status={
                  showTurnStatus ? (
                    <div className="rounded-2xl bg-white/70 px-3 py-2 text-center" data-testid="turn-status-panel">
                      <div className="font-display text-xs text-[var(--c-gray)]">{turnStatus.title}</div>
                      <div className="font-body text-[11px] text-black/55">{turnStatus.description}</div>
                    </div>
                  ) : null
                }
                actions={
                  <>
                    {isNarrator && (
                      <div className="flex items-center gap-2 w-full" data-testid="narrator-phase-nav">
                        {/* Prev phase arrow */}
                        <button
                          type="button"
                          disabled={!previousPhase}
                          className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[#96b886] border-2 border-[var(--c-black)] shadow-[0_3px_0_rgba(0,0,0,0.18)] transition-all active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.18)] disabled:opacity-30 disabled:pointer-events-none"
                          onClick={() => previousPhase && setPhaseNavigation({ direction: 'prev', targetPhase: previousPhase })}
                          data-testid="btn-prev-phase"
                          aria-label="Quay lại phase trước"
                        >
                          <img
                            src="/cartoon/icons/Arrow---Right.svg"
                            alt=""
                            className="h-5 w-5 object-contain rotate-180"
                            draggable={false}
                          />
                        </button>

                        {/* Current phase label */}
                        <div className="flex-1 min-w-0 text-center">
                          <div className="font-display text-[11px] text-[var(--c-gray)] leading-none">👑 Quản trò</div>
                          <div className="font-body text-[10px] text-black/55 truncate mt-0.5">
                            {PHASE_LABELS[gameStep] ?? gameStep}
                          </div>
                        </div>

                        {/* Next phase arrow */}
                        <button
                          type="button"
                          disabled={isNarratorNextDisabled}
                          className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[var(--c-green)] border-2 border-[var(--c-black)] shadow-[0_3px_0_rgba(0,0,0,0.18)] transition-all active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.18)] disabled:opacity-30 disabled:pointer-events-none"
                          onClick={() => !isNarratorNextDisabled && setPhaseNavigation({ direction: 'next', targetPhase: nextPhase })}
                          data-testid="btn-next-phase"
                          aria-label="Chuyển sang phase tiếp theo"
                        >
                          <img
                            src="/cartoon/icons/Arrow---Right.svg"
                            alt=""
                            className="h-5 w-5 object-contain"
                            draggable={false}
                          />
                        </button>
                      </div>
                    )}
                    {myPlayer?.isSender && (
                      <>
                        {gameStep === 'emotion-card' && (
                          <CartoonButton color="pink" size="md" className="w-full" onClick={() => openInventory('emotion')} data-testid="btn-select-emotion">
                            Chọn Cảm Xúc
                          </CartoonButton>
                        )}
                        {gameStep === 'reflection-card' && (
                          <>
                            {selectedCards.reflections.length < 3 && (
                              <CartoonButton color="blue" size="md" className="w-full" onClick={() => openInventory('reflection')} data-testid="btn-select-reflection">
                                Chọn thẻ ({selectedCards.reflections.length}/3)
                              </CartoonButton>
                            )}
                            {selectedCards.reflections.length > 0 && myPlayer?.isSender && (
                              <CartoonButton 
                                color="green" 
                                size="md" 
                                className="w-full mt-2" 
                                onClick={() => nextTurn(roomState.id)} 
                                data-testid="btn-confirm-reflection"
                              >
                                Xác nhận ({selectedCards.reflections.length} thẻ)
                              </CartoonButton>
                            )}
                          </>
                        )}
                        {gameStep === 'selfcare-card' && !selectedCards.selfcare && (
                          <CartoonButton color="teal" size="md" className="w-full" onClick={() => openInventory('selfcare')} data-testid="btn-select-selfcare">
                            Chọn thẻ
                          </CartoonButton>
                        )}
                        {gameStep === 'group-response' && (
                          <CartoonButton
                            color={hasConfirmedNtgRewards ? 'orange' : 'yellow'}
                            size="md"
                            className="w-full"
                            disabled={hasConfirmedNtgRewards}
                            onClick={() => {
                              if (!hasConfirmedNtgRewards) setShowNtgRewardPicker(true)
                            }}
                            data-testid="btn-open-ntg-reward-picker"
                          >
                            {hasConfirmedNtgRewards ? 'Đã chọn' : 'Tặng coin'}
                          </CartoonButton>
                        )}
                      </>
                    )}
                  </>
                }
              />
            )}
            renderPlayer={({ player, position, index }) => {
              if (!player) return null
              const isHealerToken = isMyHealerTurn && player.id === myPlayer?.id
              const isSilencerToken = isMySilencerTurn && player.id === myPlayer?.id
              const isProtectedNightTarget = player.isNarrator || player.isSender
              // Healer CAN heal self, Silencer CANNOT silence self
              const canHealTarget = isMyHealerTurn && !isProtectedNightTarget
              const canSilenceTarget = isMySilencerTurn && !isProtectedNightTarget && player.id !== myPlayer?.id
              const canNightActionTarget = canHealTarget || canSilenceTarget
              const selectedNightActionTarget = selectedNightAction?.targetId === player.id
              const nightActionTone = selectedNightActionTarget
                ? selectedNightAction?.type
                : canSilenceTarget
                  ? 'silence'
                  : 'heal'
              const actionTone = nightActionTone
              const isActiveNightRole =
                (gameStep === 'healer-turn' && player.role === healerRole && !healerActionDone) ||
                (gameStep === 'silencer-turn' && player.role === silencerRole && !silencerActionDone)
              const canSeeActiveNightRole = isActiveNightRole && (isNarrator || player.isMe)
              const activeNightActionIcon = gameStep === 'silencer-turn'
                ? '/cartoon/icons/Lock-Sliver.svg'
                : '/cartoon/icons/Potion-Green-Border.svg'
              const countdownKey = getCountdownKeyForPlayer(player)
              
              // Only disable click on self during SILENCER turn (healer can heal self)
              const isSilencerTurnAndSelf = isMySilencerTurn && player.id === myPlayer?.id
              
              return (
                <MiniPlayerToken
                  key={player.id}
                  player={player}
                  index={index}
                  isTop={position === 'top'}
                  isBottom={position === 'bottom'}
                  showActionIcon={isHealerToken || isSilencerToken || (isNarrator && isActiveNightRole)}
                  showRoleLabel={isNarrator || player.isMe}
                  hideRoleBadge={hideOtherPlayerBadges}
                  isNightDimmed={isNight && !canSeeActiveNightRole}
                  showSleepEffect={isNight && !canSeeActiveNightRole && !canNightActionTarget && !selectedNightActionTarget}
                  isRoleActive={canSeeActiveNightRole}
                  showCountdown={Boolean(countdownKey)}
                  countdownKey={countdownKey ?? undefined}
                  countdownDurationSec={currentTurnCountdownDuration}
                  actionIconSrc={isSilencerToken || (isNarrator && isActiveNightRole) ? activeNightActionIcon : '/cartoon/icons/Potion-Green-Border.svg'}
                  actionIconSide={position === 'right' ? 'left' : 'right'}
                  isActionTarget={canNightActionTarget}
                  actionTargetTone={actionTone}
                  isSelectedActionTarget={selectedNightActionTarget}
                  showCheckmark={
                    (canNightActionTarget && !selectedNightAction?.confirmed) ||
                    (selectedNightActionTarget && selectedNightAction?.confirmed)
                  }
                  onClick={isSilencerTurnAndSelf ? undefined : () => setExpandedPlayer(player)}
                  onActionClick={
                    canHealTarget
                      ? () => handleHealTarget(player.id)
                      : canSilenceTarget
                        ? () => handleSilenceTarget(player.id)
                        : undefined
                  }
                  onUpdateProfile={onUpdateProfile}
                />
              )
            }}
          />
        </div>

      </div>

      <AnimatePresence>
        {gameStep === 'situation-card' && myPlayer?.isSender && !selectedCards.situation && situationChoices.length > 0 && (
          <RandomSituationFan
            cards={situationChoices}
            selectedCard={selectedSituationChoice}
            onPick={setSelectedSituationChoice}
            onConfirm={handleConfirmSituationChoice}
          />
        )}
      </AnimatePresence>

      {/* ── Phase overlays ─────────────────────────────────────────────────── */}
      <AnimatePresence>
      </AnimatePresence>

      <AnimatePresence>
        {showNtgRewardPicker && gameStep === 'group-response' && myPlayer?.isSender && (
          <NtgRewardPicker
            players={players}
            rewardedIds={ntgVotedIds}
            pendingIds={pendingNtgRewardIds}
            onTogglePending={togglePendingNtgReward}
            onConfirm={confirmPendingNtgRewards}
            onClose={() => {
              setPendingNtgRewardIds(new Set())
              setShowNtgRewardPicker(false)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRoleRewardPicker && gameStep === 'reflection-sharing' && isNarrator && (
          <RoleRewardPicker
            players={players}
            ntgVotedIds={ntgVotedIds}
            onConfirm={handleRoleRewards}
            onClose={() => {
              setShowRoleRewardPicker(false)
              nextTurn(roomState.id)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStep === 'reflection-sharing' && isNarrator && !hasSharedReflection && !showRoleRewardPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-[320px] rounded-3xl bg-white px-6 py-5 shadow-[0_8px_0_rgba(0,0,0,0.12)] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="font-display text-lg text-[var(--c-pink)] mb-2">
                  Xác nhận phần thưởng
                </div>
                <div className="font-body text-sm text-black/65 leading-relaxed">
                  Người Trao Gửi đã chia sẻ đầy đủ cảm xúc và phản tư. Bạn có muốn trao thưởng +5 coin vàng không?
                </div>
              </div>
              
              <div className="flex gap-2">
                <CartoonButton
                  color="orange"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    console.log('[NTG Reward] Skip button clicked')
                    
                    // Check if there are eligible players for role rewards
                    const hasEligiblePlayers = players.some(p => 
                      p.role === 'Người Kết Nối' || 
                      p.role === 'Người Gợi Mở' || 
                      p.role === 'Người Dẫn Lối'
                    )
                    
                    console.log('[NTG Reward] Has eligible players:', hasEligiblePlayers)
                    
                    setHasSharedReflection(true)
                    
                    if (hasEligiblePlayers) {
                      // Small delay to ensure popup transition
                      setTimeout(() => {
                        console.log('[NTG Reward] Opening RoleRewardPicker')
                        setShowRoleRewardPicker(true)
                      }, 100)
                    } else {
                      console.log('[NTG Reward] No eligible players, advancing phase')
                      nextTurn(roomState.id)
                    }
                  }}
                >
                  Bỏ qua
                </CartoonButton>
                <CartoonButton
                  color="green"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    console.log('[NTG Reward] Confirm button clicked')
                    shareReflection(roomState.id, 'Quản trò xác nhận NTG hoàn thành vai trò')
                    
                    // Check if there are eligible players for role rewards
                    const hasEligiblePlayers = players.some(p => 
                      p.role === 'Người Kết Nối' || 
                      p.role === 'Người Gợi Mở' || 
                      p.role === 'Người Dẫn Lối'
                    )
                    
                    console.log('[NTG Reward] Has eligible players:', hasEligiblePlayers)
                    
                    setHasSharedReflection(true)
                    
                    if (hasEligiblePlayers) {
                      // Small delay to ensure popup transition
                      setTimeout(() => {
                        console.log('[NTG Reward] Opening RoleRewardPicker')
                        setShowRoleRewardPicker(true)
                      }, 100)
                    } else {
                      console.log('[NTG Reward] No eligible players, advancing phase')
                      nextTurn(roomState.id)
                    }
                  }}
                >
                Xác nhận
                </CartoonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStep === 'guess-silencer' && !isNarrator && !isMySilencerRole && (
          <GuessSilencerOverlay players={players} hasVoted={hasVoted} onVote={handleVoteSilencer} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStep === 'reveal-silencer' && (
          <RevealSilencerOverlay
            players={players}
            votes={roomState.votes ?? {}}
            onCloseComplete={showRevealRewardPreview}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStep === 'reward' && (
          <RewardOverlay
            players={players}
            currentRound={currentRound}
            totalRounds={totalRounds}
            isNarrator={isNarrator}
            onNext={() => nextTurn(roomState.id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStep === 'ended' && <EndedOverlay players={players} onLeave={onLeave} />}
      </AnimatePresence>

      <AnimatePresence>
        {flyingActionEffect && (
          <FlyingActionIconEffect
            fromId={flyingActionEffect.fromId}
            toId={flyingActionEffect.toId}
            iconSrc={flyingActionEffect.iconSrc}
            nonce={flyingActionEffect.nonce}
            onDone={() => {
              setFlyingActionEffect(null)
              setSelectedNightAction(null)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNightAction && !selectedNightAction.confirmed && (
          <motion.div
            className="absolute inset-0 z-[72] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNightAction(null)}
          >
            <motion.div
              className="w-full max-w-[320px] rounded-[28px] border-[3px] border-[var(--c-black)] bg-white px-4 py-5 text-center shadow-[0_8px_0_rgba(0,0,0,0.24)]"
              initial={{ scale: 0.86, y: 26 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.86, y: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={selectedNightAction.iconSrc} alt="" className="mx-auto mb-2 h-12 w-12 object-contain" draggable={false} />
              <div className="font-display text-base text-[var(--c-black)]">
                {selectedNightAction.type === 'heal' ? 'Xác nhận bảo vệ' : 'Xác nhận làm im lặng'}
              </div>
              <div className="mt-1 font-body text-sm leading-snug text-black/65">
                {selectedNightAction.type === 'heal'
                  ? selectedNightAction.targetId === myPlayer?.id
                    ? 'Người Chữa Lành sẽ bảo vệ bản thân.'
                    : `Người Chữa Lành sẽ bảo vệ ${selectedNightAction.targetName}.`
                  : `Người Im Lặng sẽ chọn ${selectedNightAction.targetName}.`}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <CartoonButton color="orange" size="sm" onClick={() => setSelectedNightAction(null)}>
                  Hủy
                </CartoonButton>
                <CartoonButton
                  color={selectedNightAction.type === 'heal' ? 'green' : 'purple'}
                  size="sm"
                  onClick={() => {
                    const action = selectedNightAction
                    if (action.type === 'heal') confirmHealTarget(action.targetId)
                    else confirmSilenceTarget(action.targetId)
                  }}
                >
                  Xác nhận
                </CartoonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[65] flex items-end justify-center bg-black/55 backdrop-blur-sm px-3 pb-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ y: 80, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 80, scale: 0.96 }}
              className="w-full max-w-[404px] max-h-[78dvh] overflow-hidden rounded-[28px] border-[3px] border-[var(--c-black)] bg-white shadow-[0_8px_0_rgba(0,0,0,0.22)]"
              onClick={(e) => e.stopPropagation()}
              data-testid="history-log-panel"
            >
              <div className="flex items-center justify-between gap-3 border-b-[3px] border-[var(--c-black)] bg-[var(--c-pink)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <img src="/cartoon/icons/Book.svg" alt="" className="h-7 w-7 object-contain" draggable={false} />
                  <div>
                    <div className="font-display text-sm text-white">Nhật ký lượt chơi</div>
                    <div className="font-body text-[11px] text-white/80">Round {currentRound}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="font-display text-xl leading-none text-white"
                  onClick={() => setShowHistory(false)}
                  aria-label="Đóng nhật ký"
                >
                  x
                </button>
              </div>

              <div className="max-h-[62dvh] overflow-y-auto scroll-cartoon px-3 py-3">
                {visibleRoundLogs.length === 0 ? (
                  <div className="rounded-2xl bg-[var(--c-gray-pale)] px-3 py-4 text-center font-body text-xs text-[var(--c-gray)]">
                    Chưa có sự kiện nào trong round này.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {visibleRoundLogs.map(({ entry, item }, index) => {
                      return (
                        <div key={`${entry.timestamp}-${entry.type}-${index}`} className="rounded-2xl bg-[var(--c-sky-mist)] px-3 py-2">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white font-display text-[10px] text-[var(--c-pink)]">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-display text-[11px] leading-snug text-[var(--c-black)]">{item.title}</div>
                              <div className="font-body text-[11px] leading-snug text-black/60">{item.detail}</div>
                              {item.card && (
                                <button
                                  type="button"
                                  className="mt-2 h-24 w-16 overflow-hidden rounded-[14px] border-2 border-[var(--c-black)] bg-white shadow-[0_3px_0_rgba(0,0,0,0.18)]"
                                  onClick={() => {
                                    setShowHistory(false)
                                    setCardPreview({ card: item.card!, revealed: true })
                                  }}
                                  data-testid={`history-card-${item.card.id}`}
                                >
                                  <img src={item.card.frontImage} alt={item.card.id} className="h-full w-full object-cover" draggable={false} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role reveal overlay - blocks gameplay clicks while everyone inspects roles */}
      <AnimatePresence>
        {showRoleRevealOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="role-reveal-all-overlay"
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              className="w-full max-w-[430px] max-h-[92dvh] flex flex-col gap-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="font-display text-2xl text-white">Chia vai trò</div>
                <div className="font-body text-xs text-white/70">Đây là vai trò của bạn trong lượt này</div>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 px-2 py-4">
                {myPlayer && (
                  <>
                    <FlipCard
                      frontImage={CARD_IMAGES.roles.back}
                      backImage={ROLE_TO_IMAGE[myPlayer.role] || CARD_IMAGES.roles.back}
                      altText={myPlayer.role}
                      size="large"
                      autoFlipDelayMs={450}
                    />
                    <div className="font-display text-lg text-white text-center leading-tight max-w-[280px]">
                      {myPlayer.role}
                    </div>
                  </>
                )}
              </div>

              <CartoonButton
                color="green"
                size="lg"
                className="w-full"
                data-testid="btn-close-role-reveal"
                onClick={() => setDismissedRoleRevealRound(currentRound)}
              >
                Đã xem vai trò
              </CartoonButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coin card overlay */}
      <AnimatePresence>
        {coinPreview && (
          <CoinCarousel
            initialCoinType={coinPreview.coinType}
            title={coinPreview.title}
            coins={myCoinCount}
            onClose={() => setCoinPreview(null)}
          />
        )}
      </AnimatePresence>

      {/* Selected card preview */}
      <AnimatePresence>
        {cardPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setCardPreview(null)}
          >
            <FlipCard
              frontImage={cardPreview.card.frontImage}
              backImage={cardPreview.card.backImage}
              altText={cardPreview.card.id}
              size="large"
              initialFlipped={!cardPreview.revealed}
              allowFlip={cardPreview.revealed}
              onClose={() => setCardPreview(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role card overlay */}
      <AnimatePresence>
        {expandedPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="role-card-overlay"
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setExpandedPlayer(null)}
          >
            <FlipCard
              frontImage={CARD_IMAGES.roles.back}
              backImage={ROLE_TO_IMAGE[expandedPlayer.role] || CARD_IMAGES.roles.back}
              altText={expandedPlayer.role}
              size="large"
              onClose={() => setExpandedPlayer(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card inventory */}
      <AnimatePresence>
        {showInventory && (
          <CardInventory
            onClose={() => setShowInventory(false)}
            onSelectCard={handleInventorySelect}
            allowedCategory={inventoryMode.category}
            allowedEmotionGroups={roomEmotionGroups}
            allowedSituationGroups={roomSituationGroups}
            showConfirmButton={inventoryMode.showConfirm}
          />
        )}
      </AnimatePresence>

      {/* Phase navigation confirmation popup */}
      <AnimatePresence>
        {phaseNavigation && (
          <motion.div
            className="absolute inset-0 z-[72] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPhaseNavigation(null)}
          >
            <motion.div
              className="w-full max-w-[320px] rounded-[28px] border-[3px] border-[var(--c-black)] bg-white px-4 py-5 text-center shadow-[0_8px_0_rgba(0,0,0,0.24)]"
              initial={{ scale: 0.86, y: 26 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.86, y: 26 }}
              onClick={(e) => e.stopPropagation()}
              data-testid="phase-nav-confirm-popup"
            >
              <img
                src={phaseNavigation.direction === 'next' ? '/cartoon/icons/Arrow---Right.svg' : '/cartoon/icons/Arrow---Left.svg'}
                alt=""
                className="mx-auto mb-2 h-10 w-10 object-contain"
                draggable={false}
              />
              <div className="font-display text-base text-[var(--c-black)]">
                {phaseNavigation.direction === 'next' ? 'Chuyển sang phase tiếp theo?' : 'Quay lại phase trước?'}
              </div>
              <div className="mt-1 font-body text-sm leading-snug text-black/65">
                {phaseNavigation.direction === 'next'
                  ? <>Sẽ chuyển từ <strong>{PHASE_LABELS[gameStep] ?? gameStep}</strong> sang <strong>{PHASE_LABELS[phaseNavigation.targetPhase] ?? phaseNavigation.targetPhase}</strong></>
                  : <>Sẽ quay lại <strong>{PHASE_LABELS[phaseNavigation.targetPhase] ?? phaseNavigation.targetPhase}</strong> để người chơi chọn lại</>}
              </div>
              {phaseNavigation.direction === 'prev' && (
                <div className="mt-2 rounded-xl bg-amber-50 px-3 py-1.5 font-body text-[11px] text-amber-700 leading-snug">
                  ⚠️ Các hành động ở phase hiện tại có thể bị reset
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <CartoonButton color="orange" size="sm" onClick={() => setPhaseNavigation(null)}>
                  Hủy
                </CartoonButton>
                <CartoonButton
                  color={phaseNavigation.direction === 'next' ? 'green' : 'blue'}
                  size="sm"
                  onClick={() => {
                    if (phaseNavigation.direction === 'next') {
                      nextTurn(roomState.id)
                    } else {
                      prevTurn(roomState.id)
                    }
                    setPhaseNavigation(null)
                  }}
                >
                  {phaseNavigation.direction === 'next' ? 'Tiếp tục' : 'Quay lại'}
                </CartoonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GameMenuModal
        open={showMenu}
        onClose={() => setShowMenu(false)}
        onGuide={() => setShowMenu(false)}
        onQuit={() => { setShowMenu(false); onLeave() }}
      />

      {/* NTG Reward Success Popup */}
      <AnimatePresence>
        {ntgRewardSuccess && (
          <motion.div
            className="absolute inset-0 z-[80] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNtgRewardSuccess(null)}
          >
            <motion.div
              className="relative w-full max-w-[300px] rounded-3xl bg-white px-6 py-5 text-center shadow-[0_8px_0_rgba(0,0,0,0.12)]"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src="/cartoon/icons/Checkmark.svg" alt="Success" className="w-16 h-16 mx-auto mb-3" />
              <div className="font-display text-lg text-[var(--c-black)] mb-2">
                Tặng coin thành công
              </div>
              <div className="font-body text-sm text-black/65 leading-relaxed">
                Bạn đã tặng coin cho {ntgRewardSuccess.names.join(', ')}
              </div>
              <CartoonButton
                color="green"
                size="md"
                className="w-full mt-4"
                onClick={() => setNtgRewardSuccess(null)}
              >
                Đóng
              </CartoonButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
