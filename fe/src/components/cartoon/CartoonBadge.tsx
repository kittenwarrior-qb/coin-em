import { cn } from '@/lib/utils'

type BadgeColor = 'yellow' | 'blue' | 'green' | 'red' | 'pink' | 'purple' | 'teal' | 'white' | 'black'

interface CartoonBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor
}

export function CartoonBadge({ color = 'yellow', className, children, ...props }: CartoonBadgeProps) {
  return (
    <span
      className={cn('badge-cartoon', `badge-${color}`, className)}
      {...props}
    >
      {children}
    </span>
  )
}
