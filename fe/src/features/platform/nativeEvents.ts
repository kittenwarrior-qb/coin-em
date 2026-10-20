const foreground = new Set<() => void>()
const background = new Set<() => void>()

/** Signals only: no room/session/role/media data crosses this platform boundary. */
export function subscribeNativeForeground(listener: () => void) {
  foreground.add(listener)
  return () => { foreground.delete(listener) }
}
export function subscribeNativeBackground(listener: () => void) {
  background.add(listener)
  return () => { background.delete(listener) }
}
export function notifyNativeForeground() { for (const listener of foreground) listener() }
export function notifyNativeBackground() { for (const listener of background) listener() }
