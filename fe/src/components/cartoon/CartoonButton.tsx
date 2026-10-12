import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { forwardRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CONTROL_HEIGHTS, CONTROL_MOTION, controlState } from './controlTokens'
import { useControlTheme } from './controlThemeContext'
import { circleAppearance, pillAppearance, isBrandTheme } from './controlThemes'
import { BrandIcon, type BrandIconName } from './BrandIcon'
import { Settings, BookOpen, Image as ImageIcon, Volume2, VolumeX, Music2, X, ArrowLeft, ArrowRight, ChevronDown, CircleHelp, Play } from 'lucide-react'

const UI_ICONS = {
  '/emcoin/icons/orbit/help.svg': CircleHelp,
  '/emcoin/icons/orbit/play.svg': Play,
  '/emcoin/icons/orbit/settings.svg': Settings,
  '/emcoin/icons/orbit/book.svg': BookOpen,
  '/emcoin/icons/orbit/photo.svg': ImageIcon,
  '/emcoin/icons/orbit/sound.svg': Volume2,
  '/emcoin/icons/orbit/mute.svg': VolumeX,
  '/emcoin/icons/orbit/music.svg': Music2,
  '/emcoin/icons/orbit/close.svg': X,
  '/emcoin/icons/orbit/arrowLeft.svg': ArrowLeft,
  '/emcoin/icons/orbit/arrowRight.svg': ArrowRight,
  '/emcoin/icons/orbit/down.svg': ChevronDown,
} as const

// ─── Pill button ─────────────────────────────────────────────────────────────
const PILL_SRCS: Record<string, { src: string; textColor: string }> = {
  green:   { src: '/cartoon/buttons/pill/Green.png',   textColor: '#fff' },
  orange:  { src: '/cartoon/buttons/pill/Orange.png',  textColor: '#fff' },
  pink:    { src: '/cartoon/buttons/pill/Pink.png',    textColor: '#fff' },
  purple:  { src: '/cartoon/buttons/pill/Purple.png',  textColor: '#fff' },
  teal:    { src: '/cartoon/buttons/pill/Teal.png',    textColor: '#fff' },
}

type PillColor = keyof typeof PILL_SRCS
type PillSize  = 'sm' | 'md' | 'lg'

interface CartoonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: PillColor
  size?:  PillSize
  pending?: boolean
  badge?: string
}

