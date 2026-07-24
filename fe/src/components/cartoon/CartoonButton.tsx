import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Squash & Stretch spring ──────────────────────────────────────────────────
// Low damping (9) → spring overshoots on release → natural "stretch" phase
// High stiffness → fast squash on press, snappy feel
const BLOB_RETURN   = { type: 'spring', stiffness: 420, damping: 9 }  as const
const BLOB_PRESS    = { type: 'spring', stiffness: 700, damping: 22 } as const
const BLOB_HOVER_IN = { type: 'spring', stiffness: 350, damping: 18 } as const

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
}

export const CartoonButton = forwardRef<HTMLButtonElement, CartoonButtonProps>(
  ({ color = 'green', size = 'md', className, style, children, disabled, ...props }, ref) => {
    const { src, textColor } = PILL_SRCS[color] ?? PILL_SRCS.green

    const heights: Record<PillSize, string> = {
      sm: 'h-10',
      md: 'h-14',
      lg: 'h-16',
    }

    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center p-0 bg-transparent border-none outline-none cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        style={{ color: textColor, transformOrigin: 'center', ...style }}
        disabled={disabled}
        // Squash on press — scaleX widens, scaleY flattens like pressing a ball
        whileTap={disabled ? undefined : {
          scaleX: 1.09,
          scaleY: 0.87,
          transition: BLOB_PRESS,
        }}
        // Subtle inflate on hover — ball swells slightly
        whileHover={disabled ? undefined : {
          scaleX: 1.04,
          scaleY: 0.97,
          transition: BLOB_HOVER_IN,
        }}
        // Bouncy return: spring overshoots → scaleX dips, scaleY rises → "stretch" phase
        transition={BLOB_RETURN}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        <img
          src={src}
          alt=""
          className={cn('block w-auto object-contain pointer-events-none select-none', heights[size])}
          style={{ filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.18))' }}
          draggable={false}
        />
        <span className="absolute inset-0 flex items-center justify-center font-display text-[1.1rem] drop-shadow-md whitespace-nowrap px-4 pointer-events-none">
          {children}
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
}

export const CartoonCircleButton = forwardRef<HTMLButtonElement, CartoonCircleButtonProps>(
  ({ color = 'blue', size = 'md', iconSrc, iconAlt = '', iconSize = '55%', badge, className, disabled, children, ...props }, ref) => {
    const src = CIRCLE_SRCS[color] ?? CIRCLE_SRCS.blue

    const sizes: Record<CircleSize, string> = {
      sm: 'h-10',
      md: 'h-14',
      lg: 'h-16',
      xl: 'h-20',
    }

    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center p-0 bg-transparent border-none outline-none cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        style={{ transformOrigin: 'center' }}
        disabled={disabled}
        // Circle = more pronounced blob squash (like a water balloon)
        whileTap={disabled ? undefined : {
          scaleX: 1.14,
          scaleY: 0.86,
          transition: BLOB_PRESS,
        }}
        whileHover={disabled ? undefined : {
          scaleX: 1.06,
          scaleY: 0.96,
          transition: BLOB_HOVER_IN,
        }}
        // Lower damping for circle = more wobble oscillations = more "blob" feel
        transition={{ type: 'spring', stiffness: 360, damping: 8 }}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        <img
          src={src}
          alt=""
          className={cn('block w-auto object-contain pointer-events-none select-none', sizes[size])}
          style={{ filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.18))' }}
          draggable={false}
        />
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {iconSrc ? (
            <img
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
              background: 'linear-gradient(135deg, #7B4FD4, #5B2FB4)',
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
