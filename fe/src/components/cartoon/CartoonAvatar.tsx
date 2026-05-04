import { cn } from '@/lib/utils'

interface CartoonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  size?: 'sm' | 'md' | 'lg'
  /** Pastel background index 0-8 */
  colorIndex?: number
}

const PASTEL_COLORS = [
  '#FFF0F5', '#F0F5FF', '#F0FFF4', '#FFFBF0',
  '#F5F0FF', '#F0FFFF', '#FFF5F0', '#F0FFF8', '#FAFFF0',
]

export function CartoonAvatar({ name, size = 'md', colorIndex = 0, className, style, ...props }: CartoonAvatarProps) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-base'
  const bg = PASTEL_COLORS[colorIndex % PASTEL_COLORS.length]

  return (
    <div
      className={cn('avatar-cartoon font-display', sizeClass, className)}
      style={{ background: bg, ...style }}
      aria-label={name}
      {...props}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
