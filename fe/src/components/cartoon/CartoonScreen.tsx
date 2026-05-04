import { cn } from '@/lib/utils'

interface CartoonScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render the inner white panel (mobile-style) */
  panel?: boolean
}

export function CartoonScreen({ panel = true, className, children, ...props }: CartoonScreenProps) {
  return (
    <div className={cn('screen-cartoon', className)} {...props}>
      {panel ? (
        <div className="screen-panel scroll-cartoon overflow-y-auto">
          {children}
        </div>
      ) : children}
    </div>
  )
}
