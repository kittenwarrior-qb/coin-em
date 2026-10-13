import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Mirrors the server allowlist (be/src/analytics/trafficRules.ts): public pages only, never /admin. */
const PAGES = ['/', '/game', '/about', '/about/cards', '/about/story', '/cards']
let first = true

/**
 * Anonymous page-view count: path and referrer only, no cookie, storage or identifier.
 * Best-effort; a failed or blocked request is ignored and never affects the page.
 */
export function trackPageView(pathname: string): void {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (import.meta.env.MODE === 'test' || !PAGES.includes(path)) return
  const body = JSON.stringify({ p: path, ...(first ? { r: document.referrer, first: true } : {}) })
  first = false
  try {
    const origin = (import.meta.env.VITE_API_URL ?? window.location.origin).replace(/\/$/, '')
    void fetch(`${origin}/api/track`, { method: 'POST', body, keepalive: true, credentials: 'omit', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' } }).catch(() => {})
  } catch { /* statistics are optional */ }
}

export function usePageViewTracking(): void {
  const { pathname } = useLocation()
  useEffect(() => { trackPageView(pathname) }, [pathname])
}
