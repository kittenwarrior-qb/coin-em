import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PreloadState } from '@/hooks/useAssetPreloader'

interface Props {
  state: PreloadState
  onExited?: () => void  // called when splash fully gone
}

export function AssetPreloaderScreen({ state, onExited }: Props) {
  const { progress, done } = state
  const [showFinished, setShowFinished] = useState(false)
  const [logoFlying, setLogoFlying] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [targetY, setTargetY] = useState(0)
  const splashLogoRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!done) return

    // t1: show "Finished" text
    // t2: measure + start logo fly (after 600ms pause)
    // t3: start fade out (after logo animation ~550ms)
    // t4: notify parent fully gone

    const t1 = setTimeout(() => setShowFinished(true), 100)

    const t2 = setTimeout(() => {
      const splashLogo = splashLogoRef.current
      const homeLogo = document.getElementById('home-logo')
      if (splashLogo && homeLogo) {
        const splashRect = splashLogo.getBoundingClientRect()
        const homeRect = homeLogo.getBoundingClientRect()
        setTargetY(
          (homeRect.top + homeRect.height / 2) - (splashRect.top + splashRect.height / 2)
        )
      }
      setLogoFlying(true)
    }, 900)  // 800ms pause after "Finished"

    const t3 = setTimeout(() => {
      setExiting(true)
      onExited?.()   // mount Lobby ngay khi splash bắt đầu fade → PopIn chạy đồng thời
    }, 900 + 600)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [done, onExited])

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="preloader"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'var(--c-bg)' }}
        >
          <div
            className="relative flex flex-col items-center justify-center gap-6"
            style={{
              width: '100%',
              maxWidth: 430,
              minHeight: '100dvh',
              backgroundImage: 'url(/cartoon/ui/home-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }}
          >
            {/* Logo */}
            <motion.img
              ref={splashLogoRef}
              src="/emcoin_logo.png"
              alt="EmCoin"
              initial={{ scale: 0.85, opacity: 0, y: 0 }}
              animate={logoFlying
                ? { scale: 1.56, opacity: 1, y: targetY }
                : { scale: 1, opacity: 1, y: 0 }
              }
              transition={logoFlying
                ? { duration: 0.55, ease: [0.34, 1.2, 0.64, 1] }
                : { duration: 0.45, ease: 'easeOut' }
              }
              style={{ height: 64, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}
            />

            {/* Progress bar */}
            <motion.div
              className="flex flex-col items-center gap-2 w-48"
              animate={{ opacity: logoFlying ? 0 : 1, y: logoFlying ? 8 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--c-blue-mid), var(--c-teal))' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
              <p className="font-display text-xs" style={{ color: 'var(--c-blue-mid)' }}>
                {showFinished ? '✓ Finished' : `${progress}%`}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
