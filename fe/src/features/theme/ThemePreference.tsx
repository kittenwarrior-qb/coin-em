import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import type { ControlThemeId } from '@/components/cartoon/controlThemes'
import { ThemePreferenceContext, THEME_STORAGE_KEY, initialTheme, isPublishedTheme, type PublishedTheme } from './preferenceModel'

function clearThemeOverride() {
  const url = new URL(window.location.href)
  if (url.searchParams.has('theme')) {
    url.searchParams.delete('theme')
    window.history.replaceState(window.history.state, '', url)
  }
}

/** Only UI preferences; no sessions, credentials, identities or room data. */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const manuallyChosen = useRef(false)
  const [theme, setTheme] = useState<ControlThemeId>(() => {
    // Accessing localStorage itself can throw, before getItem is called.
    try { return initialTheme(window.location.search, import.meta.env.DEV, window.localStorage) }
    catch { return initialTheme(window.location.search, import.meta.env.DEV, { getItem: () => null }) }
  })
  const [saved, setSaved] = useState(true)
  useEffect(() => {
    // Popup Back can restore an older entry containing the initial preview ID.
    // An explicit UI choice wins for this mount; retain router/popup state intact.
    const restore = () => { if (manuallyChosen.current) clearThemeOverride() }
    window.addEventListener('popstate', restore, true)
    return () => window.removeEventListener('popstate', restore, true)
  }, [])
  const choose = useCallback((next: PublishedTheme) => {
    if (!isPublishedTheme(next)) return
    manuallyChosen.current = true
    setTheme(next)
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); setSaved(true) }
    catch { setSaved(false) }
    // Drop an explicit preview override without changing router/popup history state.
    clearThemeOverride()
  }, [])
  return <ThemePreferenceContext.Provider value={{ choose, saved }}><ControlThemeProvider root theme={theme}>{children}</ControlThemeProvider></ThemePreferenceContext.Provider>
}
