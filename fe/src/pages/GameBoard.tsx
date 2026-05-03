import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import { CARD_IMAGES, ROLE_TO_IMAGE } from '../constants/cardImages'
import { useGameStore, useUIStore } from '../stores'
import { useGameState, useGameActions, useGameUI } from '../hooks/useGameState'
import { useGameFlow } from '../hooks/useGameFlow'
import type { CardData, CardCategory, EmotionSubType, SelectedCards, GamePhase } from '../stores/types'
import { PHASE_LABELS, NIGHT_PHASES } from '../stores/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type CoinType = 'red' | 'yellow' | 'green'

interface Player {
  id: string
  name: string
  role: string
  isMe: boolean
  isNarrator?: boolean
  isSender?: boolean
  isMuted?: boolean
  isHealed?: boolean
  coins: { red: number; yellow: number; green: number }
}
// ─── Data ─────────────────────────────────────────────────────────────────────
const PASTEL_BG: Record<string, string> = {
  p0: '#FFF0F5', p1: '#F0F5FF', p2: '#F0FFF4',
  p3: '#FFFBF0', p4: '#F5F0FF', p5: '#F0FFFF',
  p6: '#FFF5F0', p7: '#F0FFF8', p8: '#FAFFF0',
}

const COIN_COLORS: Record<CoinType, { bg: string; label: string; emoji: string; color: string }> = {
  red:    { bg: '#FF6B6B', label: 'Lòng tốt', emoji: '❤️', color: '#FF6B6B' },
  yellow: { bg: '#FFD93D', label: 'Trao yêu thương', emoji: '💛', color: '#FFD93D' },
  green:  { bg: '#6BCB77', label: 'Được yêu thương', emoji: '💚', color: '#6BCB77' },
}

// Build card data from real images
const buildCardData = (): Record<CardCategory, CardData[]> & { emotionsByType: Record<EmotionSubType, CardData[]> } => {
  const situationCards: CardData[] = Object.entries(CARD_IMAGES.situation)
    .filter(([key]) => key !== 'back')
    .map(([key, url]) => ({
      id: `situation-${key}`,
      frontImage: url,
      backImage: CARD_IMAGES.situation.back,
      category: 'situation' as CardCategory,
    }))

  const reflectionCards: CardData[] = Object.entries(CARD_IMAGES.reflection)
    .filter(([key]) => key !== 'back')
    .map(([key, url]) => ({
      id: `reflection-${key}`,
      frontImage: url,
      backImage: CARD_IMAGES.reflection.back,
      category: 'reflection' as CardCategory,
    }))

  const selfcareCards: CardData[] = Object.entries(CARD_IMAGES.selfcare)
    .filter(([key]) => key !== 'back')
    .map(([key, url]) => ({
      id: `selfcare-${key}`,
      frontImage: url,
      backImage: CARD_IMAGES.selfcare.back,
      category: 'selfcare' as CardCategory,
    }))

  // Emotion cards - basic
  const emotionBasicCards: CardData[] = Object.entries(CARD_IMAGES.emotionBasic).map(([key, images]) => ({
    id: `emotion-basic-${key}`,
    frontImage: images.front,
    backImage: images.back,
    category: 'emotion' as CardCategory,
    subType: 'basic' as EmotionSubType,
  }))

  // Emotion cards - light
  const emotionLightCards: CardData[] = CARD_IMAGES.emotionLight.map((images, idx) => ({
    id: `emotion-light-${idx + 1}`,
    frontImage: images.front,
    backImage: images.back,
    category: 'emotion' as CardCategory,
    subType: 'light' as EmotionSubType,
  }))

  // Emotion cards - strong
  const emotionStrongCards: CardData[] = CARD_IMAGES.emotionStrong.map((images, idx) => ({
    id: `emotion-strong-${idx + 1}`,
    frontImage: images.front,
    backImage: images.back,
    category: 'emotion' as CardCategory,
    subType: 'strong' as EmotionSubType,
  }))

  // Emotion cards - advanced
  const emotionAdvancedCards: CardData[] = CARD_IMAGES.emotionAdvanced.map((images, idx) => ({
    id: `emotion-advanced-${idx + 1}`,
    frontImage: images.front,
    backImage: images.back,
    category: 'emotion' as CardCategory,
    subType: 'advanced' as EmotionSubType,
  }))

  const allEmotionCards = [...emotionBasicCards, ...emotionLightCards, ...emotionStrongCards, ...emotionAdvancedCards]

  return {
    situation: situationCards,
    emotion: allEmotionCards,
    reflection: reflectionCards,
    selfcare: selfcareCards,
    emotionsByType: {
      basic: emotionBasicCards,
      light: emotionLightCards,
      strong: emotionStrongCards,
      advanced: emotionAdvancedCards,
    },
  }
}

const CARD_DATA = buildCardData()

