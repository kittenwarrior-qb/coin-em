import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { cn } from '@/lib/utils'
import { AVATAR_ICONS, AVATAR_BG_COLORS } from './avatarConfig'
import { useControlTheme } from './controlThemeContext'
import { isBrandTheme } from './controlThemes'
import { BrandAvatarFrame } from './BrandAvatarFrame'
import { CandyAvatarFrame } from './CandyAvatarFrame'

const MASK = 'url(/cartoon/ui/Circle-Cartoon.png)'
const MASK_SIZE = '100% 100%'

interface CartoonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  size?: 'sm' | 'md' | 'lg'
  avatarIndex?: number
  bgIndex?: number
  /** Override the white border color */
  borderColor?: string
  countdownColor?: string
  showCountdown?: boolean
  countdownKey?: string
  countdownDurationSec?: number
  /** Legacy: single index for both */
  colorIndex?: number
}

export function CartoonAvatar({
  name, size = 'md',
  avatarIndex, bgIndex, colorIndex = 0,
  borderColor = 'white',
  countdownColor,
  showCountdown,
  countdownKey,
  countdownDurationSec = 30,
  className, style, ...props
}: CartoonAvatarProps) {
  const theme = useControlTheme()
  const branded = isBrandTheme(theme)
  const workshop = theme === 'kindness-workshop'
  const candy = theme === 'candy-clouds'
  const roleTones: Record<string, string> = candy
    ? { '#FFB830': '#E6BD72', '#FF6B9D': '#DF99B6', '#29B6F6': '#85BBD5', '#62C76D': '#99B8A0', '#7D7F8C': '#9AAABE', '#3FA7F5': '#85BBD5', '#A66CFF': '#B0A4CA', '#F59E42': '#E6BD72' }
    : workshop
    ? { '#FFB830': '#e5b45d', '#FF6B9D': '#d97b6d', '#29B6F6': '#286081', '#62C76D': '#82a37b', '#7D7F8C': '#8997a4', '#3FA7F5': '#286081', '#A66CFF': '#8596a8', '#F59E42': '#e5b45d' }
    : { '#FFB830': '#9395cd', '#FF6B9D': '#d983a2', '#29B6F6': '#555fa4', '#62C76D': '#9795ca', '#7D7F8C': '#9297b3', '#3FA7F5': '#555fa4', '#A66CFF': '#9795ca', '#F59E42': '#d983a2' }
  const tone = roleTones[borderColor] ?? (candy ? ['#85BBD5', '#DF99B6', '#E6BD72'][Math.abs(avatarIndex ?? colorIndex) % 3] : workshop ? ['#d97b6d', '#e5b45d', '#286081', '#82a37b'][Math.abs(avatarIndex ?? colorIndex) % 4] : ['#555fa4', '#9395cd', '#d983a2'][Math.abs(avatarIndex ?? colorIndex) % 3])
  const mask = theme !== 'legacy' ? undefined : MASK
  const radius = theme !== 'legacy' ? '48% 52% 50% 46%' : undefined
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
      className={cn('relative flex items-center justify-center flex-shrink-0', s.wrapper, branded && 'brand-avatar', className)}
      style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.12))', ...style }}
      aria-label={name}
      {...props}
    >
      {/* White border layer */}
      <div
        data-ui-chrome="avatar-border"
        key={showCountdown ? countdownKey : 'static-border'}
        className={cn('absolute', showCountdown && 'avatar-countdown-border')}
        style={{
          inset: s.inset,
          background: showCountdown
            ? `conic-gradient(from 0deg, #e6f9ff 0deg var(--avatar-countdown-gap), ${countdownColor ?? borderColor} var(--avatar-countdown-gap) 360deg)`
            : branded ? 'transparent' : borderColor,
          '--avatar-countdown-duration': `${countdownDurationSec}s`,
          borderRadius: radius,
          maskImage: mask, maskSize: MASK_SIZE,
          WebkitMaskImage: mask, WebkitMaskSize: MASK_SIZE,
        } as React.CSSProperties}
      />
      {candy ? <CandyAvatarFrame tone={tone} /> : branded && <BrandAvatarFrame workshop={workshop} tone={tone} />}
      {/* Color fill */}
      <div
        className={cn('absolute inset-0', branded && 'brand-avatar-fill')}
        style={{
          background: bg,
          borderRadius: radius,
          boxShadow: theme !== 'legacy' ? 'inset 0 3px 0 #FFFFFF80, inset 0 -3px 0 #245F8F20' : undefined,
          maskImage: mask, maskSize: MASK_SIZE,
          WebkitMaskImage: mask, WebkitMaskSize: MASK_SIZE,
        }}
      />
      <EmcoinImage src={icon} alt="" className={cn('relative z-10 object-contain', s.img)} draggable={false} />
    </div>
  )
}
