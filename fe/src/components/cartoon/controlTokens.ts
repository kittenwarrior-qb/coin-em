/** Existing control values only. Changing this seam is not permission to replace art. */
export const CONTROL_HEIGHTS = {
  pill: { sm: 'h-10', md: 'h-14', lg: 'h-16' },
  circle: { sm: 'h-10', md: 'h-14', lg: 'h-16', xl: 'h-20' },
} as const

export const CONTROL_SPRITE_SHADOW = 'drop-shadow(0 6px 4px rgba(0,0,0,0.18))'

const PRESS = { type: 'spring', stiffness: 700, damping: 22 } as const
const HOVER = { type: 'spring', stiffness: 350, damping: 18 } as const
export const CONTROL_MOTION = {
  pill: {
    press: { scaleX: 1.09, scaleY: 0.87, transition: PRESS },
    hover: { scaleX: 1.04, scaleY: 0.97, transition: HOVER },
    return: { type: 'spring', stiffness: 420, damping: 9 },
  },
  circle: {
    press: { scaleX: 1.14, scaleY: 0.86, transition: PRESS },
    hover: { scaleX: 1.06, scaleY: 0.96, transition: HOVER },
    return: { type: 'spring', stiffness: 360, damping: 8 },
  },
} as const

export function controlState(disabled: boolean | undefined, pending: boolean, reducedMotion: boolean | null) {
  const blocked = Boolean(disabled || pending)
  return { blocked, animate: !blocked && !reducedMotion }
}
