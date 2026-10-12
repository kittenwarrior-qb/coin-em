let roomIdle = false
const listeners = new Set<() => void>()

/** Unknown/offline/admitting room state is busy; this gate never contains room data. */
export function setPwaRoomIdle(idle: boolean) {
  if (idle === roomIdle) return
  roomIdle = idle
  for (const listener of listeners) listener()
}
export function subscribePwaGate(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export function canUpdatePwa(pathname: string): boolean {
  if (['/about', '/about/cards', '/about/story', '/cards'].includes(pathname.replace(/\/$/, ''))) return true
  if (pathname !== '/' && pathname !== '/game' && pathname !== '/game/') return false
  try {
    // Fail closed through the admission-ACK/room-snapshot gap and retained resume secrets.
    return roomIdle && localStorage.getItem('emcoin_session') === null
  } catch { return false }
}
