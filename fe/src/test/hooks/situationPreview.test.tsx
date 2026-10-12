import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSituationPreview } from '@/features/game/controllers/useSituationPreview'
import { CARD_DATA } from '@/constants/cardCatalog'

const first = CARD_DATA.situation[0], second = CARD_DATA.situation[1]
beforeEach(() => vi.useFakeTimers())
afterEach(() => { cleanup(); vi.useRealTimers() })
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

describe('scoped situation preview debounce', () => {
  it('sends the exact original card once after 250ms, not a selection', () => {
    const emit = vi.fn()
    const { result } = renderHook(() => useSituationPreview('scope', true, emit))
    act(() => result.current(first))
    tick(249)
    expect(emit).not.toHaveBeenCalled()
    tick(1)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith(first)
    expect(emit.mock.calls[0][0]).toBe(first)
    tick(1000)
    expect(emit).toHaveBeenCalledTimes(1)
  })
  it('replaces the queued card and restarts the original delay', () => {
    const emit = vi.fn()
    const { result } = renderHook(() => useSituationPreview('scope', true, emit))
    act(() => result.current(first)); tick(200)
    act(() => result.current(second)); tick(249)
    expect(emit).not.toHaveBeenCalled()
    tick(1)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith(second)
  })
  it.each(['room', 'viewer', 'socket', 'round', 'phase-instance'])('cancels old %s work and captured callbacks', scope => {
    const emit = vi.fn()
    const { result, rerender } = renderHook(({ scope }) => useSituationPreview(scope, true, emit), { initialProps: { scope: 'old' } })
    const old = result.current
    act(() => old(first))
    rerender({ scope })
    act(() => { old(first); result.current(second) })
    tick(250)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith(second)
  })
  it('cancels on disabled admission and does not replay on re-enable', () => {
    const emit = vi.fn()
    const { result, rerender } = renderHook(({ enabled }) => useSituationPreview('same', enabled, emit), { initialProps: { enabled: true } })
    const old = result.current
    act(() => old(first))
    rerender({ enabled: false })
    act(() => result.current(first))
    rerender({ enabled: true })
    act(() => old(first))
    tick(1000)
    expect(emit).not.toHaveBeenCalled()
    act(() => result.current(second)); tick(250)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith(second)
  })
  it('retains same-scope work across rerenders using the current callback', () => {
    const old = vi.fn(), next = vi.fn()
    const { result, rerender } = renderHook(({ emit }) => useSituationPreview('same', true, emit), { initialProps: { emit: old } })
    act(() => result.current(first)); tick(100)
    rerender({ emit: next }); tick(150)
    expect(old).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(first)
  })
  it('clears its timer and makes captured callbacks inert on unmount', () => {
    const emit = vi.fn()
    const { result, unmount } = renderHook(() => useSituationPreview('same', true, emit))
    const old = result.current
    act(() => old(first))
    unmount()
    act(() => old(second)); tick(1000)
    expect(emit).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
