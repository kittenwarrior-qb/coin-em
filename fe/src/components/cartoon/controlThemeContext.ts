import { createContext, useContext } from 'react'
import type { ControlThemeId } from './controlThemes'

export const ControlThemeContext = createContext<ControlThemeId>('legacy')
export function useControlTheme() {
  return useContext(ControlThemeContext)
}
