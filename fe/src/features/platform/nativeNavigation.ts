/** Exit/navigation gate, not the stricter service-worker activation vote. */
export function canNavigateNativeBack(pathname: string, storedSession: string | null | undefined): boolean {
  if (storedSession === undefined) return false // Storage failure: unknown identity/state.
  if (['/about','/about/cards','/about/story','/cards'].includes(pathname.replace(/\/$/,''))) return true
  return ['/', '/game', '/game/'].includes(pathname) && storedSession === null
}
