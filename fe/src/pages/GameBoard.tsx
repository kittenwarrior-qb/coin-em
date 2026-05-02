import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import { CARD_IMAGES, ROLE_TO_IMAGE } from '../constants/cardImages'
import { useGameStore, useUIStore } from '../stores'
import { useGameState, useGameActions, useGameUI } from '../hooks/useGameState'
import { useGameFlow } from '../hooks/useGameFlow'
import type { CardData, CardCategory, EmotionSubType, SelectedCards } from '../stores/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type CoinType = 'red' | 'yellow' | 'green'
type GamePhase = 'role-reveal' | 'night' | 'day'

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
  isGlowing,
  isNightPhase,
}: {
  player: Player
  onExpand: () => void
  onSendCoin: (coin: CoinType) => void
  onNightAction?: (playerId: string) => void
  isGlowing?: boolean
  isNightPhase?: boolean
}) {
  const [showCoins, setShowCoins] = useState(false)
  const bg = PASTEL_BG[player.id]
  
  // Check if player has public role
  const isNarrator = player.role === 'Người Quản trò'
  const isSender = player.role === 'Người Trao Gửi'
  const hasPublicRole = isNarrator || isSender

  const handleClick = () => {
    // Luôn cho phép xem vai trò của mình
    if (player.isMe) {
      console.log('[PlayerCard] Opening role card for:', player.name)
      onExpand()
      return
    }
    
    if (isNightPhase && onNightAction) {
      // Night phase: click vào người khác để thực hiện action
      console.log('[PlayerCard] Night action on:', player.name)
      onNightAction(player.id)
      return
    }
    
    // Day phase: click vào người khác để tặng coin
    console.log('[PlayerCard] Toggle coin popup for:', player.name)
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

// ─── Player Card ──────────────────────────────────────────────────────────────
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
  const { nightAction: emitNightAction } = useSocket()
  
  console.log('[GameBoard] Render with mySocketId:', mySocketId, 'myUserId:', myUserId)
  
  // Zustand stores
  const { players, myPlayer, isNarrator, selectedCards } = useGameState()
  const { setPlayers, updatePlayer, selectCard, clearSelectedCards } = useGameActions()
  const { expandedPlayer, showInventory, inventoryMode, setExpandedPlayer, setShowInventory, setInventoryMode } = useGameUI()
  const { gameStep, handleSelectCard } = useGameFlow()
  const flyCoins = useUIStore(state => state.flyCoins)
  const addFlyingCoin = useUIStore(state => state.addFlyingCoin)
  const setMyIds = useGameStore(state => state.setMyIds)
  const setGameStep = useGameStore(state => state.setGameStep)
  
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
    // TODO: Emit socket event to server
    const targetPlayer = players.find(p => p.id === targetId)
    if (targetPlayer) {
      updatePlayer(targetId, {
        coins: { ...targetPlayer.coins, [coin]: targetPlayer.coins[coin] + 1 }
      })
    }
    // fly animation
    addFlyingCoin(COIN_COLORS[coin].emoji)
  }

  const handleNightAction = (targetId: string) => {
    if (gamePhase === 'night' && myPlayer) {
      if (myPlayer.role === 'Người Chữa Lành') {
        emitNightAction(roomState.id, 'heal', targetId)
      } else if (myPlayer.role === 'Người Im Lặng') {
        emitNightAction(roomState.id, 'silence', targetId)
      }
    }
  }

  // Game step handlers
  const handleDrawSituation = () => {
    // Random pick a situation card
    const randomCard = CARD_DATA.situation[Math.floor(Math.random() * CARD_DATA.situation.length)]
    selectCard(randomCard, 'situation')
    setGameStep('day-emotion')
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
    if (gameStep === 'day-emotion') {
      handleSelectCard(card, 'emotion')
    } else if (gameStep === 'reflection') {
      handleSelectCard(card, 'reflection')
    } else if (gameStep === 'selfcare') {
      handleSelectCard(card, 'selfcare')
    }
  }

  // Step progression
  const handleNextStep = () => {
    switch (gameStep) {
      case 'role-reveal':
        setGameStep('night')
        break
      case 'night':
        setGameStep('day-draw')
        break
      case 'day-draw':
        // NTG draws situation - handled by handleDrawSituation
        break
      case 'day-emotion':
        // After emotion selected, move to story
        setGameStep('day-story')
        break
      case 'day-story':
        setGameStep('reflection')
        break
      case 'reflection':
        if (selectedCards.reflections.length >= 1) {
          setGameStep('selfcare')
        }
        break
      case 'selfcare':
        setGameStep('guess-role')
        break
      case 'guess-role':
        setGameStep('reward')
        break
      case 'reward':
        // Reset for next round
        clearSelectedCards()
        setGameStep('role-reveal')
        break
    }
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
            <div className="text-[10px] font-bold text-gray-500">
              Round {currentRound}/{totalRounds} • {gameStep}
            </div>
          </div>
        </div>

        {/* Center Board */}
        <CenterBoard 
          selectedCards={selectedCards}
        />

        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-4 w-full flex-1 mt-16 mb-20 px-2">
          {players.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onExpand={() => setExpandedPlayer(player)}
              onSendCoin={(coin) => sendCoin(player.id, coin)}
              onNightAction={gamePhase === 'night' ? handleNightAction : undefined}
              isGlowing={false}
              isNightPhase={gamePhase === 'night'}
            />
          ))}
        </div>

        {/* Bottom controls */}
        <div className="flex flex-col gap-2">
          {/* Moderator controls */}
          {isNarrator && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNextStep}
              className="w-full py-3 rounded-2xl border-[3px] border-black bg-[#6BCB77]
                         text-sm font-bold hover:bg-[#5BB767] active:scale-[0.98] transition-all"
            >
              👑 {gameStep === 'role-reveal' ? 'Chuyển sang Night' :
                  gameStep === 'night' ? 'Chuyển sang Day' :
                  gameStep === 'day-draw' ? 'Chờ NTG bốc thẻ' :
                  gameStep === 'day-emotion' ? 'Chờ NTG chọn cảm xúc' :
                  gameStep === 'day-story' ? 'Chọn Reflection' :
                  gameStep === 'reflection' ? 'Chọn Bí kíp' :
                  gameStep === 'selfcare' ? 'Đoán vai trò' :
                  gameStep === 'guess-role' ? 'Tặng coin' :
                  'Kết thúc round'}
            </motion.button>
          )}

          {/* NTG controls */}
          {myPlayer?.isSender && (
            <>
              {gameStep === 'day-draw' && (
                <motion.button
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
              {gameStep === 'day-emotion' && (
                <motion.button
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
              {gameStep === 'reflection' && selectedCards.reflections.length < 3 && (
                <motion.button
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
              {gameStep === 'selfcare' && !selectedCards.selfcare && (
                <motion.button
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
