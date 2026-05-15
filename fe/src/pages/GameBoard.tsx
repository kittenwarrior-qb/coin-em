import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import { CARD_IMAGES, ROLE_TO_IMAGE } from '../constants/cardImages'
import { useGameStore } from '../stores'
import { useGameState, useGameActions, useGameUI } from '../hooks/useGameState'
import { useGameFlow } from '../hooks/useGameFlow'
import type { CardData } from '../stores/types'
import { PHASE_LABELS } from '../stores/types'

import { CartoonButton, CartoonCircleButton } from '@/components/cartoon'
import { TableBoard }      from '@/components/game/TableBoard'
import { FlipCard }         from '@/components/game/FlipCard'
import { CardInventory, CARD_DATA } from '@/components/game/CardInventory'
import { PlayerLayout }     from '@/components/game/PlayerLayout'
import { MiniPlayerToken }  from '@/components/game/MiniPlayerToken'
import { CoinDisplay }      from '@/components/game/CoinDisplay'
import { GameMenuModal }    from '@/components/lobby/GameMenuModal'
import {
  GroupResponseOverlay,
  ReflectionSharingOverlay,
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
}

function RandomSituationFan({
  cards,
  selectedCard,
  onPick,
  onConfirm,
}: {
  cards: CardData[]
  selectedCard: CardData | null
  onPick: (card: CardData) => void
  onConfirm: () => void
}) {
  const [activePosition, setActivePosition] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const cardSpacing = 58

  const wrapPosition = (position: number) => {
    if (!cards.length) return 0
    return ((position % cards.length) + cards.length) % cards.length
  }

  const shortestDiff = (index: number, center: number) => {
    if (!cards.length) return 0
    const raw = index - center
    return ((raw + cards.length / 2) % cards.length + cards.length) % cards.length - cards.length / 2
  }

  const pickCard = (card: CardData, index: number) => {
    setActivePosition(index)
    setDragOffset(0)
    onPick(card)
  }

  const visualCenter = wrapPosition(activePosition - dragOffset / cardSpacing)
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      className="absolute inset-x-0 bottom-4 z-30 mx-auto w-full max-w-[430px] overflow-hidden px-3"
      data-testid="random-situation-fan"
    >
      <div className="rounded-2xl bg-white/75 px-3 py-2 text-center mb-2">
        <div className="font-display text-xs text-[var(--c-gray)]">Chọn một thẻ tình huống</div>
        <div className="font-body text-[11px] text-black/55">Kéo qua lại để xem bộ thẻ úp</div>
      </div>
      <div className="flex h-52 items-center justify-center">
        <AnimatePresence mode="wait">
          {selectedCard && (
            <motion.div
              key={selectedCard.id}
              initial={{ opacity: 0, y: 28, scale: 0.86 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.9 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="h-44 w-[7.35rem] overflow-hidden rounded-[14px] border border-[var(--c-black)] bg-white shadow-[0_7px_0_rgba(0,0,0,0.2)]" style={{ borderWidth: 1 }}>
                <img src={selectedCard.backImage} alt="" className="h-full w-full object-cover" draggable={false} />
              </div>
              <CartoonButton color="green" size="sm" onClick={onConfirm} data-testid="btn-confirm-situation-card">
                Xac nhan gui
              </CartoonButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <motion.div
        className="relative h-64 overflow-hidden pb-2"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        onDrag={(_, info) => setDragOffset(info.offset.x)}
        onDragEnd={(_, info) => {
          const momentum = clamp(info.velocity.x * 0.08, -cardSpacing * 1.15, cardSpacing * 1.15)
          setActivePosition((current) => wrapPosition(current - (info.offset.x + momentum) / cardSpacing))
          setDragOffset(0)
        }}
        onWheel={(event) => {
          const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
          if (Math.abs(delta) < 2) return
          setActivePosition((current) => wrapPosition(current + delta / 180))
        }}
      >
        <div className="absolute left-1/2 top-5 h-56 w-0">
          {cards.map((card, index) => {
            const diff = shortestDiff(index, visualCenter)
            const absDiff = Math.abs(diff)
            const selected = selectedCard?.id === card.id
            if (absDiff > 4.25 && !selected) return null
            const x = diff * cardSpacing
            const y = Math.pow(absDiff, 1.45) * 10
            const rotate = Math.max(-10, Math.min(10, diff * 4.1))
            const scale = Math.max(0.9, 1.06 - absDiff * 0.04)
            const opacity = absDiff > 3.55 ? 0.35 : absDiff > 3.15 ? 0.65 : 1
            return (
              <motion.button
                key={card.id}
                type="button"
                initial={false}
                animate={{
                  opacity,
                  x,
                  y: selected ? y - 2 : y,
                  rotate,
                  scale: selected ? scale + 0.025 : scale,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.6 }}
                whileTap={{ scale: selected ? scale + 0.015 : scale * 0.985 }}
                onClick={() => pickCard(card, index)}
                className={[
                  'absolute top-0 h-44 w-[7.25rem] origin-bottom overflow-hidden rounded-[14px] border bg-white shadow-[0_6px_0_rgba(0,0,0,0.2)]',
                  selected ? 'border-[var(--c-yellow)]' : 'border-[var(--c-black)]',
                ].join(' ')}
                style={{ zIndex: selected ? 100 : Math.round(30 - absDiff * 5), marginLeft: -58, borderWidth: 1 }}
                data-testid={`random-situation-card-${index + 1}`}
              >
                <img src={card.backImage} alt="" className="h-full w-full object-cover" draggable={false} />
              </motion.button>
            )
          })}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white/70 px-2 py-0.5 font-body text-[10px] text-black/50">
          {cards.length ? `${(Math.round(wrapPosition(activePosition)) % cards.length) + 1}/${cards.length}` : '0/0'}
        </div>
      </motion.div>
    </motion.div>
  )
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
      initial={{ x: coords.from.x - 18, y: coords.from.y - 18, scale: 1, opacity: 0 }}
      animate={{
        x: coords.to.x - 18,
        y: coords.to.y - 18,
        scale: [1, 0.8, 0.2],
        opacity: [0, 1, 1, 0],
      }}
      transition={{ duration: 0.85, ease: [0.25, 0.8, 0.25, 1] }}
      onAnimationComplete={onDone}
      className="fixed left-0 top-0 z-[70] h-9 w-9 pointer-events-none object-contain"
      style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))' }}
    />
  )
}