// ─── Center Board Component ───────────────────────────────────────────────────
function CenterBoard({ 
  selectedCards,
}: { 
  selectedCards: SelectedCards
}) {
  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-xs">
      {/* Situation Card */}
      {selectedCards.situation && (
        <motion.div
          initial={{ scale: 0, y: -50 }}
          animate={{ scale: 1, y: 0 }}
          className="flex flex-col items-center gap-2 mb-3"
        >
          <div className="text-[10px] font-bold text-gray-600 bg-white/90 px-2 py-1 rounded-full">
            📋 Tình huống
          </div>
          <div className="w-24 h-32 rounded-lg border-2 border-black shadow-lg">
            <img 
              src={selectedCards.situation.frontImage}
              alt="situation"
              className="w-full h-full object-cover rounded-md"
              draggable={false}
            />
          </div>
        </motion.div>
      )}

      {/* Emotion Card */}
      {selectedCards.emotion && (
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className="flex flex-col items-center gap-2 mb-3"
        >
          <div className="text-[10px] font-bold text-gray-600 bg-pink-100 px-2 py-1 rounded-full border border-pink-300">
            💭 Cảm xúc của NTG
          </div>
          <div className="w-28 h-36 rounded-lg border-3 border-pink-400 shadow-xl">
            <img 
              src={selectedCards.emotion.frontImage}
              alt="emotion"
              className="w-full h-full object-cover rounded-md"
              draggable={false}
            />
          </div>
        </motion.div>
      )}

      {/* Reflection Cards */}
      {selectedCards.reflections.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="text-[10px] font-bold text-gray-600 bg-blue-100 px-2 py-1 rounded-full border border-blue-300">
            🤔 Phản tư
          </div>
          <div className="flex gap-1">
            {selectedCards.reflections.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="w-16 h-20 rounded-md border-2 border-black shadow-md"
              >
                <img 
                  src={card.frontImage}
                  alt="reflection"
                  className="w-full h-full object-cover rounded-sm"
                  draggable={false}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Selfcare Card */}
      {selectedCards.selfcare && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-2 mt-3"
        >
          <div className="text-[10px] font-bold text-gray-600 bg-green-100 px-2 py-1 rounded-full border border-green-300">
            🌟 Bí kíp ôm
          </div>
          <div className="w-28 h-36 rounded-lg border-3 border-green-400 shadow-xl">
            <img 
              src={selectedCards.selfcare.frontImage}
              alt="selfcare"
              className="w-full h-full object-cover rounded-md"
              draggable={false}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Coin Stack (Top Left) ────────────────────────────────────────────────────
function CoinStack({ coins }: { coins: { red: number; yellow: number; green: number } }) {
  return (
    <div className="absolute top-2 left-2 flex gap-2 z-10">
      {(['yellow', 'green', 'red'] as CoinType[]).map(type => (
        <motion.div
          key={type}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div
            className="w-12 h-12 rounded-full border-[3px] border-black flex items-center justify-center
                       text-lg font-black shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${COIN_COLORS[type].color} 0%, ${COIN_COLORS[type].bg} 100%)`,
            }}
          >
            {COIN_COLORS[type].emoji}
          </div>
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-black text-white
                        text-[10px] font-bold flex items-center justify-center px-1">
            {coins[type]}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Coin Popup ───────────────────────────────────────────────────────────────
function CoinPopup({ onSend, onClose }: { onSend: (c: CoinType) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7, y: 10 }}
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50
                 bg-white border-2 border-black rounded-2xl p-2 flex gap-2"
    >
      {(Object.keys(COIN_COLORS) as CoinType[]).map(c => (
        <button
          key={c}
          data-testid={`coin-btn-${c}`}
          onClick={() => { onSend(c); onClose() }}
          className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center
                     text-lg hover:scale-110 active:scale-95 transition-transform"
          style={{ background: COIN_COLORS[c].bg }}
          title={COIN_COLORS[c].label}
        >
          {COIN_COLORS[c].emoji}
        </button>
      ))}
      <button onClick={onClose} className="w-10 h-10 rounded-full border-2 border-black bg-gray-100
                                           flex items-center justify-center text-sm font-bold hover:bg-gray-200">
        ✕
      </button>
    </motion.div>
  )
}

// ─── Flip Card Component (Reusable) ───────────────────────────────────────────
function FlipCard({
  frontImage,
  backImage,
  altText,
  size = 'large',
  onClose,
}: {
  frontImage: string
  backImage: string
  altText: string
  size?: 'small' | 'large'
  onClose?: () => void
}) {
  const [flipped, setFlipped] = useState(false)
  
  const dimensions = size === 'large' 
    ? { maxWidth: '70vw', maxHeight: '65vh' }
    : { maxWidth: '35vw', maxHeight: '32vh' }

  return (
    <motion.div
      initial={{ scale: 0.5, y: 100 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.5, y: 100 }}
      drag={onClose ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={onClose ? (_, info) => {
        if (info.offset.y > 100) onClose()
      } : undefined}
      className="relative"
      style={{ 
        perspective: '1000px',
        ...dimensions,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Inner card container that rotates */}
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{ 
          transformStyle: 'preserve-3d',
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={() => setFlipped(f => !f)}
      >
        {/* Front face */}
        <div
          style={{ 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: size === 'large' ? '30px' : '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          }}
        >
          <img 
            src={frontImage}
            alt={`${altText} - front`}
            style={{ 
              display: 'block',
              ...dimensions,
              width: 'auto',
              height: 'auto',
            }}
            draggable={false}
          />
        </div>

        {/* Back face */}
        <div
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: size === 'large' ? '30px' : '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          }}
        >
          <img 
            src={backImage}
            alt={`${altText} - back`}
            style={{ 
              display: 'block',
              ...dimensions,
              width: 'auto',
              height: 'auto',
            }}
            draggable={false}
          />
        </div>
      </motion.div>

      {/* Hint for large cards */}
      {size === 'large' && onClose && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-sm whitespace-nowrap text-center">
          <div>{flipped ? 'Nhấn để úp lại' : 'Nhấn để lật thẻ'}</div>
          <div className="text-xs text-gray-300 mt-1">👆 Vuốt xuống để đóng</div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Card Inventory Overlay ───────────────────────────────────────────────────
function CardInventory({ 
  onClose,
  onSelectCard,
  allowedCategory,
  showConfirmButton = false,
}: { 
  onClose: () => void
  onSelectCard?: (card: CardData) => void
  allowedCategory?: CardCategory
  showConfirmButton?: boolean
}) {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [confirmedCard, setConfirmedCard] = useState<CardData | null>(null)
  const [activeTab, setActiveTab] = useState<CardCategory>(allowedCategory || 'situation')
  const [emotionSubTab, setEmotionSubTab] = useState<EmotionSubType>('basic')

  const tabs: { key: CardCategory; label: string; emoji: string }[] = [
    { key: 'situation', label: 'Tình huống', emoji: '📋' },
    { key: 'emotion', label: 'Cảm xúc', emoji: '💭' },
    { key: 'reflection', label: 'Phản tư', emoji: '🤔' },
    { key: 'selfcare', label: 'Bí kíp', emoji: '🌟' },
  ]

  const emotionTabs: { key: EmotionSubType; label: string }[] = [
    { key: 'basic', label: 'Cơ bản' },
    { key: 'light', label: 'Nhẹ' },
    { key: 'strong', label: 'Mạnh' },
    { key: 'advanced', label: 'Nâng cao' },
  ]

  const currentCards = activeTab === 'emotion' 
    ? CARD_DATA.emotionsByType[emotionSubTab]
    : CARD_DATA[activeTab]

  const handleCardClick = (card: CardData) => {
    if (showConfirmButton) {
      setConfirmedCard(card)
    } else {
      setSelectedCard(card)
    }
  }

  const handleConfirm = () => {
    if (confirmedCard && onSelectCard) {
      onSelectCard(confirmedCard)
      onClose()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Grid view - always visible */}
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[90vw] max-w-md max-h-[85vh] bg-white rounded-3xl border-4 border-black flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black">
          <h2 className="text-lg font-black text-gray-800">🎴 Túi thẻ bài</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Main tabs */}
        {!allowedCategory && (
          <div className="flex border-b-2 border-black bg-gray-50">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-xs font-bold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-800 border-b-4 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Emotion sub-tabs */}
        {activeTab === 'emotion' && (
          <div className="flex border-b border-gray-200 bg-gray-50 px-2">
            {emotionTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setEmotionSubTab(tab.key)}
                className={`flex-1 py-1.5 text-[10px] font-bold transition-colors ${
                  emotionSubTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-2">
            {currentCards.map(card => (
              <motion.button
                key={card.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCardClick(card)}
                className={`aspect-[2/3] rounded-lg border-2 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow ${
                  confirmedCard?.id === card.id ? 'border-blue-500 ring-2 ring-blue-300' : 'border-black'
                }`}
              >
                <img 
                  src={card.backImage} 
                  alt={card.id}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-[10px] text-gray-500">
            {currentCards.length} thẻ • Click để xem chi tiết
          </div>
          {showConfirmButton && confirmedCard && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-lg border-2 border-black bg-green-400 text-xs font-bold hover:bg-green-500"
            >
              ✓ Chọn thẻ này
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Zoomed card view - overlay on top */}
      <AnimatePresence>
        {selectedCard && !showConfirmButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedCard(null)
            }}
          >
            <FlipCard
              frontImage={selectedCard.backImage}
              backImage={selectedCard.frontImage}
              altText={selectedCard.id}
              size="large"
              onClose={() => setSelectedCard(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Expanded Card Overlay ────────────────────────────────────────────────────
function ExpandedCard({ player, onClose }: { player: Player; onClose: () => void }) {
  const roleImageUrl = ROLE_TO_IMAGE[player.role] || CARD_IMAGES.roles.back
  const backImageUrl = CARD_IMAGES.roles.back
  
  console.log('[ExpandedCard] Player role:', player.role)
  console.log('[ExpandedCard] Back image URL:', backImageUrl)
  console.log('[ExpandedCard] Role image URL:', roleImageUrl)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <FlipCard
        frontImage={backImageUrl}
        backImage={roleImageUrl}
        altText={player.role}
        size="large"
        onClose={onClose}
      />
    </motion.div>
  )
}
function PlayerCard({
  player,
  onExpand,
  onSendCoin,
  onNightAction,
  onVote,
  isGlowing,
  isNightPhase,
}: {
  player: Player
  onExpand: () => void
  onSendCoin: (coin: CoinType) => void
  onNightAction?: (playerId: string) => void
  onVote?: (playerId: string) => void
  isGlowing?: boolean
  isNightPhase?: boolean
}) {
  const [showCoins, setShowCoins] = useState(false)
  const bg = PASTEL_BG[player.id]
  
  const isNarrator = player.role === 'Người Quản trò'
  const isSender = player.role === 'Người Trao Gửi'
  const hasPublicRole = isNarrator || isSender

  const handleClick = () => {
    if (player.isMe) {
      onExpand()
      return
    }
    if (isNightPhase && onNightAction) {
      onNightAction(player.id)
      return
    }
    if (onVote) {
      onVote(player.id)
      return
    }
    setShowCoins(s => !s)
  }

  return (
    <div className="relative flex flex-col">
      {/* Public role badge - above card */}
      {hasPublicRole && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
          <div className={`text-[11px] font-black px-3 py-1.5 rounded-full border-[3px] border-black shadow-lg
                          ${isNarrator ? 'bg-purple-300 text-purple-900' : 'bg-yellow-300 text-yellow-900'}`}>
            {isNarrator ? 'Quản trò' : 'Trao gửi'}
          </div>
        </div>
      )}
      
      <motion.div
        whileTap={{ scale: 0.93 }}
        onClick={handleClick}
        animate={isGlowing ? {
          boxShadow: [
            '0 0 0px rgba(255, 215, 0, 0)',
            '0 0 20px rgba(255, 215, 0, 0.8)',
            '0 0 0px rgba(255, 215, 0, 0)',
          ],
        } : {}}
        transition={isGlowing ? { duration: 1.5, repeat: Infinity } : {}}
        data-testid={`player-card-${player.name}`}
        data-player-id={player.id}
        data-is-me={player.isMe}
        data-role={player.role}
        className={`rounded-2xl border-[3px] ${player.isMe ? 'border-blue-500 shadow-xl' : 'border-black'}
                   flex flex-col items-center justify-center gap-1 cursor-pointer
                   select-none aspect-[3/4] relative overflow-hidden
                   ${player.isMe ? 'ring-4 ring-blue-300' : ''}`}
        style={{ background: bg }}
      >
        {/* Muted badge */}
        {player.isMuted && (
          <div className="absolute top-1 right-1 bg-black text-white text-[9px] font-bold px-1 rounded-full">
            🔇
          </div>
        )}

        {/* Healed badge */}
        {player.isHealed && (
          <div className="absolute top-1 left-1 bg-green-500 text-white text-[9px] font-bold px-1 rounded-full">
            ✨
          </div>
        )}

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full border-2 border-black bg-white
                        flex items-center justify-center text-lg font-black pointer-events-none">
          {player.name[0]}
        </div>

        <div className="text-[11px] font-black text-gray-800 text-center px-1 leading-tight pointer-events-none">
          {player.name}
        </div>

        {/* Me indicator */}
        {player.isMe && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2
                          bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-full
                          border-2 border-white shadow-lg">
            👤 Mình
          </div>
        )}
      </motion.div>

      {/* Coin popup for other players */}
      <AnimatePresence>
        {showCoins && !player.isMe && (
          <CoinPopup onSend={onSendCoin} onClose={() => setShowCoins(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

interface RoomState {
  id: string
  host: string
  players: Array<{
    socketId: string
    userId?: string
    name: string
    role?: string
    isNarrator?: boolean
    isSender?: boolean
    coins?: { red: number; yellow: number; green: number }
  }>
  status: string
  phase?: GamePhase
  turn?: number
  currentRound?: number
  totalRounds?: number
  currentNTG?: string | null
  currentNarrator?: string | null
  mutedPlayer?: string | null
}

interface GameBoardProps {
  roomId: string
  roomState: RoomState
  mySocketId: string
  myUserId: string
  onLeave: () => void
}

export default function GameBoard({ roomState, mySocketId, myUserId, onLeave }: GameBoardProps) {
  const { nightAction: emitNightAction, nextTurn, selectCard: emitSelectCard, sendResponse, ntgVote, shareReflection, giveCoin, submitVote } = useSocket()
  
  // Local state for phase-specific inputs
  const [responseText, setResponseText] = useState('')
  const [reflectionShareText, setReflectionShareText] = useState('')
  const [hasResponded, setHasResponded] = useState(false)
  const [hasNTGVoted, setHasNTGVoted] = useState(false)
  const [hasSharedReflection, setHasSharedReflection] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  
  console.log('[GameBoard] Render with mySocketId:', mySocketId, 'myUserId:', myUserId)
  
  // Zustand stores
  const { players, myPlayer, isNarrator, selectedCards } = useGameState()
  const { setPlayers, updatePlayer, selectCard } = useGameActions()
  const { expandedPlayer, showInventory, inventoryMode, setExpandedPlayer, setShowInventory, setInventoryMode } = useGameUI()
  const { gameStep, handleSelectCard } = useGameFlow()
  const flyCoins = useUIStore(state => state.flyCoins)
  const addFlyingCoin = useUIStore(state => state.addFlyingCoin)
  const setMyIds = useGameStore(state => state.setMyIds)
  
  // Track if role card has been shown
  const hasShownRoleRef = useRef(false)

  // Initialize my IDs in store
  useEffect(() => {
    setMyIds(mySocketId, myUserId)
  }, [mySocketId, myUserId, setMyIds])

  // Update players when roomState changes
  useEffect(() => {
    const converted = roomState.players.map((p) => {
      // Match by userId first (most reliable), fallback to socketId
      const isMe = p.userId ? p.userId === myUserId : p.socketId === mySocketId
      
      return {
        id: p.socketId,
        name: p.name,
        role: p.role || 'Chưa chia vai trò',
        isMe,
        isNarrator: p.isNarrator,
        isSender: p.isSender,
        coins: p.coins || { red: 0, yellow: 0, green: 0 },
      }
    })
    
    // Sort: "Me" always first
    const sorted = converted.sort((a, b) => {
      if (a.isMe) return -1
      if (b.isMe) return 1
      return 0
    })
    
    setPlayers(sorted)
  }, [roomState.players, mySocketId, myUserId, setPlayers])

  const gamePhase = roomState.phase || 'role-reveal'
  const currentRound = roomState.currentRound || 1
  const totalRounds = roomState.totalRounds || 1

  const myCoinCount = myPlayer?.coins || { red: 0, yellow: 0, green: 0 }

  // Reset per-phase local state when phase changes
  useEffect(() => {
    setResponseText('')
    setReflectionShareText('')
    setHasResponded(false)
    setHasNTGVoted(false)
    setHasSharedReflection(false)
    setHasVoted(false)
  }, [gameStep])

  // Reset role card flag when game restarts
  useEffect(() => {
    if (gameStep === 'role-reveal' && !myPlayer?.role) {
      hasShownRoleRef.current = false
    }
  }, [gameStep, myPlayer?.role])

  // Auto-show role card when game starts (only once per game)
  useEffect(() => {
    if (!myPlayer) return
    if (!hasShownRoleRef.current && myPlayer.role && myPlayer.role !== 'Chưa chia vai trò') {
      hasShownRoleRef.current = true
      const timer = setTimeout(() => {
        setExpandedPlayer(myPlayer)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [myPlayer, setExpandedPlayer])

  const sendCoin = (targetId: string, coin: CoinType) => {
    if (gameStep === 'give-coins') {
      // Real socket emit in give-coins phase
      giveCoin(roomState.id, targetId, coin)
    } else {
      // Local optimistic update for other phases (visual only)
      const targetPlayer = players.find(p => p.id === targetId)
      if (targetPlayer) {
        updatePlayer(targetId, {
          coins: { ...targetPlayer.coins, [coin]: targetPlayer.coins[coin] + 1 },
        })
      }
    }
    addFlyingCoin(COIN_COLORS[coin].emoji)
  }

  const handleNightAction = (targetId: string) => {
    if (NIGHT_PHASES.includes(gamePhase) && myPlayer) {
      if (myPlayer.role === 'Người Chữa Lành') {
        emitNightAction(roomState.id, 'heal', targetId)
      } else if (myPlayer.role === 'Người Im Lặng') {
        emitNightAction(roomState.id, 'silence', targetId)
      }
    }
  }

  // Game step handlers
  const handleDrawSituation = () => {
    const randomCard = CARD_DATA.situation[Math.floor(Math.random() * CARD_DATA.situation.length)]
    selectCard(randomCard, 'situation')
    emitSelectCard(roomState.id, randomCard)
  }

  const handleSendResponse = () => {
    if (!responseText.trim() || hasResponded) return
    sendResponse(roomState.id, responseText.trim())
    setHasResponded(true)
  }

  const handleNTGVote = (targetSocketId: string) => {
    if (hasNTGVoted) return
    ntgVote(roomState.id, targetSocketId)
    setHasNTGVoted(true)
  }

  const handleShareReflection = () => {
    if (hasSharedReflection) return
    shareReflection(roomState.id, reflectionShareText.trim())
    setHasSharedReflection(true)
  }

  const handleVoteSilencer = (targetSocketId: string) => {
    if (hasVoted) return
    submitVote(roomState.id, targetSocketId)
    setHasVoted(true)
  }

  const openEmotionSelection = () => {
    setInventoryMode({ category: 'emotion', showConfirm: true })
    setShowInventory(true)
  }

  const openReflectionSelection = () => {
    setInventoryMode({ category: 'reflection', showConfirm: true })
    setShowInventory(true)
  }

  const openSelfcareSelection = () => {
    setInventoryMode({ category: 'selfcare', showConfirm: true })
    setShowInventory(true)
  }

  const handleInventorySelect = (card: CardData) => {
    if (gameStep === 'emotion-card') {
      handleSelectCard(card, 'emotion')
    } else if (gameStep === 'reflection-card') {
      handleSelectCard(card, 'reflection')
    } else if (gameStep === 'selfcare-card') {
      handleSelectCard(card, 'selfcare')
    }
  }

  // Narrator advances turn — delegates to server
  const handleNextStep = () => {
    nextTurn(roomState.id)
  }

  return (
    <div className="h-screen bg-[#FAFAF8] flex items-center justify-center overflow-hidden">
      <div
        className="relative w-full max-w-sm h-full bg-white p-4 flex flex-col gap-4"
      >
        {/* Coin Stack - Top Left */}
        <CoinStack coins={myCoinCount} />

        {/* Back button */}
        {onLeave && (
          <button
            onClick={onLeave}
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full border-2 border-black
                       bg-white flex items-center justify-center hover:bg-gray-100 active:scale-95"
          >
            ←
          </button>
        )}

        {/* Room info - Top center */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-center">
          <div className="bg-white border-2 border-black rounded-xl px-3 py-1">
            <div
              data-testid="game-phase"
              data-phase={gameStep}
              className="text-[10px] font-bold text-gray-500"
            >
              Round {currentRound}/{totalRounds} • {gameStep}
            </div>
          </div>
        </div>

        {/* Center Board */}
        <CenterBoard 
          selectedCards={selectedCards}
        />

        {/* 3x3 Grid */}
        <div data-testid="players-grid" className="grid grid-cols-3 gap-4 w-full flex-1 mt-16 mb-20 px-2">
          {players.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onExpand={() => setExpandedPlayer(player)}
              onSendCoin={(coin) => sendCoin(player.id, coin)}
              onNightAction={NIGHT_PHASES.includes(gamePhase) ? handleNightAction : undefined}
              onVote={gameStep === 'guess-silencer' ? handleVoteSilencer : undefined}
              isGlowing={false}
              isNightPhase={NIGHT_PHASES.includes(gamePhase)}
            />
          ))}
        </div>

        {/* Bottom controls */}
        <div className="flex flex-col gap-2">
          {/* Moderator controls */}
          {isNarrator && (
            <motion.button
              data-testid="btn-next-turn"
              whileTap={{ scale: 0.97 }}
              onClick={handleNextStep}
              className="w-full py-3 rounded-2xl border-[3px] border-black bg-[#6BCB77]
                         text-sm font-bold hover:bg-[#5BB767] active:scale-[0.98] transition-all"
            >
              👑 {PHASE_LABELS[gameStep] ?? gameStep}
            </motion.button>
          )}

          {/* NTG controls */}
          {myPlayer?.isSender && (
            <>
              {gameStep === 'situation-card' && (
                <motion.button
                  data-testid="btn-draw-situation"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDrawSituation}
                  className="w-full py-3 rounded-2xl border-[3px] border-black bg-yellow-300
                             text-sm font-bold hover:bg-yellow-400 active:scale-[0.98] transition-all"
                >
                  📋 Bốc thẻ Tình huống
                </motion.button>
              )}
              {gameStep === 'emotion-card' && (
                <motion.button
                  data-testid="btn-select-emotion"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={openEmotionSelection}
                  className="w-full py-3 rounded-2xl border-[3px] border-black bg-pink-300
                             text-sm font-bold hover:bg-pink-400 active:scale-[0.98] transition-all"
                >
                  💭 Chọn thẻ Cảm xúc
                </motion.button>
              )}
              {gameStep === 'reflection-card' && selectedCards.reflections.length < 3 && (
                <motion.button
                  data-testid="btn-select-reflection"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={openReflectionSelection}
                  className="w-full py-3 rounded-2xl border-[3px] border-black bg-blue-300
                             text-sm font-bold hover:bg-blue-400 active:scale-[0.98] transition-all"
                >
                  🤔 Chọn Reflection ({selectedCards.reflections.length}/3)
                </motion.button>
              )}
              {gameStep === 'selfcare-card' && !selectedCards.selfcare && (
                <motion.button
                  data-testid="btn-select-selfcare"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={openSelfcareSelection}
                  className="w-full py-3 rounded-2xl border-[3px] border-black bg-green-300
                             text-sm font-bold hover:bg-green-400 active:scale-[0.98] transition-all"
                >
                  🌟 Chọn Bí kíp ôm
                </motion.button>
              )}
            </>
          )}
        </div>

        {/* Card inventory button */}
        <button
          onClick={() => {
            setInventoryMode({ showConfirm: false })
            setShowInventory(true)
          }}
          className="absolute bottom-2 right-2 w-12 h-12 rounded-full border-3 border-black bg-gradient-to-br from-purple-400 to-pink-400
                     flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-transform shadow-lg"
        >
          🎴
        </button>
      </div>

      {/* ── Phase-specific overlays ─────────────────────────────────────────── */}

      {/* group-response: text input + NTG vote */}
      <AnimatePresence>
        {gameStep === 'group-response' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-40
                       bg-white border-t-4 border-black rounded-t-3xl p-4 flex flex-col gap-3"
          >
            <div className="text-sm font-black text-gray-700">💬 Phản hồi nhóm</div>

            {/* All players: send response */}
            {!hasResponded ? (
              <div className="flex gap-2">
                <input
                  data-testid="input-response"
                  type="text"
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  placeholder="Chia sẻ cảm nhận của bạn..."
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-black text-sm focus:outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleSendResponse()}
                />
                <button
                  data-testid="btn-send-response"
                  onClick={handleSendResponse}
                  disabled={!responseText.trim()}
                  className="px-4 py-2 rounded-xl border-2 border-black bg-blue-300 text-sm font-bold
                             disabled:opacity-40 hover:bg-blue-400 active:scale-95"
                >
                  Gửi
                </button>
              </div>
            ) : (
              <div className="text-xs text-green-600 font-bold">✅ Đã gửi phản hồi</div>
            )}

            {/* NTG only: vote for best responder */}
            {myPlayer?.isSender && !hasNTGVoted && (
              <div>
                <div className="text-xs font-bold text-gray-500 mb-2">
                  👑 Chọn người phản hồi hay nhất (+5 💛)
                </div>
                <div className="flex flex-wrap gap-2">
                  {players.filter(p => !p.isMe).map(p => (
                    <button
                      key={p.id}
                      data-testid={`btn-ntg-vote-${p.name}`}
                      onClick={() => handleNTGVote(p.id)}
                      className="px-3 py-1.5 rounded-xl border-2 border-black bg-yellow-200
                                 text-xs font-bold hover:bg-yellow-300 active:scale-95"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {myPlayer?.isSender && hasNTGVoted && (
              <div className="text-xs text-green-600 font-bold">✅ Đã vote người phản hồi hay nhất</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* reflection-sharing: NTG shares reflection */}
      <AnimatePresence>
        {gameStep === 'reflection-sharing' && myPlayer?.isSender && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-40
                       bg-white border-t-4 border-black rounded-t-3xl p-4 flex flex-col gap-3"
          >
            <div className="text-sm font-black text-gray-700">🤔 Chia sẻ Phản tư (+5 💛)</div>
            {!hasSharedReflection ? (
              <div className="flex gap-2">
                <input
                  data-testid="input-reflection-share"
                  type="text"
                  value={reflectionShareText}
                  onChange={e => setReflectionShareText(e.target.value)}
                  placeholder="Chia sẻ suy nghĩ về thẻ phản tư..."
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-black text-sm focus:outline-none"
                />
                <button
                  data-testid="btn-share-reflection"
                  onClick={handleShareReflection}
                  className="px-4 py-2 rounded-xl border-2 border-black bg-blue-300 text-sm font-bold
                             hover:bg-blue-400 active:scale-95"
                >
                  Chia sẻ
                </button>
              </div>
            ) : (
              <div className="text-xs text-green-600 font-bold">✅ Đã chia sẻ phản tư</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* guess-silencer: vote for silencer */}
      <AnimatePresence>
        {gameStep === 'guess-silencer' && !hasVoted && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-40
                       bg-white border-t-4 border-black rounded-t-3xl p-4 flex flex-col gap-3"
          >
            <div className="text-sm font-black text-gray-700">🕵️ Đoán Người Im Lặng</div>
            <div className="flex flex-wrap gap-2">
              {players.filter(p => !p.isMe).map(p => (
                <button
                  key={p.id}
                  data-testid={`btn-vote-silencer-${p.name}`}
                  onClick={() => handleVoteSilencer(p.id)}
                  className="px-3 py-1.5 rounded-xl border-2 border-black bg-red-200
                             text-xs font-bold hover:bg-red-300 active:scale-95"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {gameStep === 'guess-silencer' && hasVoted && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-40
                       bg-white border-t-4 border-black rounded-t-3xl p-4"
          >
            <div className="text-sm font-bold text-green-600">✅ Đã vote — chờ kết quả...</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* reveal-silencer: show all roles */}
      <AnimatePresence>
        {gameStep === 'reveal-silencer' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm bg-white border-t-4 border-black rounded-t-3xl p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto"
            >
              <div className="text-sm font-black text-gray-700">🎭 Tiết lộ vai trò</div>
              <div className="flex flex-col gap-2">
                {players.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl border-2 border-black bg-gray-50">
                    <span className="text-sm font-bold">{p.name}{p.isMe ? ' (Bạn)' : ''}</span>
                    <span className={`text-xs font-black px-2 py-1 rounded-full border border-black
                      ${p.role === 'Người Im Lặng' ? 'bg-red-200' :
                        p.role === 'Người Quản trò' ? 'bg-purple-200' :
                        p.role === 'Người Trao Gửi' ? 'bg-yellow-200' :
                        p.role === 'Người Chữa Lành' ? 'bg-green-200' : 'bg-blue-100'}`}>
                      {p.role}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* reward: round summary — coin tally, no ranking */}
      <AnimatePresence>
        {gameStep === 'reward' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm bg-white border-t-4 border-black rounded-t-3xl p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto"
            >
              <div className="text-sm font-black text-gray-700">
                🌀 Tổng kết lượt {currentRound}/{totalRounds}
              </div>

              {/* Coin meaning reminder */}
              <div className="bg-[#FFF9C4] rounded-xl p-3 border border-black text-[11px] text-gray-600 leading-relaxed">
                💚 Xu Xanh = lời ôm bạn nhận được &nbsp;·&nbsp;
                💛 Xu Vàng = lời ôm bạn trao đi &nbsp;·&nbsp;
                ❤️ Xu Đỏ = lòng tốt trong tim bạn
              </div>

              {/* Coin counts — no ranking */}
              <div className="flex flex-col gap-2">
                {players.filter(p => !p.role?.includes('Bot')).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl border-2 border-black bg-gray-50">
                    <span className="text-sm font-bold">{p.name}{p.isMe ? ' (Bạn)' : ''}</span>
                    <div className="flex gap-3 text-xs font-black">
                      <span>💚 {p.coins.green}</span>
                      <span>💛 {p.coins.yellow}</span>
                      <span>❤️ {p.coins.red}</span>
                    </div>
                  </div>
                ))}
              </div>

              {isNarrator && (
                <button
                  data-testid="btn-next-round"
                  onClick={handleNextStep}
                  className="w-full py-3 rounded-2xl border-[3px] border-black bg-[#6BCB77]
                             text-sm font-bold hover:bg-[#5BB767] active:scale-[0.98]"
                >
                  {currentRound >= totalRounds ? '🎉 Kết thúc game' : '▶ Lượt tiếp theo'}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ended: closing ritual screen */}
      <AnimatePresence>
        {gameStep === 'ended' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FFFBF0] px-6 gap-6 overflow-y-auto"
          >
            {/* Header */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="text-5xl mb-2">🫂</div>
              <h2 className="text-xl font-black text-gray-800">Hành trình kết thúc</h2>
              <p className="text-xs text-gray-500 mt-1">Cảm ơn mọi người đã chia sẻ và lắng nghe</p>
            </motion.div>

            {/* Coin summary */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-sm"
            >
              <div className="bg-white rounded-2xl border-2 border-black p-4 flex flex-col gap-2">
                <div className="text-xs font-black text-gray-500 mb-1">Những lời ôm của bạn</div>
                {players.filter(p => !p.role?.includes('Bot')).map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">{p.name}{p.isMe ? ' (Bạn)' : ''}</span>
                    <div className="flex gap-3 text-sm font-black">
                      <span title="Lời ôm nhận được">💚 {p.coins.green}</span>
                      <span title="Lời ôm trao đi">💛 {p.coins.yellow}</span>
                      <span title="Lòng tốt">❤️ {p.coins.red}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Coin meaning */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-sm bg-[#F0FFF4] rounded-2xl border-2 border-black p-4 flex flex-col gap-2"
            >
              <div className="text-xs font-black text-gray-600">Ý nghĩa đồng xu</div>
              <div className="text-xs text-gray-600 leading-relaxed">
                💚 <b>Xu Xanh</b> — lời ôm bạn nhận được<br />
                💛 <b>Xu Vàng</b> — lời ôm bạn trao đi<br />
                ❤️ <b>Xu Đỏ</b> — lòng tốt vô tận trong tim bạn<br />
                <span className="text-gray-400 mt-1 block">Mỗi đồng xu là một lời ôm và sự chữa lành.</span>
              </div>
            </motion.div>

            {/* Reflection questions */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="w-full max-w-sm bg-[#F0F5FF] rounded-2xl border-2 border-black p-4 flex flex-col gap-2"
            >
              <div className="text-xs font-black text-gray-600">Cùng nhau trả lời</div>
              <div className="text-xs text-gray-700 leading-relaxed flex flex-col gap-1.5">
                <div>🌿 Hôm nay gọi tên rõ nhất cảm xúc nào?</div>
                <div>🔍 Học được gì về bản thân?</div>
                <div>💌 Muốn gửi lời cảm ơn đến ai?</div>
              </div>
            </motion.div>

            {/* Closing ritual */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="w-full max-w-sm bg-[#FFF0F5] rounded-2xl border-[3px] border-black p-4 text-center"
            >
              <div className="text-xs font-black text-gray-600 mb-2">Nghi thức kết thúc</div>
              <div className="text-xs text-gray-600 mb-3">
                Cả nhóm đứng thành vòng tròn, nắm tay và đồng thanh:
              </div>
              <div className="text-sm font-black text-pink-700 leading-relaxed">
                "CẢM ƠN MÌNH,<br />CẢM ƠN BẠN<br />đã chia sẻ và lắng nghe cảm xúc!"
              </div>
            </motion.div>

            {/* Leave button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              onClick={onLeave}
              className="w-full max-w-sm py-3 rounded-2xl border-2 border-black bg-white
                         text-sm font-bold hover:bg-gray-100 active:scale-[0.98] mb-8"
            >
              Rời phòng
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating coins */}
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

      {/* Expanded card overlay */}
      <AnimatePresence>
        {expandedPlayer && (
          <ExpandedCard player={expandedPlayer} onClose={() => setExpandedPlayer(null)} />
        )}
      </AnimatePresence>

      {/* Card inventory overlay */}
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
    </div>
  )
}
