import { cn } from '@/lib/utils'
import { useControlTheme } from './controlThemeContext'
import { themeBackdrop } from './controlThemes'

const HOME_BG: React.CSSProperties = {
  backgroundImage: 'url(/cartoon/ui/home-bg.webp)',
  backgroundSize: 'cover',
  backgroundPosition: 'center top',
  backgroundRepeat: 'no-repeat',
}

interface CartoonScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render the inner white panel (mobile-style) */
  panel?: boolean
  /** Extra style applied to the inner panel div */
  panelStyle?: React.CSSProperties
  /** Use the home scene background on the panel */
  purpleBg?: boolean
}

export function CartoonScreen({ panel = true, panelStyle, purpleBg, className, children, ...props }: CartoonScreenProps) {
  const theme = useControlTheme()
  return (
    <div className={cn('screen-cartoon', className)} {...props}>
      {panel ? (
        <div
          className="screen-panel scroll-cartoon overflow-y-auto"
          style={purpleBg ? { ...HOME_BG, backgroundImage: themeBackdrop(theme, HOME_BG.backgroundImage!), ...panelStyle } : panelStyle}
        >
          {children}
        </div>
      ) : children}
    </div>
  )
}
