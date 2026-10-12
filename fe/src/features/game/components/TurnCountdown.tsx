import { useEffect, useState } from 'react'
import { motion, useIsPresent } from 'framer-motion'

/** A local display clock, not the server's phase scheduler. Keyed by its owner. */
export function TurnCountdown({ duration }: { duration: number }) {
  const present = useIsPresent()
  const [seconds, setSeconds] = useState(duration)
  useEffect(() => {
    if (!present) return
    setSeconds(duration)
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setSeconds(Math.max(0, duration - elapsed))
      if (elapsed >= duration) window.clearInterval(timer)
    }, 250)
    return () => window.clearInterval(timer)
  }, [duration, present])
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.78, x: 10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.78, x: 10 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className="absolute top-2 right-[54px] z-30 flex h-[38px] min-w-[52px] items-center justify-center rounded-full border-2 border-[var(--c-black)] bg-[#e6f9ff] px-3 text-center shadow-[0_3px_0_rgba(0,0,0,0.2)]"
      data-testid="turn-countdown-popup"
      data-ui-chrome="countdown"
    >
      <span className="font-display text-base leading-none text-[var(--c-black)]">{seconds}</span>
    </motion.div>
  )
}
