import { cn } from '@/lib/utils'

// Avatar icons from cartoon assets — character-like SVGs
const AVATAR_ICONS = [
  '/cartoon/icons/Boy-1.svg',
  '/cartoon/icons/Girl-1.svg',
  '/cartoon/icons/Boy-2.svg',
  '/cartoon/icons/Girl-2.svg',
  '/cartoon/icons/Boy-3.svg',
  '/cartoon/icons/Girl-3.svg',
  '/cartoon/icons/Boy-4.svg',
  '/cartoon/icons/Girl-4.svg',
  '/cartoon/icons/Boy-2-Dark-Hair.svg',
  '/cartoon/icons/Girl-4.svg',
  '/cartoon/icons/Cat.svg',
  '/cartoon/icons/Bunny.svg',
]

const AVATAR_BG_COLORS = [
  '#FFD6E0', // pink
  '#D6EAFF', // blue
  '#D6FFE4', // green
  '#FFF3D6', // yellow
  '#E8D6FF', // purple
  '#D6FFFA', // teal
  '#FFE8D6', // orange
  '#F0D6FF', // lavender
  '#D6F5FF', // sky
  '#FFD6D6', // red-light
  '#D6FFD6', // mint
  '#FFECD6', // peach
]

const AVATAR_BORDER_COLORS = [
  '#FF8FAB',
  '#6AABFF',
  '#4DD97A',
  '#FFB830',
  '#A06AFF',
  '#2DD4BF',
  '#FF8C42',
  '#C084FC',
  '#38BDF8',
  '#F87171',
  '#4ADE80',
  '#FB923C',
]

interface CartoonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  size?: 'sm' | 'md' | 'lg'
  /** Index used to pick icon, bg, border — 0-based */
  colorIndex?: number
}

export function CartoonAvatar({ name, size = 'md', colorIndex = 0, className, style, ...props }: CartoonAvatarProps) {
  const idx = colorIndex % AVATAR_ICONS.length
  const icon = AVATAR_ICONS[idx]
  const bg = AVATAR_BG_COLORS[idx % AVATAR_BG_COLORS.length]
  const border = AVATAR_BORDER_COLORS[idx % AVATAR_BORDER_COLORS.length]

  const sizeClass = size === 'sm'
    ? 'w-9 h-9'
    : size === 'lg'
      ? 'w-16 h-16'
      : 'w-12 h-12'

  const imgSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-11 h-11' : 'w-8 h-8'

  return (
    <div
      className={cn('rounded-full flex items-center justify-center flex-shrink-0', sizeClass, className)}
      style={{
        background: bg,
        border: `2.5px solid ${border}`,
        boxShadow: `0 2px 0 ${border}`,
        ...style,
      }}
      aria-label={name}
      {...props}
    >
      <img src={icon} alt="" className={cn(imgSize, 'object-contain')} draggable={false} />
    </div>
  )
}
