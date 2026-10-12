import { describe, expect, it, vi } from 'vitest'
import { attachShowcaseInteraction } from '../../features/showcase/interactionController'

function pointer(target: EventTarget, type: string, id: number, x = 0, y = 0) {
  const event = new Event(type)
  Object.assign(event, { pointerId: id, clientX: x, clientY: y })
  target.dispatchEvent(event)
}
function fixture() {
  const canvas = document.createElement('canvas')
  const drag = { current: { active: false, lastX: 0, lastY: 0 } }
  const yaw = { current: 0 }, pitch = { current: 0 }, zoom = { current: 0.92 }
  const flip = vi.fn(), capture = vi.fn()
  canvas.setPointerCapture = capture
  let clock = 0
  const dispose = attachShowcaseInteraction({ canvas, drag, yaw, pitch, zoom, flip, now: () => clock })
  return { canvas, drag, yaw, pitch, zoom, flip, capture, dispose, time: (value: number) => { clock = value } }
}
describe('showcase input ownership', () => {
  it('preserves tap thresholds and flips once only on the active pointer release', () => {
    const f = fixture()
    pointer(f.canvas, 'pointerdown', 1, 10, 20); f.time(319)
    pointer(window, 'pointerup', 1, 21, 20); pointer(window, 'pointerup', 1, 21, 20)
    expect(f.capture).toHaveBeenCalledWith(1); expect(f.flip).toHaveBeenCalledOnce()
    expect(f.drag.current.active).toBe(false); f.dispose()
  })
  it.each([[320, 0], [100, 12]])('does not flip at exact threshold time=%s movement=%s', (elapsed, movement) => {
    const f = fixture(); pointer(f.canvas, 'pointerdown', 1); f.time(elapsed)
    pointer(window, 'pointerup', 1, movement); expect(f.flip).not.toHaveBeenCalled(); f.dispose()
  })
  it('preserves drag gains/pitch bounds and ignores unrelated window move/up', () => {
    const f = fixture(); pointer(f.canvas, 'pointerdown', 1, 10, 20)
    pointer(window, 'pointermove', 9, 1000, 1000); pointer(window, 'pointerup', 9)
    expect(f.yaw.current).toBe(0); expect(f.pitch.current).toBe(0)
    expect(f.drag.current.active).toBe(true); expect(f.flip).not.toHaveBeenCalled()
    pointer(window, 'pointermove', 1, 30, 30)
    expect(f.yaw.current).toBeCloseTo(0.24); expect(f.pitch.current).toBeCloseTo(0.12)
    pointer(window, 'pointermove', 1, 30, 10000); expect(f.pitch.current).toBe(Math.PI / 2)
    pointer(window, 'pointermove', 1, 30, -10000); expect(f.pitch.current).toBe(-Math.PI / 2)
    pointer(window, 'pointerup', 1, 30, -10000); expect(f.flip).not.toHaveBeenCalled(); f.dispose()
  })
  it('pinches within original bounds and resumes remaining-finger drag without flipping', () => {
    const f = fixture()
    pointer(f.canvas, 'pointerdown', 1); pointer(f.canvas, 'pointerdown', 2, 100)
    pointer(window, 'pointermove', 2, 125); expect(f.zoom.current).toBeCloseTo(1.15)
    pointer(window, 'pointermove', 2, 1000); expect(f.zoom.current).toBe(1.45)
    pointer(window, 'pointermove', 2, 1); expect(f.zoom.current).toBe(0.74)
    pointer(window, 'pointerup', 2, 1)
    expect(f.drag.current).toEqual({ active: true, lastX: 0, lastY: 0 })
    pointer(window, 'pointermove', 1, 10); expect(f.yaw.current).toBeCloseTo(0.12)
    pointer(window, 'pointerup', 1, 10); expect(f.flip).not.toHaveBeenCalled(); f.dispose()
  })
  it('zero-distance pinch does not produce invalid zoom', () => {
    const f = fixture()
    pointer(f.canvas, 'pointerdown', 1); pointer(f.canvas, 'pointerdown', 2)
    pointer(window, 'pointermove', 2, 100)
    expect(f.zoom.current).toBe(0.92); f.dispose()
  })
  it.each(['pointercancel', 'lostpointercapture'])('ends %s without a tap and leaves a new gesture usable', type => {
    const f = fixture(); pointer(f.canvas, 'pointerdown', 1)
    pointer(type === 'pointercancel' ? window : f.canvas, type, 1)
    pointer(window, 'pointerup', 1); expect(f.flip).not.toHaveBeenCalled()
    expect(f.drag.current.active).toBe(false)
    pointer(f.canvas, 'pointerdown', 2); pointer(window, 'pointerup', 2)
    expect(f.flip).toHaveBeenCalledOnce(); f.dispose()
  })
  it('wheel remains nonpassive and clamps original zoom range', () => {
    const f = fixture()
    const event = new WheelEvent('wheel', { deltaY: -100, cancelable: true })
    f.canvas.dispatchEvent(event); expect(event.defaultPrevented).toBe(true)
    expect(f.zoom.current).toBeCloseTo(1.012)
    f.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -10000 })); expect(f.zoom.current).toBe(1.45)
    f.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 10000 })); expect(f.zoom.current).toBe(0.74)
    f.dispose()
  })
  it('idempotent disposal removes listeners/releases capture and prevents late mutations', () => {
    const f = fixture(), release = vi.fn()
    f.canvas.hasPointerCapture = vi.fn(() => true); f.canvas.releasePointerCapture = release
    pointer(f.canvas, 'pointerdown', 1); f.dispose(); f.dispose()
    expect(release).toHaveBeenCalledOnce(); expect(f.drag.current.active).toBe(false)
    pointer(f.canvas, 'pointerdown', 2); pointer(window, 'pointermove', 1, 100); pointer(window, 'pointerup', 1)
    f.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }))
    expect(f.yaw.current).toBe(0); expect(f.zoom.current).toBe(0.92); expect(f.flip).not.toHaveBeenCalled()
    expect(f.capture).toHaveBeenCalledOnce()
  })
})
