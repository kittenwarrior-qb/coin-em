export interface ImagePreloadItem { url: string; tag: string }

/** Bounded, cancellable loading. An unavailable image must never trap the splash screen. */
export function preloadImages(
  items: ImagePreloadItem[],
  onEach: (item: ImagePreloadItem, success: boolean) => void,
  onDone: () => void,
  options: { concurrency?: number; timeoutMs?: number; retries?: number } = {},
): () => void {
  const groups = new Map<string, ImagePreloadItem[]>()
  for (const item of items) groups.set(item.url, [...(groups.get(item.url) ?? []), item])
  const jobs = [...groups.entries()]
  const limit = Math.max(1, options.concurrency ?? 4)
  const timeoutMs = Math.max(1, options.timeoutMs ?? 5000)
  const retries = Math.max(0, options.retries ?? 1)
  const active = new Set<() => void>()
  let next = 0
  let complete = 0
  let cancelled = false

  function pump() {
    if (cancelled) return
    if (complete === jobs.length) { onDone(); return }
    while (active.size < limit && next < jobs.length) {
      const [url, group] = jobs[next++]
      let image: HTMLImageElement
      let timer: ReturnType<typeof setTimeout>
      let attempt = 0
      let settled = false
      const cleanup = () => {
        clearTimeout(timer)
        if (image) { image.onload = null; image.onerror = null }
      }
      const cancel = () => { settled = true; cleanup() }
      active.add(cancel)
      function finish(success: boolean) {
        if (settled || cancelled) return
        cleanup()
        if (!success && attempt++ < retries) { start(); return }
        settled = true
        active.delete(cancel)
        complete++
        group.forEach(item => onEach(item, success))
        pump()
      }
      function start() {
        image = new Image()
        image.onload = () => finish(true)
        image.onerror = () => finish(false)
        timer = setTimeout(() => finish(false), timeoutMs)
        image.src = url
      }
      start()
    }
  }
  pump()
  return () => {
    cancelled = true
    active.forEach(cancel => cancel())
    active.clear()
  }
}
