import { useLayoutEffect, type ReactNode } from 'react'
import type { ControlThemeId } from './controlThemes'
import { ControlThemeContext } from './controlThemeContext'

// Isolated consumers keep original controls; app entry explicitly selects its theme.

export function ControlThemeProvider({ theme, children, root = false }: { theme: ControlThemeId; children: ReactNode; root?: boolean }) {
  useLayoutEffect(() => {
    if (!root) return
    const previous = document.documentElement.dataset.uiTheme
    document.documentElement.dataset.uiTheme = theme
    return () => {
      if (previous === undefined) delete document.documentElement.dataset.uiTheme
      else document.documentElement.dataset.uiTheme = previous
    }
  }, [theme, root])
  return <ControlThemeContext.Provider value={theme}>{children}</ControlThemeContext.Provider>
}
