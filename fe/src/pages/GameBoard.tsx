import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────
type CoinType = 'red' | 'yellow' | 'green'
type GamePhase = 'day' | 'night-healer' | 'night-silencer' | 'night-guide'

interface Player {
  id: string
  name: string
  role: string
  isMe: boolean
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

const INITIAL_PLAYERS: Player[] = [
  { id: 'p0', name: 'Mình', role: 'Người Kết Nối', isMe: true, coins: { red: 0, yellow: 0, green: 0 } },
  { id: 'p1', name: 'An', role: 'Người Im Lặng', isMe: false, coins: { red: 0, yellow: 0, green: 0 } },
  { id: 'p2', name: 'Bình', role: 'Người Dẫn Lối', isMe: false, coins: { red: 0, yellow: 0, green: 0 } },
  { id: 'p3', name: 'Chi', role: 'Người Gợi Mở', isMe: false, coins: { red: 0, yellow: 0, green: 0 } },
  { id: 'p4', name: 'Dung', role: 'Người Chữa Lành', isMe: false, coins: { red: 0, yellow: 0, green: 0 } },
  { id: 'p5', name: 'Em', role: 'Người Kết Nối', isMe: false, coins: { red: 0, yellow: 0, green: 0 } },
  { id: 'p6', name: 'Phong', role: 'Người Trao Gửi', isMe: false, coins: { red: 0, yellow: 0, green: 0 } },
  { id: 'p7', name: 'Giang', role: 'Người Im Lặng', isMe: false, coins: { red: 0, yellow: 0, green: 0 } },
  { id: 'p8', name: 'Hà', role: 'Người Kết Nối', isMe: false, coins: { red: 0, yellow: 0, green: 0 } },
]

const COIN_COLORS: Record<CoinType, { bg: string; label: string; emoji: string }> = {
  red:    { bg: '#FF6B6B', label: 'Lòng tốt', emoji: '❤️' },
  yellow: { bg: '#FFD93D', label: 'Trao yêu thương', emoji: '💛' },
  green:  { bg: '#6BCB77', label: 'Được yêu thương', emoji: '💚' },
}

const SYSTEM_MESSAGES: Record<GamePhase, string> = {
  'day': 'Trời sáng! Mọi người mở mắt ☀️',
  'night-healer': 'Người Chữa Lành hãy tỉnh giấc... 🌿',
  'night-silencer': 'Người Im Lặng hãy tỉnh giấc... 🤫',
  'night-guide': 'Người Dẫn Lối hãy tỉnh giấc... 🗺️',
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

// ─── Expanded Card Overlay ────────────────────────────────────────────────────
function ExpandedCard({ player, onClose }: { player: Player; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Card wrapper */}
      <motion.div
        initial={{ scale: 0.4, y: 80 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.4, y: 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative cursor-pointer"
        style={{ 
          perspective: '1000px',
          width: '190px',
          height: '254px',
        }}
        onClick={(e) => { e.stopPropagation(); setFlipped(f => !f) }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          style={{ 
            transformStyle: 'preserve-3d',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Front — decorative back-of-card */}
          <div
            className="absolute inset-0 rounded-2xl border border-[coral] flex flex-col items-center justify-center select-none"
            style={{ 
              backfaceVisibility: 'hidden',
              background: 'linear-gradient(120deg, bisque 60%, rgb(255, 231, 222) 88%, rgb(255, 211, 195) 40%, rgba(255, 127, 80, 0.603) 48%)',
              boxShadow: '0 8px 14px 0 rgba(0,0,0,0.2)',
            }}
          >
            <div className="w-full h-full rounded-2xl overflow-hidden relative flex flex-col items-center justify-center gap-3">
              <div className="text-6xl">🃏</div>
              <div className="text-base font-black tracking-widest uppercase" style={{ color: 'coral' }}>
                EmCoin
              </div>
              <div className="text-xs mt-2" style={{ color: 'coral', opacity: 0.7 }}>
                Nhấn để lật thẻ
              </div>
            </div>
          </div>

          {/* Back — role reveal */}
          <div
            className="absolute inset-0 rounded-2xl border border-[coral] flex flex-col items-center justify-center gap-4 select-none"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(120deg, rgb(255, 174, 145) 30%, coral 88%, bisque 40%, rgb(255, 185, 160) 78%)',
              boxShadow: '0 8px 14px 0 rgba(0,0,0,0.2)',
            }}
          >
            <div className="text-5xl">✨</div>
            <div className="text-center px-4">
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Vai trò của bạn
              </div>
              <div className="text-xl font-black text-white leading-tight">
                {player.role}
              </div>
            </div>
            <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Giữ bí mật nhé! 🤫
            </div>
          </div>
        </motion.div>

        {/* Hint */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white text-xs whitespace-nowrap">
          {flipped ? 'Nhấn để úp lại' : 'Nhấn để xem vai trò'}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Player Card ──────────────────────────────────────────────────────────────
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

  console.log('[PlayerCard] Rendering:', player.name, 'isMe:', player.isMe, 'id:', player.id)

  const handleClick = () => {
    console.log('[PlayerCard] Click:', player.name, 'isMe:', player.isMe)
    // Luôn cho phép xem vai trò của mình
    if (player.isMe) {
      console.log('[PlayerCard] Calling onExpand for Me')
      onExpand()
    } else if (isNightPhase && onNightAction) {
      // Night phase: click vào người khác để thực hiện action
      console.log('[PlayerCard] Night action for:', player.name)
      onNightAction(player.id)
    } else {
      // Day phase: click vào người khác để tặng coin
      console.log('[PlayerCard] Toggle coins for:', player.name)
      setShowCoins(s => !s)
    }
  }

  return (
    <div className="relative flex flex-col">
      {player.isMe && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
          👆 Click me
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
        className={`rounded-2xl border-[3px] ${player.isMe ? 'border-blue-500' : 'border-black'}
                   flex flex-col items-center justify-center gap-1 cursor-pointer
                   select-none aspect-[3/4] relative overflow-hidden
                   ${player.isMe ? 'ring-2 ring-blue-300' : ''}`}
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

        {/* Coin count */}
        <div className="flex gap-1 mt-0.5 pointer-events-none">
          {player.coins.red > 0 && <span className="text-[9px]">❤️{player.coins.red}</span>}
          {player.coins.yellow > 0 && <span className="text-[9px]">💛{player.coins.yellow}</span>}
          {player.coins.green > 0 && <span className="text-[9px]">💚{player.coins.green}</span>}
        </div>

        {/* Me indicator */}
        {player.isMe && (
          <>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2
                            bg-black text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
              Mình
            </div>
            <div className="absolute top-1 right-1 text-xs animate-pulse">
              🔄
            </div>
          </>
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

// ─── Main GameBoard ───────────────────────────────────────────────────────────
export default function GameBoard() {
  // Ensure "Me" is always first
  const sortedInitialPlayers = [...INITIAL_PLAYERS].sort((a, b) => {
    if (a.isMe) return -1
    if (b.isMe) return 1
    return 0
  })
  
  const [players, setPlayers] = useState<Player[]>(sortedInitialPlayers)
  const [expandedPlayer, setExpandedPlayer] = useState<Player | null>(null)
  const [gamePhase, setGamePhase] = useState<GamePhase>('day')
  const [flyCoins, setFlyCoins] = useState<{ id: number; emoji: string; x: number; y: number }[]>([])

  const myPlayer = players.find(p => p.isMe)
  const isMyTurn = gamePhase !== 'day' && (
    (gamePhase === 'night-healer' && myPlayer?.role === 'Người Chữa Lành') ||
    (gamePhase === 'night-silencer' && myPlayer?.role === 'Người Im Lặng') ||
    (gamePhase === 'night-guide' && myPlayer?.role === 'Người Dẫn Lối')
  )

  console.log('[GameBoard] Players order:', players.map(p => `${p.name}(${p.isMe ? 'ME' : 'other'})`))
  console.log('[GameBoard] First player:', players[0]?.name, 'isMe:', players[0]?.isMe)

  const sendCoin = (targetId: string, coin: CoinType) => {
    setPlayers(prev => prev.map(p =>
      p.id === targetId ? { ...p, coins: { ...p.coins, [coin]: p.coins[coin] + 1 } } : p
    ))
    // fly animation
    const id = Date.now()
    const x = Math.random() * 200 - 100
    setFlyCoins(prev => [...prev, { id, emoji: COIN_COLORS[coin].emoji, x, y: 0 }])
    setTimeout(() => setFlyCoins(prev => prev.filter(c => c.id !== id)), 900)
  }

  const handleNightAction = (targetId: string) => {
    if (gamePhase === 'night-healer') {
      setPlayers(prev => prev.map(p => ({ ...p, isHealed: p.id === targetId })))
      nextPhase()
    } else if (gamePhase === 'night-silencer') {
      setPlayers(prev => prev.map(p => ({ ...p, isMuted: p.id === targetId })))
      nextPhase()
    } else if (gamePhase === 'night-guide') {
      // Guide logic here
      nextPhase()
    }
  }

  const nextPhase = () => {
    const phases: GamePhase[] = ['day', 'night-healer', 'night-silencer', 'night-guide']
    const currentIndex = phases.indexOf(gamePhase)
    const nextIndex = (currentIndex + 1) % phases.length
    setGamePhase(phases[nextIndex])
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-sm mx-auto rounded-3xl border-4 border-black
                   bg-white p-4 flex flex-col gap-4"
      >
        {/* Debug button */}
        <button
          onClick={() => {
            console.log('[Debug] Test button clicked')
            const mePlayer = players.find(p => p.isMe)
            if (mePlayer) {
              console.log('[Debug] Setting expanded player:', mePlayer)
              setExpandedPlayer(mePlayer)
            }
          }}
          className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs px-2 py-1 rounded"
        >
          Test Me Card
        </button>

        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {players.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onExpand={() => {
                console.log('[GameBoard] onExpand called for:', player.name)
                setExpandedPlayer(player)
              }}
              onSendCoin={(coin) => sendCoin(player.id, coin)}
              onNightAction={isMyTurn ? handleNightAction : undefined}
              isGlowing={isMyTurn && player.isMe}
              isNightPhase={gamePhase !== 'day'}
            />
          ))}
        </div>

        {/* Bottom message bar */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={nextPhase}
          className="w-full rounded-2xl border-[3px] border-black bg-[#FFF9C4]
                     px-4 py-3 text-left"
        >
          <TypewriterText key={gamePhase} text={SYSTEM_MESSAGES[gamePhase]} />
        </motion.button>
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
    </div>
  )
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, 35)
    return () => clearInterval(interval)
  }, [text])

  return <span className="text-sm font-bold text-gray-700">{displayed}</span>
}
