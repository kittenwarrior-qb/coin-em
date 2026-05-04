import { cn } from '@/lib/utils'

const PURPLE_GRADIENT = 'radial-gradient(circle at center, #4df0f7 0%, #3adbe7 33%, #25b0ca 66%, #2cb9db 100%)'

interface CartoonScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render the inner white panel (mobile-style) */
  panel?: boolean
  /** Extra style applied to the inner panel div */
  panelStyle?: React.CSSProperties
  /** Use the purple gradient background on the panel */
  purpleBg?: boolean
}

export function CartoonScreen({ panel = true, panelStyle, purpleBg, className, children, ...props }: CartoonScreenProps) {
  return (
    <div className={cn('screen-cartoon', className)} {...props}>
      {panel ? (
        <div
          className="screen-panel scroll-cartoon overflow-y-auto"
          style={purpleBg ? { background: PURPLE_GRADIENT, ...panelStyle } : panelStyle}
        >
          {children}
        </div>
      ) : children}
    </div>
  )
}
