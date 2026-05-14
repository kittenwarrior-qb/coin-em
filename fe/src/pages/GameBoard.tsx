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
  const [coinPreview, setCoinPreview] = useState<{ front: string; back: string; alt: string } | null>(null)
  const [flyingActionEffect, setFlyingActionEffect] = useState<{ fromId: string; toId: string; iconSrc: string; nonce: number } | null>(null)

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
  const { setPlayers, selectCard }         = useGameActions()
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

  // ─── Handlers ──────────────────────────────────────────────────────────────

  // reserved stubs — will be wired up when give-coins / night phases are re-implemented
  // const sendCoin = ...
  // const handleNightAction = ...

  const handleDrawSituation = () => {
    const card = CARD_DATA.situation[Math.floor(Math.random() * CARD_DATA.situation.length)]
    selectCard(card, 'situation')
    emitSelectCard(roomState.id, card)
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
    if (hasVoted) return
    submitVote(roomState.id, id)
    setHasVoted(true)
  }

  const handleHealTarget = (targetId: string) => {
    if (!myPlayer || hasHealed) return
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
    if (!myPlayer || hasSilenced || targetId === myPlayer.id) return
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
    if (gameStep === 'emotion-card')    handleSelectCard(card, 'emotion')
    else if (gameStep === 'reflection-card') handleSelectCard(card, 'reflection')
    else if (gameStep === 'selfcare-card')   handleSelectCard(card, 'selfcare')
  }

  const openInventory = (category?: CardData['category']) => {
    setInventoryMode({ category, showConfirm: !!category })
    setShowInventory(true)
  }

  // ─── Derived ───────────────────────────────────────────────────────────────
  const currentRound = roomState.currentRound || 1
  const totalRounds  = roomState.totalRounds || 1
  const myCoinCount  = myPlayer?.coins || { red: 0, yellow: 0, green: 0 }
  const healerActionDone = roomState.nightActions?.healed || hasHealed
  const silencerActionDone = roomState.nightActions?.silenced || hasSilenced
  const canShowMyRole =
    !!myPlayer?.role &&
    myPlayer.role !== 'Chưa chia vai trò' &&
    myPlayer.role !== 'ChÆ°a chia vai trÃ²'
  const showRoleRevealOverlay =
    gameStep === 'role-reveal' &&
    dismissedRoleRevealRound !== currentRound &&
    canShowMyRole
  const showTurnStatus = gameStep !== 'role-reveal' || dismissedRoleRevealRound === currentRound

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

  // ─── Render ────────────────────────────────────────────────────────────────
  const isNight = ['night', 'healer-turn', 'silencer-turn'].includes(gameStep)
  const healerRole = Object.keys(ROLE_TO_IMAGE)[2]
  const silencerRole = Object.keys(ROLE_TO_IMAGE)[5]
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
          className="absolute top-2 right-2 z-10"
          style={{ height: 38, width: 38 }}
          onClick={() => setShowMenu(true)}
          aria-label="Menu"
        />

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

        {/* Player layout around center board */}
        <div data-testid="players-grid" className="relative z-10 flex-1 min-h-0 mt-10 h-full">
          <PlayerLayout
            players={players}
            renderCenter={() => (
              <TableBoard
                selectedCards={selectedCards}
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
                        {gameStep === 'situation-card' && (
                          <CartoonButton color="yellow" size="md" className="w-full" onClick={handleDrawSituation} data-testid="btn-draw-situation">
                            📋 Bốc thẻ Tình huống
                          </CartoonButton>
                        )}
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
              const canHealTarget = isMyHealerTurn
              const canSilenceTarget = isMySilencerTurn && player.id !== myPlayer?.id
              const canNightActionTarget = canHealTarget || canSilenceTarget
              return (
                <MiniPlayerToken
                  key={player.id}
                  player={player}
                  index={index}
                  isTop={position === 'top'}
                  isBottom={position === 'bottom'}
                  showActionIcon={isHealerToken || isSilencerToken}
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
        {gameStep === 'guess-silencer' && (
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
