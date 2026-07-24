/**
 * CartoonSoundButton / CartoonMusicButton
 * Replicates SoundButton.cs + MusicButton.cs + SpriteSwapper.cs
 *
 * - Persists state to localStorage (web equivalent of PlayerPrefs)
 * - Swaps icon between Sound-On.svg / Sound-Off.svg (SpriteSwapper)
 * - Controls a shared audio context (web equivalent of AudioListener.volume)
 */
import { useState, useEffect } from 'react'
import { CartoonCircleButton } from './CartoonButton'
import { cn } from '@/lib/utils'

// ─── Shared audio helpers ─────────────────────────────────────────────────────

function getPrefs(key: string, fallback = true): boolean {
  try { return localStorage.getItem(key) !== '0' } catch { return fallback }
}
function setPrefs(key: string, val: boolean) {
  try { localStorage.setItem(key, val ? '1' : '0') } catch { /* noop */ }
}

// ─── Sound Button ─────────────────────────────────────────────────────────────

interface CartoonSoundButtonProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Called when toggled, passes new state */
  onToggle?: (on: boolean) => void
}

export function CartoonSoundButton({ size = 'md', className, onToggle }: CartoonSoundButtonProps) {
  const [on, setOn] = useState(() => getPrefs('sound_on'))

  useEffect(() => { setPrefs('sound_on', on) }, [on])

  const toggle = () => {
    const next = !on
    setOn(next)
    onToggle?.(next)
  }

  return (
    <CartoonCircleButton
      color={on ? 'teal' : 'gray'}
      size={size}
      onClick={toggle}
      aria-label={on ? 'Tắt âm thanh' : 'Bật âm thanh'}
      className={cn('transition-all', className)}
    >
      <img
        src={on ? '/cartoon/icons/Sound-On.svg' : '/cartoon/icons/Sound-Off.svg'}
        alt={on ? 'Sound On' : 'Sound Off'}
        className="btn-icon brightness-0 invert"
      />
    </CartoonCircleButton>
  )
}

// ─── Music Button ─────────────────────────────────────────────────────────────

interface CartoonMusicButtonProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onToggle?: (on: boolean) => void
}

export function CartoonMusicButton({ size = 'md', className, onToggle }: CartoonMusicButtonProps) {
  const [on, setOn] = useState(() => getPrefs('music_on'))

  useEffect(() => { setPrefs('music_on', on) }, [on])

  const toggle = () => {
    const next = !on
    setOn(next)
    onToggle?.(next)
  }

  return (
    <CartoonCircleButton
      color={on ? 'purple' : 'gray'}
      size={size}
      onClick={toggle}
      aria-label={on ? 'Tắt nhạc' : 'Bật nhạc'}
      className={cn('transition-all', className)}
    >
      <img
        src={on ? '/cartoon/icons/Music.svg' : '/cartoon/icons/Sound-Off.svg'}
        alt={on ? 'Music On' : 'Music Off'}
        className="btn-icon brightness-0 invert"
      />
    </CartoonCircleButton>
  )
}
