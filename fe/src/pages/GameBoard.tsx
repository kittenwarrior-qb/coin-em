import { useState, useEffect, useRef } from 'react'
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

export default function GameBoard({ roomState, mySocketId, myUserId, onLeave, onUpdateProfile }: GameBoardProps) {
  const { nextTurn, selectCard: emitSelectCard, sendResponse, ntgVote, shareReflection, submitVote } = useSocket()
  const [showMenu, setShowMenu] = useState(false)
  const [coinPreview, setCoinPreview] = useState<{ front: string; back: string; alt: string } | null>(null)

  // Phase-local state
  const [responseText,       setResponseText]       = useState('')
  const [reflectionShareText, setReflectionShareText] = useState('')
  const [hasResponded,       setHasResponded]       = useState(false)
  const [hasNTGVoted,        setHasNTGVoted]        = useState(false)
  const [hasSharedReflection, setHasSharedReflection] = useState(false)
  const [hasVoted,           setHasVoted]           = useState(false)

  // Stores
  const { players, myPlayer, isNarrator, selectedCards } = useGameState()
  const { setPlayers, selectCard }         = useGameActions()
  const { expandedPlayer, showInventory, inventoryMode, setExpandedPlayer, setShowInventory, setInventoryMode } = useGameUI()
  const { gameStep, handleSelectCard }                   = useGameFlow()
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

  // ─── Render ────────────────────────────────────────────────────────────────
  const isNight = ['night', 'healer-turn', 'silencer-turn'].includes(gameStep)

  return (
    <div className="screen-cartoon">
      <div
        className="screen-panel relative p-4 flex flex-col gap-4 overflow-hidden"
        id="game-panel"
        style={{
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
        <div className="absolute top-2 left-2 z-10">
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
        <div data-testid="players-grid" className="relative z-10 flex-1 min-h-0 mt-10">
          <PlayerLayout
            players={players}
            renderCenter={() => (
              <TableBoard
                selectedCards={selectedCards}
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
