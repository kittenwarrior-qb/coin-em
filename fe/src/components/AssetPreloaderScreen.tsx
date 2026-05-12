import { motion, AnimatePresence } from 'framer-motion'
import type { PreloadState } from '@/hooks/useAssetPreloader'

interface Props {
  state: PreloadState
}

export function AssetPreloaderScreen({ state }: Props) {
  const { progress, loaded, total } = state

  return (
    <AnimatePresence>
      <motion.div
        key="preloader"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6"
        style={{
          background: 'linear-gradient(160deg, #f9e4f7 0%, #dff0ff 60%, #e8f9f0 100%)',
        }}
      >
        {/* Logo */}
        <motion.img
          src="/emcoin_logo.png"
          alt="EmCoin"
          className="w-32 object-contain"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
        />

        {/* Card flip animation */}
        <motion.div
          animate={{ rotateY: [0, 180, 360] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="text-5xl select-none"
          style={{ transformStyle: 'preserve-3d' }}
        >
          🎴
        </motion.div>

        {/* Progress bar */}
        <div className="w-56 flex flex-col items-center gap-2">
          <div className="w-full h-3 rounded-full bg-white/60 overflow-hidden shadow-inner">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #b57bee, #6ec6f5)',
                width: `${progress}%`,
              }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
          <p className="font-body text-xs text-[#8a7aaa]">
            Đang tải... {loaded}/{total}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
