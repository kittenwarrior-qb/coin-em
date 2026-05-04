import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

// ─── Pill button ─────────────────────────────────────────────────────────────
// Source PSD: cartoon-gui-pack-v2.0.4/all_files/Shape.psd (base template)
// Export size: 260×100 px, PNG-24
// Output path: /cartoon/buttons/pill/<Color>.png
//
// Colors available (export from Shape.psd, change gradient fill layer):
//   ✅ Green   ✅ Orange  ✅ Pink    ✅ Purple  ✅ Teal
//   ⬜ Blue    ⬜ Red     ⬜ Yellow  ⬜ Violet  ⬜ Gray
//   ⬜ Dark    ⬜ Brown   ⬜ White   ⬜ Bordeaux

const PILL_SRCS: Record<string, { src: string; textColor: string }> = {
  green:   { src: '/cartoon/buttons/pill/Green.png',   textColor: '#fff' },
  orange:  { src: '/cartoon/buttons/pill/Orange.png',  textColor: '#fff' },
  pink:    { src: '/cartoon/buttons/pill/Pink.png',    textColor: '#fff' },
  purple:  { src: '/cartoon/buttons/pill/Purple.png',  textColor: '#fff' },
  teal:    { src: '/cartoon/buttons/pill/Teal.png',    textColor: '#fff' },
  // Add more here after exporting from Shape.psd:
  // blue:    { src: '/cartoon/buttons/pill/Blue.png',    textColor: '#fff' },
  // red:     { src: '/cartoon/buttons/pill/Red.png',     textColor: '#fff' },
  // yellow:  { src: '/cartoon/buttons/pill/Yellow.png',  textColor: '#3a2800' },
  // violet:  { src: '/cartoon/buttons/pill/Violet.png',  textColor: '#fff' },
  // gray:    { src: '/cartoon/buttons/pill/Gray.png',    textColor: '#444' },
  // dark:    { src: '/cartoon/buttons/pill/Dark.png',    textColor: '#fff' },
  // brown:   { src: '/cartoon/buttons/pill/Brown.png',   textColor: '#fff' },
  // white:   { src: '/cartoon/buttons/pill/White.png',   textColor: '#2a5a8a' },
}

type PillColor = keyof typeof PILL_SRCS
type PillSize  = 'sm' | 'md' | 'lg'

interface CartoonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: PillColor
  size?:  PillSize
}

export const CartoonButton = forwardRef<HTMLButtonElement, CartoonButtonProps>(
  ({ color = 'green', size = 'md', className, style, children, ...props }, ref) => {
    const { src, textColor } = PILL_SRCS[color] ?? PILL_SRCS.green

    const heights: Record<PillSize, string> = {
      sm: 'h-10', // 40px
      md: 'h-14', // 56px
      lg: 'h-16', // 64px
    }

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center p-0 bg-transparent border-none outline-none cursor-pointer',
          'transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        style={{ color: textColor, ...style }}
        {...props}
      >
        <img
          src={src}
          alt=""
          className={cn('block w-auto object-contain', heights[size])}
          style={{ filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.18))' }}
          draggable={false}
        />
        <span className="absolute inset-0 flex items-center justify-center font-display text-[1.1rem] drop-shadow-md whitespace-nowrap px-4 pointer-events-none">
          {children}
        </span>
      </button>
    )
  }
)
CartoonButton.displayName = 'CartoonButton'

// ─── Circle / Square button ───────────────────────────────────────────────────
// Source PSD: cartoon-gui-pack-v2.0.4/all_files/<Color>.psd  (e.g. Blue.psd)
// Export size: 256×256 px, PNG-24
// Output path: /cartoon/buttons/circle/<Color>.png
//
// All colors already exported (256×256):
//   ✅ Blue  ✅ Blue-Teal  ✅ Red      ✅ Yellow  ✅ Violet
//   ✅ Gray  ✅ Dark       ✅ Brown    ✅ Bordeaux ✅ Light
//   ✅ Neutral ✅ White    ✅ Transparent

const CIRCLE_SRCS: Record<string, string> = {
  blue:        '/cartoon/buttons/circle/Blue.png',
  'blue-teal': '/cartoon/buttons/circle/Blue-Teal.png',
  red:         '/cartoon/buttons/circle/Red.png',
  yellow:      '/cartoon/buttons/circle/Yellow.png',
  violet:      '/cartoon/buttons/circle/Violet.png',
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
type CircleSize  = 'sm' | 'md' | 'lg'

interface CartoonCircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?:   CircleColor
  size?:    CircleSize
  iconSrc?: string
  iconAlt?: string
  badge?:   number | string
}

export const CartoonCircleButton = forwardRef<HTMLButtonElement, CartoonCircleButtonProps>(
  ({ color = 'blue', size = 'md', iconSrc, iconAlt = '', badge, className, children, ...props }, ref) => {
    const src = CIRCLE_SRCS[color] ?? CIRCLE_SRCS.blue

    const sizes: Record<CircleSize, string> = {
      sm: 'h-10', // 40px
      md: 'h-14', // 56px
      lg: 'h-16', // 64px
    }

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center p-0 bg-transparent border-none outline-none cursor-pointer',
          'transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        <img
          src={src}
          alt=""
          className={cn('block w-auto object-contain', sizes[size])}
          style={{ filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.18))' }}
          draggable={false}
        />
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {iconSrc ? (
            <img src={iconSrc} alt={iconAlt} className="w-[55%] h-[55%] object-contain" draggable={false} />
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
      </button>
    )
  }
)
CartoonCircleButton.displayName = 'CartoonCircleButton'