export const CartoonButton = forwardRef<HTMLButtonElement, CartoonButtonProps>(
  ({ color = 'green', size = 'md', className, style, children, disabled, pending = false, badge, type = 'button', 'aria-busy': callerBusy, ...props }, ref) => {
    const theme = useControlTheme()
    const { src, textColor, themed, shadow } = pillAppearance(theme, color, PILL_SRCS[color] ?? PILL_SRCS.green)
    const reduceMotion = useReducedMotion()
    const { blocked, animate } = controlState(disabled, pending, reduceMotion)

    return (
      <motion.button
        ref={ref}
        className={cn(
          'cartoon-control relative inline-flex items-center justify-center p-0 bg-transparent border-none cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        style={{ color: textColor, transformOrigin: 'center', ...style }}
        type={type}
        disabled={blocked}
        aria-busy={pending ? true : callerBusy}
        // Squash on press — scaleX widens, scaleY flattens like pressing a ball
        whileTap={animate ? isBrandTheme(theme) ? { scale: 0.98 } : CONTROL_MOTION.pill.press : undefined}
        // Subtle inflate on hover — ball swells slightly
        whileHover={animate ? isBrandTheme(theme) ? { y: -1 } : CONTROL_MOTION.pill.hover : undefined}
        // Bouncy return: spring overshoots → scaleX dips, scaleY rises → "stretch" phase
        transition={CONTROL_MOTION.pill.return}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
        data-control-theme={themed ? theme : 'legacy'}
      >
        <span data-cartoon-surface="pill" className="relative inline-flex max-w-full items-center justify-center">
        <EmcoinImage
          src={src}
          alt=""
          className={cn('block w-auto object-contain pointer-events-none select-none', CONTROL_HEIGHTS.pill[size])}
          style={{ filter: shadow }}
          draggable={false}
        />
        <span className={cn('absolute inset-0 flex items-center justify-center font-display text-[1.1rem] whitespace-nowrap px-4 pointer-events-none', !themed && 'drop-shadow-md')}>
          {children}
        </span>
        {badge && <span data-cartoon-badge="pill" aria-hidden="true" className="cartoon-pill-badge font-display">{badge}</span>}
        </span>
      </motion.button>
    )
  },
)
CartoonButton.displayName = 'CartoonButton'

// ─── Circle / Square button ───────────────────────────────────────────────────
const CIRCLE_SRCS: Record<string, string> = {
  blue:        '/cartoon/buttons/circle/Blue.png',
  'blue-teal': '/cartoon/buttons/circle/Blue-Teal.png',
  red:         '/cartoon/buttons/circle/Red.png',
  yellow:      '/cartoon/buttons/circle/Yellow.png',
  violet:      '/cartoon/buttons/circle/Violet.png',
  purple:      '/cartoon/buttons/circle/Purple.png',
  gray:        '/cartoon/buttons/circle/Gray.png',
  dark:        '/cartoon/buttons/circle/Dark.png',
  brown:       '/cartoon/buttons/circle/Brown.png',
  bordeaux:    '/cartoon/buttons/circle/Bordeaux.png',
  light:       '/cartoon/buttons/circle/Light.png',
  neutral:     '/cartoon/buttons/circle/Neutral.png',
  white:       '/cartoon/buttons/circle/White.png',
  transparent: '/cartoon/buttons/circle/Transparent.png',
}

type CircleColor = keyof typeof CIRCLE_SRCS
type CircleSize  = 'sm' | 'md' | 'lg' | 'xl'

interface CartoonCircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?:    CircleColor
  size?:     CircleSize
  iconSrc?:  string
  iconAlt?:  string
  iconSize?: string
  badge?:    number | string
  pending?: boolean
}

export const CartoonCircleButton = forwardRef<HTMLButtonElement, CartoonCircleButtonProps>(
  ({ color = 'blue', size = 'md', iconSrc, iconAlt = '', iconSize = '55%', badge, className, disabled, pending = false, type = 'button', children, 'aria-busy': callerBusy, ...props }, ref) => {
    const theme = useControlTheme()
    const { src, textColor, themed, shadow } = circleAppearance(theme, color, CIRCLE_SRCS[color] ?? CIRCLE_SRCS.blue)
    const Icon = iconSrc ? UI_ICONS[iconSrc as keyof typeof UI_ICONS] : undefined
    const brandIcons: Record<string, BrandIconName> = { '/emcoin/icons/orbit/help.svg': 'help', '/emcoin/icons/orbit/settings.svg': 'settings', '/emcoin/icons/orbit/book.svg': 'book', '/emcoin/icons/orbit/close.svg': 'close' }
    const brandIcon = (theme === 'kindness-workshop' || (theme === 'emotion-orbit' && iconSrc === '/emcoin/icons/orbit/help.svg')) && iconSrc ? brandIcons[iconSrc] : undefined
    const reduceMotion = useReducedMotion()
    const { blocked, animate } = controlState(disabled, pending, reduceMotion)

    return (
      <motion.button
        ref={ref}
        className={cn(
          'cartoon-control relative inline-flex items-center justify-center p-0 bg-transparent border-none cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        style={{ transformOrigin: 'center', color: textColor }}
        type={type}
        disabled={blocked}
        aria-busy={pending ? true : callerBusy}
        // Circle = more pronounced blob squash (like a water balloon)
        whileTap={animate ? isBrandTheme(theme) ? { scale: 0.96 } : CONTROL_MOTION.circle.press : undefined}
        whileHover={animate ? isBrandTheme(theme) ? { y: -1 } : CONTROL_MOTION.circle.hover : undefined}
        // Lower damping for circle = more wobble oscillations = more "blob" feel
        transition={CONTROL_MOTION.circle.return}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
        data-control-theme={themed ? theme : 'legacy'}
      >
        <EmcoinImage
          src={src}
          alt=""
          className={cn('block w-auto object-contain pointer-events-none select-none', CONTROL_HEIGHTS.circle[size])}
          style={{ filter: shadow }}
          draggable={false}
        />
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {brandIcon ? <span role={iconAlt ? 'img' : undefined} aria-label={iconAlt || undefined} style={{ display: 'contents' }}><BrandIcon name={brandIcon} style={{ width: iconSize, height: iconSize }} /></span> : themed && Icon ? <Icon aria-hidden={!iconAlt} aria-label={iconAlt || undefined} style={{ width: iconSize, height: iconSize }} strokeWidth={2.6} /> : iconSrc ? (
            <EmcoinImage
              src={iconSrc}
              alt={iconAlt}
              className="object-contain"
              style={{ width: iconSize, height: iconSize }}
              draggable={false}
            />
          ) : (
            children
          )}
        </span>
        {badge !== undefined && badge !== null && (
          <span
            className="absolute bottom-0 right-0 flex items-center justify-center font-display text-white"
            style={{
              background: themed ? 'var(--brand-blush)' : 'linear-gradient(135deg, #7B4FD4, #5B2FB4)',
              color: themed ? 'var(--brand-ink)' : undefined,
              border: '2.5px solid white',
              borderRadius: '9999px',
              minWidth: 22,
              height: 22,
              fontSize: 11,
              padding: '0 5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
              lineHeight: 1,
            }}
          >
            {badge}
          </span>
        )}
      </motion.button>
    )
  },
)
CartoonCircleButton.displayName = 'CartoonCircleButton'
