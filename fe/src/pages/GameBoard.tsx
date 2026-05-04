import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import { CARD_IMAGES, ROLE_TO_IMAGE } from '../constants/cardImages'
import { useGameStore, useUIStore } from '../stores'
import { useGameState, useGameActions, useGameUI } from '../hooks/useGameState'
import { useGameFlow } from '../hooks/useGameFlow'
import type { CardData } from '../stores/types'
import { PHASE_LABELS } from '../stores/types'

import { CartoonButton, CartoonCircleButton, QuitConfirmModal } from '@/components/cartoon'
import { CoinStack }        from '@/components/game/CoinStack'
import { CenterBoard }      from '@/components/game/CenterBoard'
import { FlipCard }         from '@/components/game/FlipCard'
import { CardInventory, CARD_DATA } from '@/components/game/CardInventory'
import { PlayerLayout }     from '@/components/game/PlayerLayout'
import { MiniPlayerToken }  from '@/components/game/MiniPlayerToken'
import {
  GroupResponseOverlay,
  ReflectionSharingOverlay,
  GuessSilencerOverlay,
  RevealSilencerOverlay,
  RewardOverlay,
  EndedOverlay,
} from '@/components/game/PhaseOverlays'
import type { CoinType, RoomState } from '@/components/game/types'

interface GameBoardProps {
  roomId: string
  roomState: RoomState
  mySocketId: string
  myUserId: string
  onLeave: () => void
  onUpdateProfile?: (name: string, avatarIndex: number, bgIndex: number) => void
}

