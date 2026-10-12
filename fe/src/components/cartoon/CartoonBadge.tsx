import { cn } from '@/lib/utils'
import { useControlTheme } from './controlThemeContext'

type BadgeColor = 'yellow' | 'blue' | 'green' | 'red' | 'pink' | 'purple' | 'teal' | 'white' | 'black'

interface CartoonBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor
}

export function CartoonBadge({ color = 'yellow', className, children, ...props }: CartoonBadgeProps) {
  const theme = useControlTheme()
  return (
    <span
      className={cn('badge-cartoon', `badge-${color}`, className)}
      {...props}
      data-ui-badge={theme !== 'legacy' ? (['pink', 'purple', 'red'].includes(color) ? 'blush' : color === 'yellow' || color === 'white' ? 'cream' : 'mint') : undefined}
    >
      {children}
    </span>
  )
}
