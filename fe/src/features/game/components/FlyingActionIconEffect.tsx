import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { themeArtUrl } from '@/components/cartoon/controlThemes'

export function FlyingActionIconEffect({
  fromId,
  toId,
  nonce,
  iconSrc,
  onDone,
}: {
  fromId: string
  toId: string
  nonce: number
  iconSrc: string
  onDone: () => void
}) {
  const theme = useControlTheme()
  const [coords, setCoords] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null)

  useEffect(() => {
    const findToken = (id: string) =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-player-avatar-id]'))
        .find(el => el.dataset.playerAvatarId === id) ??
      Array.from(document.querySelectorAll<HTMLElement>('[data-player-token-id]'))
        .find(el => el.dataset.playerTokenId === id)

    const fromEl = findToken(fromId)
    const toEl = findToken(toId)
    if (!fromEl || !toEl) {
      onDone()
      return
    }

    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()
    setCoords({
      from: { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 },
      to: { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 },
    })
  }, [fromId, toId, nonce, onDone])

  if (!coords) return null

  return (
    <motion.img
      key={nonce}
      src={themeArtUrl(theme, iconSrc)}
      alt=""
      initial={{ x: coords.from.x - 18, y: coords.from.y - 18, scale: 0.9, opacity: 0 }}
      animate={{
        x: coords.to.x - 18,
        y: coords.to.y - 18,
        scale: [0.9, 1.08, 1.08, 1.85],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 1.45,
        times: [0, 0.56, 0.76, 1],
        ease: [0.25, 0.8, 0.25, 1],
      }}
      onAnimationComplete={onDone}
      className="fixed left-0 top-0 z-[70] h-9 w-9 pointer-events-none object-contain"
      style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))' }}
    />
  )
}
