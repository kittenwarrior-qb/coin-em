import { createContext, useContext } from 'react'
import { DEFAULT_CONTROL_THEME, previewControlTheme, type ControlThemeId } from '@/components/cartoon/controlThemes'

export const THEME_STORAGE_KEY = 'emcoin.ui-theme.v1'
export type PublishedTheme = 'emotion-orbit' | 'kindness-workshop' | 'candy-clouds'
export function isPublishedTheme(value: unknown): value is PublishedTheme {
  return value === 'emotion-orbit' || value === 'kindness-workshop' || value === 'candy-clouds'
}
export function initialTheme(search: string, development: boolean, storage: Pick<Storage, 'getItem'>): ControlThemeId {
  let saved: PublishedTheme = DEFAULT_CONTROL_THEME as PublishedTheme
  try { const value = storage.getItem(THEME_STORAGE_KEY); if (isPublishedTheme(value)) saved = value } catch { /* storage can be disabled */ }
  if (development) return previewControlTheme(search, saved)
  const candidate = new URLSearchParams(search).get('theme')
  return isPublishedTheme(candidate) ? candidate : saved
}
export const ThemePreferenceContext = createContext<{ choose: (theme: PublishedTheme) => void; saved: boolean } | null>(null)
export const useThemePreference = () => useContext(ThemePreferenceContext)
