import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PhaseCelebration } from '@/components/game/PhaseCelebration'
import { StrictMode } from 'react'

const observed = vi.hoisted(() => ({ reduced: false, mounts: 0 }))
vi.mock('framer-motion', () => ({ useReducedMotion: () => observed.reduced }))
vi.mock('@rive-app/react-canvas', () => ({
  useRive: () => ({ RiveComponent: () => { observed.mounts++; return <canvas data-testid="existing-celebration" /> } }),
  Layout: class {}, Fit: { Contain: 'contain' }, Alignment: { Center: 'center' },
}))
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] }); observed.reduced = false; observed.mounts = 0
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })
describe('non-authoritative celebration lifecycle', () => {
  it('does not restart the same burst deadline when duration configuration changes', () => {
    const { container, rerender } = render(<PhaseCelebration runId={1} durationMs={2800} />)
    act(() => vi.advanceTimersByTime(2000))
    rerender(<PhaseCelebration runId={1} durationMs={5000} />)
    act(() => vi.advanceTimersByTime(800))
    expect(container.querySelector('canvas')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('does not replay an expired run after changing duration, but permits a new run', () => {
    const { container, rerender } = render(<PhaseCelebration runId={1} durationMs={100} />)
    act(() => vi.advanceTimersByTime(100))
    rerender(<PhaseCelebration runId={1} durationMs={5000} />)
    expect(container.querySelector('canvas')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    rerender(<PhaseCelebration runId={2} durationMs={200} />)
    expect(container.querySelector('canvas')).not.toBeNull()
    act(() => vi.advanceTimersByTime(200))
    expect(container.querySelector('canvas')).toBeNull()
  })
  it('rearms exactly one remaining deadline after StrictMode cleanup/setup', () => {
    const { container, unmount } = render(<StrictMode><PhaseCelebration runId={1} durationMs={100} /></StrictMode>)
    expect(container.querySelector('canvas')).not.toBeNull()
    expect(vi.getTimerCount()).toBe(1)
    act(() => vi.advanceTimersByTime(100))
    expect(container.querySelector('canvas')).toBeNull()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('stays idle for zero and hides at its bounded deadline', () => {
    const { container, rerender } = render(<PhaseCelebration runId={0} />)
    expect(container.querySelector('canvas')).toBeNull()
    rerender(<PhaseCelebration runId={1} />)
    expect(container.querySelector('canvas')).not.toBeNull()
    act(() => vi.advanceTimersByTime(2800))
    expect(container.querySelector('canvas')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('reactively stops an active burst for reduced motion and cancels its timer', () => {
    const { container, rerender } = render(<PhaseCelebration runId={1} />)
    observed.reduced = true
    rerender(<PhaseCelebration runId={1} />)
    expect(container.querySelector('canvas')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    observed.reduced = false
    rerender(<PhaseCelebration runId={1} />)
    expect(container.querySelector('canvas')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('clears a burst when reset to idle and on unmount', () => {
    const { container, rerender, unmount } = render(<PhaseCelebration runId={1} />)
    rerender(<PhaseCelebration runId={0} />)
    expect(container.querySelector('canvas')).toBeNull()
    rerender(<PhaseCelebration runId={2} />)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('stops hidden-tab motion without replay on return', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get')
    const { container } = render(<PhaseCelebration runId={1} />)
    hidden.mockReturnValue(true)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(container.querySelector('canvas')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    hidden.mockReturnValue(false)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(container.querySelector('canvas')).toBeNull()
  })
})
