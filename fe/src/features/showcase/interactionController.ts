type Ref<T> = { current: T }
type Drag = { active: boolean; lastX: number; lastY: number }

/** Input ownership only: no renderer, catalog, network or gameplay authority. */
export function attachShowcaseInteraction(options: {
  canvas: HTMLCanvasElement
  target?: Window
  drag: Ref<Drag>
  yaw: Ref<number>
  pitch: Ref<number>
  zoom: Ref<number>
  flip: () => void
  now?: () => number
}) {
  const { canvas, drag, yaw, pitch, zoom, flip } = options
  const target = options.target ?? window
  const now = options.now ?? (() => performance.now())
  const pointers = new Map<number, { x: number; y: number }>()
  const clampZoom = (value: number) => Math.max(0.74, Math.min(1.45, value))
  let pinchStartDist = 0, pinchStartZoom = zoom.current
  let tap: { x: number; y: number; t: number } | null = null
  let disposed = false
  const down = (event: PointerEvent) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    canvas.setPointerCapture?.(event.pointerId)
    if (pointers.size === 1) {
      drag.current = { active: true, lastX: event.clientX, lastY: event.clientY }
      tap = { x: event.clientX, y: event.clientY, t: now() }
    } else if (pointers.size === 2) {
      drag.current.active = false; tap = null
      const [a, b] = Array.from(pointers.values())
      pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y)
      pinchStartZoom = zoom.current
    }
  }
  const move = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size >= 2) {
      const [a, b] = Array.from(pointers.values())
      if (pinchStartDist > 0) zoom.current = clampZoom(pinchStartZoom * Math.hypot(a.x - b.x, a.y - b.y) / pinchStartDist)
      return
    }
    if (!drag.current.active) return
    const deltaX = event.clientX - drag.current.lastX, deltaY = event.clientY - drag.current.lastY
    drag.current.lastX = event.clientX; drag.current.lastY = event.clientY
    yaw.current += deltaX * 0.012
    pitch.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current + deltaY * 0.012))
  }
  const finish = (event: PointerEvent, allowFlip: boolean) => {
    if (!pointers.has(event.pointerId)) return
    if (allowFlip && pointers.size === 1 && tap) {
      if (now() - tap.t < 320 && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 12) flip()
    }
    tap = null; pointers.delete(event.pointerId)
    if (pointers.size < 2) pinchStartDist = 0
    if (pointers.size === 0) drag.current.active = false
    else if (pointers.size === 1) {
      const [point] = Array.from(pointers.values())
      drag.current = { active: true, lastX: point.x, lastY: point.y }
    }
  }
  const up = (event: PointerEvent) => finish(event, true)
  const cancel = (event: PointerEvent) => finish(event, false)
  const wheel = (event: WheelEvent) => {
    event.preventDefault()
    zoom.current = clampZoom(zoom.current * (1 - event.deltaY * 0.001))
  }
  canvas.addEventListener('pointerdown', down)
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', up)
  target.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  canvas.addEventListener('wheel', wheel, { passive: false })
  return () => {
    if (disposed) return
    disposed = true
    canvas.removeEventListener('pointerdown', down)
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', up)
    target.removeEventListener('pointercancel', cancel)
    canvas.removeEventListener('lostpointercapture', cancel)
    canvas.removeEventListener('wheel', wheel)
    for (const id of pointers.keys()) {
      if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture?.(id)
    }
    pointers.clear(); tap = null; drag.current.active = false
  }
}