export default function GameBoard({ roomState, mySocketId, myUserId, onLeave, onUpdateProfile }: GameBoardProps) {
  const { nightAction: emitNightAction, nextTurn, selectCard: emitSelectCard, sendResponse, ntgVote, shareReflection, giveCoin, submitVote } = useSocket()
  const [showQuit, setShowQuit] = useState(false)

  // Phase-local state
  const [responseText,       setResponseText]       = useState('')
  const [reflectionShareText, setReflectionShareText] = useState('')
  const [hasResponded,       setHasResponded]       = useState(false)
  const [hasNTGVoted,        setHasNTGVoted]        = useState(false)
  const [hasSharedReflection, setHasSharedReflection] = useState(false)
  const [hasVoted,           setHasVoted]           = useState(false)

  // Stores
  const { players, myPlayer, isNarrator, selectedCards } = useGameState()
  const { setPlayers, updatePlayer, selectCard }         = useGameActions()
  const { expandedPlayer, showInventory, inventoryMode, setExpandedPlayer, setShowInventory, setInventoryMode } = useGameUI()
  const { gameStep, handleSelectCard }                   = useGameFlow()
  const flyCoins      = useUIStore(s => s.flyCoins)
  const addFlyingCoin = useUIStore(s => s.addFlyingCoin)
  const setMyIds      = useGameStore(s => s.setMyIds)
  const hasShownRoleRef = useRef(false)

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
  }, [gameStep])

  // Auto-show role card once
  useEffect(() => {
    if (gameStep === 'role-reveal' && !myPlayer?.role) hasShownRoleRef.current = false
  }, [gameStep, myPlayer?.role])

  useEffect(() => {
    if (!myPlayer || hasShownRoleRef.current) return
    if (myPlayer.role && myPlayer.role !== 'Chưa chia vai trò') {
      hasShownRoleRef.current = true
      const t = setTimeout(() => setExpandedPlayer(myPlayer ?? null), 800)
      return () => clearTimeout(t)
    }
  }, [myPlayer, setExpandedPlayer])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const sendCoin = (_targetId: string, _coin: CoinType) => {
    // reserved for give-coins phase
  }

  const handleNightAction = (_targetId: string) => {
    // reserved for night phases
  }

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
  const gamePhase    = roomState.phase || 'role-reveal'
  const currentRound = roomState.currentRound || 1
  const totalRounds  = roomState.totalRounds || 1
  const myCoinCount  = myPlayer?.coins || { red: 0, yellow: 0, green: 0 }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[var(--c-bg)] flex items-center justify-center overflow-hidden">
      <div className="relative w-full max-w-sm h-full bg-white p-4 flex flex-col gap-4">

        {/* Coin stack */}
        <CoinStack coins={myCoinCount} />

        {/* Leave button */}
        <CartoonCircleButton
          color="gray"
          size="sm"
          className="absolute top-2 right-2 z-10"
          onClick={() => setShowQuit(true)}
          aria-label="Rời phòng"
        >
          ←
        </CartoonCircleButton>

        {/* Phase info */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
          <div className="card-cartoon card-cartoon-sm px-3 py-1 text-center">
            <div data-testid="game-phase" data-phase={gameStep} className="font-display text-[10px] text-[var(--c-gray)]">
              Round {currentRound}/{totalRounds} · {gameStep}
            </div>
          </div>
        </div>

        {/* Center board */}

        {/* Player layout around center board */}
        <div data-testid="players-grid" className="flex-1 min-h-0 mt-10">
          <PlayerLayout
            players={players}
            renderCenter={() => (
              <CenterBoard selectedCards={selectedCards} />
            )}
            renderPlayer={({ player, position, index }) => {
              if (!player) return null
              return (
                <MiniPlayerToken
                  key={player.id}
                  player={player}
                  index={index}
                  isTop={position === 'top'}
                  isBottom={position === 'bottom'}
                  onClick={() => setExpandedPlayer(player)}
                  onUpdateProfile={onUpdateProfile}
                />
              )
            }}
          />
        </div>

        {/* Bottom action bar */}
        <div className="flex flex-col gap-2">
          {isNarrator && (
            <CartoonButton
              color="green"
              size="lg"
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
                <CartoonButton color="yellow" size="lg" className="w-full" onClick={handleDrawSituation} data-testid="btn-draw-situation">
                  📋 Bốc thẻ Tình huống
                </CartoonButton>
              )}
              {gameStep === 'emotion-card' && (
                <CartoonButton color="pink" size="lg" className="w-full" onClick={() => openInventory('emotion')} data-testid="btn-select-emotion">
                  💭 Chọn thẻ Cảm xúc
                </CartoonButton>
              )}
              {gameStep === 'reflection-card' && selectedCards.reflections.length < 3 && (
                <CartoonButton color="blue" size="lg" className="w-full" onClick={() => openInventory('reflection')} data-testid="btn-select-reflection">
                  🤔 Chọn Reflection ({selectedCards.reflections.length}/3)
                </CartoonButton>
              )}
              {gameStep === 'selfcare-card' && !selectedCards.selfcare && (
                <CartoonButton color="teal" size="lg" className="w-full" onClick={() => openInventory('selfcare')} data-testid="btn-select-selfcare">
                  🌟 Chọn Bí kíp ôm
                </CartoonButton>
              )}
            </>
          )}
        </div>

        {/* Card bag FAB */}
        <button
          onClick={() => openInventory()}
          className="absolute bottom-2 right-2 coin-cartoon coin-gold w-12 h-12 text-2xl gloss-cartoon"
          aria-label="Túi thẻ bài"
        >
          🎴
        </button>
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

      {/* Flying coins */}
      <AnimatePresence>
        {flyCoins.map(c => (
          <motion.div
            key={c.id}
            initial={{ opacity: 1, y: 0, x: c.x, scale: 1 }}
            animate={{ opacity: 0, y: -120, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="fixed top-1/2 left-1/2 text-3xl pointer-events-none z-50"
          >
            {c.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Role card overlay */}
      <AnimatePresence>
        {expandedPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="role-card-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
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

      <QuitConfirmModal
        open={showQuit}
        onConfirm={() => { setShowQuit(false); onLeave() }}
        onCancel={() => setShowQuit(false)}
        message="Bạn có muốn rời game không?"
        subMessage="Tiến trình sẽ bị mất!"
        confirmLabel="Rời"
        cancelLabel="Ở lại"
      />
    </div>
  )
}
