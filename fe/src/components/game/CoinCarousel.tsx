import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlipCard } from './FlipCard'
import { CARD_IMAGES } from '@/constants/cardImages'

interface CoinCarouselProps {
  initialCoinType?: 'red' | 'yellow' | 'green'
  title?: string
  coins: { red: number; yellow: number; green: number }
  onClose: () => void
}

const COIN_DATA = [
  { type: 'green' as const, front: CARD_IMAGES.coins.green1, back: CARD_IMAGES.coins.green2, alt: 'coin xanh', name: 'Coin Xanh', color: '#4ADE80' },
  { type: 'yellow' as const, front: CARD_IMAGES.coins.yellow1, back: CARD_IMAGES.coins.yellow2, alt: 'coin vàng', name: 'Coin Vàng', color: '#FFD700' },
  { type: 'red' as const, front: CARD_IMAGES.coins.red1, back: CARD_IMAGES.coins.red2, alt: 'coin đỏ', name: 'Coin Đỏ', color: 'var(--c-pink)' },
]

export function CoinCarousel({ initialCoinType = 'yellow', title, coins, onClose }: CoinCarouselProps) {
  const initialIndex = COIN_DATA.findIndex(c => c.type === initialCoinType)
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 1)
  const [previewDir, setPreviewDir] = useState<1 | -1>(1)

  const currentCoin = COIN_DATA[currentIndex]
  const currentCoinCount = coins[currentCoin.type]

  const navigatePreview = (dir: 1 | -1) => {
    const next = currentIndex + dir
    if (next < 0 || next >= COIN_DATA.length) return
    setPreviewDir(dir)
    setCurrentIndex(next)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ maxWidth: 430, margin: '0 auto' }}
      onClick={onClose}
    >
      {title && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.1 }}
          className="absolute top-[15%] px-6 py-3 rounded-2xl z-10"
        >
          <p className="font-display text-lg text-white text-center">
            {title === 'Bạn đã được Người Trao Gửi tặng 5 coin vàng' ? (
              <>
                <span className="text-[#60A5FA] font-bold">Bạn</span> đã được <span className="text-[#FF69B4] font-bold">Người Trao Gửi</span> tặng <span className="text-[#FFD700] font-bold">5 coin vàng</span>
              </>
            ) : title === 'Bạn đã hoàn thành vai trò và nhận 5 coin vàng' ? (
              <>
                <span className="text-[#60A5FA] font-bold">Bạn</span> đã <span className="text-[#4ADE80] font-bold">hoàn thành vai trò</span> và nhận <span className="text-[#FFD700] font-bold">5 coin vàng</span>
              </>
            ) : (
              title
            )}
          </p>
        </motion.div>
      )}

      {/* Coin count display */}
      {!title && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.1 }}
          className="absolute top-[15%] px-6 py-3 rounded-2xl z-10"
        >
          <p className="font-display text-lg text-white text-center">
            <span className="text-[#60A5FA] font-bold">Bạn</span> đang sở hữu{' '}
            <span className="font-bold" style={{ color: currentCoin.color }}>
              {currentCoinCount} {currentCoin.name.toLowerCase()}
            </span>
          </p>
        </motion.div>
      )}

      {/* Prev button */}
      <button
        className="absolute left-2 z-10 p-2 disabled:opacity-20 transition-opacity"
        onClick={e => { e.stopPropagation(); navigatePreview(-1) }}
        disabled={currentIndex <= 0}
        aria-label="Coin trước"
      >
        <img 
          src="/cartoon/icons/Arrow---Right.svg" 
          alt="prev" 
          className="w-8 h-8" 
          style={{ transform: 'scaleX(-1)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} 
          draggable={false} 
        />
      </button>

      {/* Coin carousel with slide transition */}
      <AnimatePresence mode="popLayout" custom={previewDir}>
        <motion.div
          key={currentCoin.type}
          custom={previewDir}
          variants={{
            enter: (dir: number) => ({ x: dir * 120, opacity: 0, scale: 0.92 }),
            center: { x: 0, opacity: 1, scale: 1 },
            exit: (dir: number) => ({ x: dir * -120, opacity: 0, scale: 0.92 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) navigatePreview(1)
            else if (info.offset.x > 60) navigatePreview(-1)
          }}
          onClick={e => e.stopPropagation()}
          className="flex flex-col items-center"
        >
          <FlipCard
            frontImage={currentCoin.front}
            backImage={currentCoin.back}
            altText={currentCoin.alt}
            size="large"
            aspect="coin"
            onClose={undefined}
          />
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      <button
        className="absolute right-2 z-10 p-2 disabled:opacity-20 transition-opacity"
        onClick={e => { e.stopPropagation(); navigatePreview(1) }}
        disabled={currentIndex >= COIN_DATA.length - 1}
        aria-label="Coin tiếp"
      >
        <img 
          src="/cartoon/icons/Arrow---Right.svg" 
          alt="next" 
          className="w-8 h-8" 
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} 
          draggable={false} 
        />
      </button>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-display text-xs text-white/70">
        {currentIndex + 1} / {COIN_DATA.length}
      </div>
    </motion.div>
  )
}
