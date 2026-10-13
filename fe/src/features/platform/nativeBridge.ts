type Handle = { remove: () => Promise<void> }
export interface NativePorts {
  appState: (listener: (active: boolean) => void) => Promise<Handle>
  network: (listener: (connected: boolean) => void) => Promise<Handle>
  back: (listener: (canGoBack: boolean) => void) => Promise<Handle>
}
export interface NativeContext {
  foreground: () => void
  background: () => void
  back: (canGoBack: boolean) => void
  unavailable: () => void
}

/** Owns asynchronous listener handles even if StrictMode/unmount wins the race. */
export function mountNativeBridge(ports: NativePorts, context: NativeContext) {
  let disposed = false
  let active: boolean | undefined, connected: boolean | undefined
  const handles = new Set<Handle>()
  const remove = (handle: Handle) => { void handle.remove().catch(() => { /* no raw platform logs */ }) }
  const own = (registration: () => Promise<Handle>) => {
    try {
      void registration().then(handle => {
        if (disposed) remove(handle)
        else handles.add(handle)
      }).catch(() => { if (!disposed) context.unavailable() })
    } catch { if (!disposed) context.unavailable() }
  }
  own(() => ports.appState(next => {
    if (disposed || next === active) return
    const previous = active; active = next
    if (!next) context.background()
    else if (previous === false) context.foreground()
  }))
  own(() => ports.network(next => {
    if (disposed || next === connected) return
    const previous = connected; connected = next
    if (next && previous === false && active !== false) context.foreground()
  }))
  own(() => ports.back(canGoBack => { if (!disposed) context.back(canGoBack) }))
  return () => {
    if (disposed) return
    disposed = true
    for (const handle of handles) remove(handle)
    handles.clear()
  }
}
