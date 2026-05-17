import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { PreloadState } from '@/hooks/useAssetPreloader'

interface Rect { left: number; top: number; w: number; h: number }

interface Props {
  state: PreloadState
  onExited?: (splashLogoRect: Rect) => void
  onFullyGone?: () => void
}

export function AssetPreloaderScreen({ state, onExited, onFullyGone }: Props) {
  const { progress, done } = state
  const [showFinished, setShowFinished] = useState(false)
  const [rippling, setRippling] = useState(false)
  const [gone, setGone] = useState(false)
  const splashLogoRef = useRef<HTMLImageElement>(null)

  // Measured positions for flying logo
  const [splashRect, setSplashRect] = useState<Rect | null>(null)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!done) return
    const t1 = setTimeout(() => setShowFinished(true), 100)
    const t2 = setTimeout(() => {
      // Measure both logos before starting animation
      const splashEl = splashLogoRef.current
      const homeEl = document.getElementById('home-logo')
      if (splashEl) {
        const r = splashEl.getBoundingClientRect()
        setSplashRect({ left: r.left, top: r.top, w: r.width, h: r.height })
      }
      if (homeEl) {
        const r = homeEl.getBoundingClientRect()
        setTargetRect({ left: r.left, top: r.top, w: r.width, h: r.height })
      }
      setRippling(true)
    }, 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [done])

  if (gone) return null

  // Flying logo: fixed at splash position, animates to home-logo position
  const splashCX = splashRect ? splashRect.left + splashRect.w / 2 : 0
  const splashCY = splashRect ? splashRect.top + splashRect.h / 2 : 0
  const targetCX = targetRect ? targetRect.left + targetRect.w / 2 : 0
  const targetCY = targetRect ? targetRect.top + targetRect.h / 2 : 0
  const flyScale = (splashRect && targetRect) ? targetRect.h / splashRect.h : 1

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'var(--c-bg)' }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 430, height: '100dvh', overflow: 'hidden' }}>

        {/* Layer 1: home background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/cartoon/ui/home-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }} />

        {/* Layer 2: bg */}
        <div style={{ position: 'absolute', inset: 0, background: '#1695b1' }} />

        {/* Layer 3: expanding home-bg circle */}
        {rippling && (
          <motion.div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(/cartoon/ui/home-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              clipPath: 'circle(0% at 50% 40%)',
            }}
            animate={{ clipPath: 'circle(150% at 50% 40%)' }}
            transition={{ duration: 0.7, ease: [0.85, 0, 0.15, 1] }}
            onAnimationComplete={() => {
              onExited?.(splashRect ?? { left: 0, top: 0, w: 64, h: 64 })
              setGone(true)
              onFullyGone?.()
            }}
          />
        )}

        {/* Static content (progress bar only, logo handled separately) */}
        <div
          className="relative flex flex-col items-center justify-center gap-6"
          style={{ width: '100%', height: '100%', zIndex: 3 }}
        >
          {/* Invisible placeholder to keep layout — actual logo rendered below as fixed */}
          {!rippling && (
            <img
              ref={splashLogoRef}
              src="/emcoin_logo.png"
              alt="EmCoin"
              style={{ height: 64, objectFit: 'contain', opacity: rippling ? 0 : 1 }}
            />
          )}
          {rippling && <div style={{ height: 64 }} />}

          <motion.div
            className="flex flex-col items-center gap-2 w-48"
            animate={{ opacity: rippling ? 0 : 1 }}
            transition={{ duration: 0.15 }}
          >
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#41e4ed' }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.3 }}
              />
            </div>
            <p className="font-display text-xs" style={{ color: '#fff' }}>
              {showFinished ? 'Finished' : `${state.loaded}/${state.total}`}
            </p>
            {!showFinished && state.currentFile ? (
              <p className="font-body text-[10px] opacity-60 truncate w-48 text-center" style={{ color: '#fff' }}>
                {state.currentFile}
              </p>
            ) : null}
          </motion.div>
        </div>
      </div>

      {/* Flying logo — fixed, animates from splash center to home-logo center simultaneously with circle */}
      {rippling && splashRect && targetRect && (
        <motion.img
          src="/emcoin_logo.png"
          alt=""
          style={{
            position: 'fixed',
            left: splashRect.left,
            top: splashRect.top,
            width: splashRect.w,
            height: splashRect.h,
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
            zIndex: 10000,
            pointerEvents: 'none',
            transformOrigin: 'center center',
          }}
          initial={{ x: 0, y: 0, scale: 1 }}
          animate={{
            x: targetCX - splashCX,
            y: targetCY - splashCY,
            scale: flyScale,
          }}
          transition={{ duration: 0.55, ease: [0.34, 1.2, 0.64, 1] }}
        />
      )}
    </div>
  )
}
