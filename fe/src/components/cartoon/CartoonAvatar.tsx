import { cn } from '@/lib/utils'
import { AVATAR_ICONS, AVATAR_BG_COLORS } from './avatarConfig'

const MASK = 'url(/cartoon/ui/Circle-Cartoon.png)'
const MASK_SIZE = '100% 100%'

interface CartoonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  size?: 'sm' | 'md' | 'lg'
  avatarIndex?: number
  bgIndex?: number
  /** Legacy: single index for both */
  colorIndex?: number
}

export function CartoonAvatar({
  name, size = 'md',
  avatarIndex, bgIndex, colorIndex = 0,
  className, style, ...props
}: CartoonAvatarProps) {
  const aIdx = (avatarIndex ?? colorIndex) % AVATAR_ICONS.length
  const bIdx = (bgIndex ?? colorIndex) % AVATAR_BG_COLORS.length

  const icon = AVATAR_ICONS[aIdx]
  const bg   = AVATAR_BG_COLORS[bIdx]

  const sizes = {
    sm: { wrapper: 'w-9 h-9',   img: 'w-6 h-6',   inset: -3 },
    md: { wrapper: 'w-12 h-12', img: 'w-8 h-8',   inset: -4 },
    lg: { wrapper: 'w-16 h-16', img: 'w-11 h-11', inset: -5 },
  }
  const s = sizes[size]

  return (
    <div
      className={cn('relative flex items-center justify-center flex-shrink-0', s.wrapper, className)}
      style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.12))', ...style }}
      aria-label={name}
      {...props}
    >
      {/* White border layer */}
      <div
        className="absolute"
        style={{
          inset: s.inset,
          background: 'white',
          maskImage: MASK, maskSize: MASK_SIZE,
          WebkitMaskImage: MASK, WebkitMaskSize: MASK_SIZE,
        }}
      />
      {/* Color fill */}
      <div
        className="absolute inset-0"
        style={{
          background: bg,
          maskImage: MASK, maskSize: MASK_SIZE,
          WebkitMaskImage: MASK, WebkitMaskSize: MASK_SIZE,
        }}
      />
      <img src={icon} alt="" className={cn('relative z-10 object-contain', s.img)} draggable={false} />
    </div>
  )
}
