import { Profiler } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { AnimatePresence } from 'framer-motion'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TurnCountdown } from '@/features/game/components/TurnCountdown'

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(100_000) })
afterEach(() => { cleanup(); vi.useRealTimers() })
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const seconds = () => screen.getByTestId('turn-countdown-popup').textContent

describe('isolated presentation countdown', () => {
  it.each([30, 60])('preserves %s-second wall-clock display and clamps at zero', duration => {
    render(<TurnCountdown duration={duration} />)
    expect(seconds()).toBe(String(duration))
    tick(999); expect(seconds()).toBe(String(duration))
    tick(1); expect(seconds()).toBe(String(duration - 1))
    tick(duration * 1000); expect(seconds()).toBe('0')
    tick(10_000); expect(seconds()).toBe('0')
  })
  it('uses elapsed wall clock rather than counting delayed interval invocations', () => {
    render(<TurnCountdown duration={30} />)
    act(() => vi.setSystemTime(110_000))
    tick(250)
    expect(seconds()).toBe('20')
  })
  it('keeps elapsed display across same-owner rerenders but resets on scope reentry', () => {
    const { rerender } = render(<TurnCountdown key="room/phase-1" duration={30} />)
    tick(5000); expect(seconds()).toBe('25')
    rerender(<TurnCountdown key="room/phase-1" duration={30} />)
    expect(seconds()).toBe('25')
    rerender(<TurnCountdown key="room/phase-2" duration={30} />)
    expect(seconds()).toBe('30')
    tick(1000); expect(seconds()).toBe('29')
  })
  it('clears its interval on unmount and starts no game commands', () => {
    const clear = vi.spyOn(window, 'clearInterval')
    const { unmount } = render(<TurnCountdown duration={30} />)
    unmount()
    expect(clear).toHaveBeenCalledTimes(1)
    tick(60_000)
    expect(screen.queryByTestId('turn-countdown-popup')).toBeNull()
    clear.mockRestore()
  })
  it('clears the timer as soon as its existing animation begins exiting', () => {
    const clear = vi.spyOn(window, 'clearInterval')
    const { rerender } = render(<AnimatePresence><TurnCountdown key="owner" duration={30} /></AnimatePresence>)
    rerender(<AnimatePresence>{null}</AnimatePresence>)
    expect(clear).toHaveBeenCalledTimes(1)
    clear.mockRestore()
  })
  it('updates the profiled child without rendering its parent or expensive sibling', () => {
    const parentRender = vi.fn(), siblingRender = vi.fn(), profile = vi.fn()
    function Sibling() { siblingRender(); return <div>Confirmed board fixture</div> }
    function Parent() { parentRender(); return <><Sibling /><Profiler id="local-countdown" onRender={profile}><TurnCountdown duration={30} /></Profiler></> }
    render(<Parent />)
    const mounts = profile.mock.calls.length
    for (let n = 0; n < 5; n++) tick(1000)
    expect(seconds()).toBe('25')
    expect(profile.mock.calls.length).toBeGreaterThan(mounts)
    expect(parentRender).toHaveBeenCalledTimes(1)
    expect(siblingRender).toHaveBeenCalledTimes(1)
    expect(profile.mock.calls.every(call => Number.isFinite(call[2]))).toBe(true)
  })
})
