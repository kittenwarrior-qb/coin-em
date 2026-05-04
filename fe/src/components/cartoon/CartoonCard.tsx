import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'sm' | 'lg'
type CardPastel  = 'blue' | 'pink' | 'green' | 'yellow' | 'purple' | 'teal' | 'none'

interface CartoonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  pastel?: CardPastel
}

export function CartoonCard({ variant = 'default', pastel = 'none', className, children, ...props }: CartoonCardProps) {
  return (
    <div
      className={cn(
        'card-cartoon',
        variant === 'sm' && 'card-cartoon-sm',
        variant === 'lg' && 'card-cartoon-lg',
        pastel !== 'none' && `card-pastel-${pastel}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