export default function GameBoard({ roomState, mySocketId, myUserId, onLeave, onUpdateProfile }: GameBoardProps) {
  const { nextTurn, nightAction, selectCard: emitSelectCard, sendResponse, ntgVote, shareReflection, submitVote } = useSocket()
  const [showMenu, setShowMenu] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [coinPreview, setCoinPreview] = useState<{ front: string; back: string; alt: string } | null>(null)
  const [cardPreview, setCardPreview] = useState<{ card: CardData; revealed: boolean } | null>(null)
  const [flyingActionEffect, setFlyingActionEffect] = useState<{ fromId: string; toId: string; iconSrc: string; nonce: number } | null>(null)
  const [situationChoices, setSituationChoices] = useState<CardData[]>([])
  const [selectedSituationChoice, setSelectedSituationChoice] = useState<CardData | null>(null)

  // Phase-local state
  const [responseText,       setResponseText]       = useState('')
  const [reflectionShareText, setReflectionShareText] = useState('')
  const [hasResponded,       setHasResponded]       = useState(false)
  const [hasNTGVoted,        setHasNTGVoted]        = useState(false)
  const [hasSharedReflection, setHasSharedReflection] = useState(false)
  const [hasVoted,           setHasVoted]           = useState(false)
  const [hasHealed,           setHasHealed]          = useState(false)
  const [hasSilenced,         setHasSilenced]        = useState(false)

  // Stores
  const { players, myPlayer, isNarrator, selectedCards } = useGameState()
  const { setPlayers, selectCard, clearSelectedCards } = useGameActions()
  const { expandedPlayer, showInventory, inventoryMode, setExpandedPlayer, setShowInventory, setInventoryMode } = useGameUI()
  const { gameStep, handleSelectCard }                   = useGameFlow()
  const setMyIds      = useGameStore(s => s.setMyIds)
  const [dismissedRoleRevealRound, setDismissedRoleRevealRound] = useState<number | null>(null)

  // Init
  useEffect(() => { setMyIds(mySocketId, myUserId) }, [mySocketId, myUserId, setMyIds])

  // Sync players from roomState
  useEffect(() => {
    const converted = roomState.players.map(p => ({
      id: p.socketId,
      name: p.name,
      role: p.role || 'Chưa chia vai trò',
      isMe: p.userId ? p.userId === myUserId : p.socketId === mySocketId,
      isNarrator: p.isNarrator,
      isSender: p.isSender,
      isMuted: p.isMuted,
      isHealed: p.isHealed,
      isDisconnected: p.isDisconnected,
      disconnectedAt: p.disconnectedAt,
      avatarIndex: p.avatarIndex,
      bgIndex: p.bgIndex,
      coins: p.coins || { red: 0, yellow: 0, green: 0 },
    }))
    setPlayers(converted.sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : 0)))
  }, [roomState.players, mySocketId, myUserId, setPlayers])

  // Reset phase state on step change
  useEffect(() => {
    setResponseText(''); setReflectionShareText('')
    setHasResponded(false); setHasNTGVoted(false)
    setHasSharedReflection(false); setHasVoted(false)
    setHasHealed(false)
    setHasSilenced(false)
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
    if (!roomState.selectedCard?.category) {
      if (gameStep === 'role-reveal' || gameStep === 'night') clearSelectedCards()
      return
    }
    selectCard(roomState.selectedCard, roomState.selectedCard.category)
  }, [roomState.selectedCard, gameStep, selectCard, clearSelectedCards])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  // reserved stubs — will be wired up when give-coins / night phases are re-implemented
  // const sendCoin = ...
  // const handleNightAction = ...

  const getSituationChoices = () => {
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
  }

  useEffect(() => {
    if (gameStep !== 'situation-card' || !myPlayer?.isSender || selectedCards.situation || situationChoices.length > 0) return
    setSituationChoices(getSituationChoices())
  }, [gameStep, myPlayer?.isSender, selectedCards.situation, situationChoices.length])

  const handleConfirmSituationChoice = () => {
    if (!selectedSituationChoice) return
    selectCard(selectedSituationChoice, 'situation')
    emitSelectCard(roomState.id, selectedSituationChoice)
    setSituationChoices([])
    setSelectedSituationChoice(null)
  }

  const handleSendResponse = () => {
    if (!responseText.trim() || hasResponded) return
    sendResponse(roomState.id, responseText.trim())
    setHasResponded(true)
  }

  const handleNTGVote = (id: string) => {
    if (hasNTGVoted) return
    ntgVote(roomState.id, id)
    setHasNTGVoted(true)
  }

  const handleShareReflection = () => {
    if (hasSharedReflection) return
    shareReflection(roomState.id, reflectionShareText.trim())
    setHasSharedReflection(true)
  }

  const handleVoteSilencer = (id: string) => {
    if (hasVoted || isNarrator || isMySilencerRole) return
    submitVote(roomState.id, id)
    setHasVoted(true)
  }

  const handleHealTarget = (targetId: string) => {
    const target = players.find((p) => p.id === targetId)
    if (!myPlayer || hasHealed || !target || target.isNarrator || target.isSender) return
    setHasHealed(true)
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
    setHasSilenced(true)
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
          title: 'Lượt của quản trò',
          description: 'Đang đợi quản trò tiếp tục',
        }
      case 'night':
        return {
          title: 'Lượt của quản trò',
          description: 'Đang đợi quản trò chuyển sang ban đêm',
        }
      case 'healer-turn':
        if (healerActionDone) {
          return {
            title: 'Lượt của quản trò',
            description: 'Đang đợi quản trò tiếp tục',
          }
        }
        if (isMyHealerRole) {
          return {
            title: 'Lượt của bạn',
            description: 'Chọn người cần bảo vệ, trừ Quản trò và Người Trao Gửi',
          }
        }
        return {
          title: 'Lượt của Người Chữa Lành',
          description: 'Đang đợi Người Chữa Lành chọn người bảo vệ',
        }
      case 'silencer-turn':
        if (silencerActionDone) {
          return {
            title: 'Lượt của quản trò',
            description: 'Đang đợi quản trò tiếp tục',
          }
        }
        if (isMySilencerRole) {
          return {
            title: 'Lượt của bạn',
            description: 'Chọn người cần làm im lặng, trừ Quản trò và Người Trao Gửi',
          }
        }
        return {
          title: 'Lượt của Người Im Lặng',
          description: 'Đang đợi Người Im Lặng chọn mục tiêu',
        }
      case 'situation-card':
        return {
          title: 'Lượt của Người Trao Gửi',
          description: 'Đang đợi Người Trao Gửi bốc thẻ tình huống',
        }
      case 'emotion-card':
        return {
          title: 'Lượt của Người Trao Gửi',
          description: 'Đang đợi Người Trao Gửi chọn thẻ cảm xúc',
        }
      case 'story-telling':
        return {
          title: 'Lượt kể chuyện',
          description: 'Đang đợi Người Trao Gửi chia sẻ câu chuyện',
        }
      case 'group-response':
        return {
          title: 'Lượt phản hồi nhóm',
          description: 'Mọi người cùng gửi phản hồi',
        }
      case 'reflection-card':
        return {
          title: 'Lượt của Người Trao Gửi',
          description: 'Đang đợi chọn thẻ phản tư',
        }
      case 'reflection-sharing':
        return {
          title: 'Lượt chia sẻ phản tư',
          description: 'Đang đợi Người Trao Gửi chia sẻ',
        }
      case 'selfcare-card':
        return {
          title: 'Lượt chọn bí kíp ôm',
          description: 'Đang đợi người phụ trách chọn thẻ',
        }
      case 'hug-action':
        return {
          title: 'Lượt hành động ôm',
          description: 'Đang đợi nhóm thực hiện hành động ôm',
        }
      case 'guess-silencer':
        return {
          title: 'Lượt đoán Người Im Lặng',
          description: 'Mọi người cùng bình chọn',
        }
      case 'reveal-silencer':
        return {
          title: 'Lượt tiết lộ vai trò',
          description: 'Đang xem kết quả Người Im Lặng',
        }
      case 'give-coins':
        return {
          title: 'Lượt tặng coin',
          description: 'Mọi người tặng coin cho nhau',
        }
      case 'reward':
        return {
          title: 'Tổng kết lượt',
          description: 'Đang đợi quản trò sang lượt tiếp theo',
        }
      default:
        return {
          title: PHASE_LABELS[gameStep] ?? gameStep,
          description: 'Đang đợi lượt tiếp theo',
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
        return {
          title: narratorTitle,
          detail: `Cả bàn chuyển sang: ${phaseName(entry.data?.phase) ?? 'giai đoạn tiếp theo'}.`,
        }
      case 'SILENCE':
        return {
          title: 'Người Im Lặng đã chọn mục tiêu',
          detail: `${targetName} sẽ bị im lặng trong lượt này.`,
        }
      case 'HEAL':
        return {
          title: 'Người Chữa Lành đã bảo vệ một người chơi',
          detail: `${targetName} được bảo vệ khỏi hiệu ứng im lặng.`,
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
          <CoinDisplay coins={myCoinCount} onCoinClick={(front, back, alt) => setCoinPreview({ front, back, alt })} />
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

        {/* Phase info */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
          <div
            className="px-3 py-1 text-center rounded-full"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }}
          >
            <div data-testid="game-phase" data-phase={gameStep} className="font-display text-[10px] text-white/70">
              Round {currentRound}/{totalRounds} · {gameStep}
            </div>
          </div>
        </div>

        {disconnectedPlayers.length > 0 && (
          <div className="absolute top-12 left-1/2 z-20 w-[min(92%,360px)] -translate-x-1/2 rounded-2xl bg-white/90 px-3 py-2 text-center shadow-[0_4px_0_rgba(0,0,0,0.16)]">
            <div className="font-display text-[11px] text-[var(--c-pink)]">
              {disconnectedPlayers.length} nguoi choi da roi phong
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
                selectedCards={selectedCards}
                revealSituation={gameStep !== 'situation-card'}
                onCardClick={(card) => setCardPreview({ card, revealed: true })}
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
                      <CartoonButton
                        color="green"
                        size="md"
                        className="w-full"
                        onClick={() => nextTurn(roomState.id)}
                        data-testid="btn-next-turn"
                      >
                        👑 {PHASE_LABELS[gameStep] ?? gameStep}
                      </CartoonButton>
                    )}
                    {myPlayer?.isSender && (
                      <>
                        {gameStep === 'emotion-card' && (
                          <CartoonButton color="pink" size="md" className="w-full" onClick={() => openInventory('emotion')} data-testid="btn-select-emotion">
                            💭 Chọn thẻ Cảm xúc
                          </CartoonButton>
                        )}
                        {gameStep === 'reflection-card' && selectedCards.reflections.length < 3 && (
                          <CartoonButton color="blue" size="md" className="w-full" onClick={() => openInventory('reflection')} data-testid="btn-select-reflection">
                            🤔 Chọn Reflection ({selectedCards.reflections.length}/3)
                          </CartoonButton>
                        )}
                        {gameStep === 'selfcare-card' && !selectedCards.selfcare && (
                          <CartoonButton color="teal" size="md" className="w-full" onClick={() => openInventory('selfcare')} data-testid="btn-select-selfcare">
                            🌟 Chọn Bí kíp ôm
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
              const canHealTarget = isMyHealerTurn && !isProtectedNightTarget
              const canSilenceTarget = isMySilencerTurn && !isProtectedNightTarget && player.id !== myPlayer?.id
              const canNightActionTarget = canHealTarget || canSilenceTarget
              return (
                <MiniPlayerToken
                  key={player.id}
                  player={player}
                  index={index}
                  isTop={position === 'top'}
                  isBottom={position === 'bottom'}
                  showActionIcon={isHealerToken || isSilencerToken}
                  showRoleLabel={isNarrator || player.isMe}
                  actionIconSrc={isSilencerToken ? '/cartoon/icons/Lock-Sliver.svg' : '/cartoon/icons/Potion-Green-Border.svg'}
                  actionIconSide={position === 'right' ? 'left' : 'right'}
                  isActionTarget={canNightActionTarget}
                  onClick={() => setExpandedPlayer(player)}
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
        {gameStep === 'group-response' && (
          <GroupResponseOverlay
            players={players}
            myPlayer={myPlayer ?? null}
            responseText={responseText}
            hasResponded={hasResponded}
            hasNTGVoted={hasNTGVoted}
            onChangeResponse={setResponseText}
            onSendResponse={handleSendResponse}
            onNTGVote={handleNTGVote}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStep === 'reflection-sharing' && myPlayer?.isSender && (
          <ReflectionSharingOverlay
            text={reflectionShareText}
            hasShared={hasSharedReflection}
            onChange={setReflectionShareText}
            onShare={handleShareReflection}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStep === 'guess-silencer' && !isNarrator && !isMySilencerRole && (
          <GuessSilencerOverlay players={players} hasVoted={hasVoted} onVote={handleVoteSilencer} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStep === 'reveal-silencer' && <RevealSilencerOverlay players={players} />}
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
            onDone={() => setFlyingActionEffect(null)}
          />
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setCoinPreview(null)}
          >
            <FlipCard
              frontImage={coinPreview.front}
              backImage={coinPreview.back}
              altText={coinPreview.alt}
              size="large"
              aspect="coin"
              onClose={() => setCoinPreview(null)}
            />
          </motion.div>
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

      <GameMenuModal
        open={showMenu}
        onClose={() => setShowMenu(false)}
        onGuide={() => setShowMenu(false)}
        onQuit={() => { setShowMenu(false); onLeave() }}
      />
    </div>
  )
}
