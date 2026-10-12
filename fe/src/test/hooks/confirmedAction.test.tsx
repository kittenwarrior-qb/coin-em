import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useConfirmedAction } from '@/features/game/controllers/useConfirmedAction'

afterEach(cleanup)
const deferred = () => {
  let resolve!: (value: boolean) => void
  let reject!: (error: Error) => void
  const promise = new Promise<boolean>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('scoped local confirmation controller', () => {
  it('invalidates the in-flight continuation guard even after offline then reconnect in the same scope', async () => {
    const { result, rerender } = renderHook(({ enabled }) => useConfirmedAction('same', enabled), { initialProps: { enabled: true } })
    const first = deferred(), next = vi.fn()
    let request!: Promise<boolean>
    act(() => { request = result.current.run(async isCurrent => {
      await first.promise
      if (!isCurrent()) return false
      next()
      return true
    }) })
    rerender({ enabled: false })
    rerender({ enabled: true })
    await act(async () => { first.resolve(true); expect(await request).toBe(false) })
    expect(next).not.toHaveBeenCalled()
  })
  it('invalidates a captured continuation guard on scope change, offline and unmount', () => {
    const { result, rerender, unmount } = renderHook(({ scope, enabled }) => useConfirmedAction(scope, enabled), { initialProps: { scope: 'old', enabled: true } })
    const oldGuard = result.current.isCurrent
    expect(oldGuard()).toBe(true)
    rerender({ scope: 'new', enabled: true })
    expect(oldGuard()).toBe(false)
    expect(result.current.isCurrent()).toBe(true)
    rerender({ scope: 'new', enabled: false })
    expect(result.current.isCurrent()).toBe(false)
    rerender({ scope: 'new', enabled: true })
    const currentGuard = result.current.isCurrent
    unmount()
    expect(currentGuard()).toBe(false)
  })
  it('blocks same-tick duplicates until the owner confirms', async () => {
    const { result } = renderHook(() => useConfirmedAction('room/viewer/socket/round/phase', true))
    const ack = deferred(), send = vi.fn(() => ack.promise)
    let request!: Promise<boolean>
    act(() => { request = result.current.run(send) })
    expect(result.current.pending).toBe(true)
    await act(async () => { expect(await result.current.run(send)).toBe(false) })
    expect(send).toHaveBeenCalledOnce()
    await act(async () => { ack.resolve(true); expect(await request).toBe(true) })
    expect(result.current.pending).toBe(false)
  })

  it.each(['room', 'viewer', 'socket', 'round', 'phase-instance'])('does not let old %s completion release or finish a new intent', async scope => {
    const { result, rerender } = renderHook(({ context }) => useConfirmedAction(context, true), { initialProps: { context: 'old' } })
    const old = deferred(), fresh = deferred()
    let first!: Promise<boolean>, second!: Promise<boolean>
    act(() => { first = result.current.run(() => old.promise) })
    rerender({ context: scope })
    expect(result.current.pending).toBe(false)
    act(() => { second = result.current.run(() => fresh.promise) })
    await act(async () => { old.resolve(true); expect(await first).toBe(false) })
    expect(result.current.pending).toBe(true)
    await act(async () => { expect(await result.current.run(vi.fn())).toBe(false) })
    await act(async () => { fresh.resolve(true); expect(await second).toBe(true) })
    expect(result.current.pending).toBe(false)
  })

  it('preserves pending across rerenders with the same phase scope', async () => {
    const { result, rerender } = renderHook(() => useConfirmedAction('unchanged', true))
    const ack = deferred()
    let request!: Promise<boolean>
    act(() => { request = result.current.run(() => ack.promise) })
    rerender()
    expect(result.current.pending).toBe(true)
    await act(async () => { ack.resolve(true); expect(await request).toBe(true) })
  })

  it('sends nothing when disabled and invalidates an old completion across offline/reconnect', async () => {
    const { result, rerender } = renderHook(({ enabled }) => useConfirmedAction('same', enabled), { initialProps: { enabled: false } })
    const send = vi.fn(), ack = deferred()
    await act(async () => { expect(await result.current.run(send)).toBe(false) })
    expect(send).not.toHaveBeenCalled()
    rerender({ enabled: true })
    let request!: Promise<boolean>
    act(() => { request = result.current.run(() => ack.promise) })
    rerender({ enabled: false })
    rerender({ enabled: true })
    await act(async () => { ack.resolve(true); expect(await request).toBe(false) })
    expect(result.current.pending).toBe(false)
  })

  it.each([false, undefined])('does not invent confirmation for result %s', async answer => {
    const { result } = renderHook(() => useConfirmedAction('scope', true))
    await act(async () => { expect(await result.current.run(() => answer === undefined ? undefined : Promise.resolve(answer))).toBe(false) })
    expect(result.current.pending).toBe(false)
  })

  it.each(['throw', 'reject'])('keeps the board safe and exposes uncertainty for %s without retry', async kind => {
    const { result } = renderHook(() => useConfirmedAction('scope', true))
    const send = vi.fn(() => { if (kind === 'throw') throw new Error('fixture'); return Promise.reject(new Error('fixture')) })
    await act(async () => { expect(await result.current.run(send)).toBe(false) })
    expect(result.current.error).toContain('Chưa xác nhận')
    expect(result.current.pending).toBe(false)
    expect(send).toHaveBeenCalledOnce()
    await act(async () => { expect(await result.current.run(() => Promise.resolve(true))).toBe(true) })
    expect(result.current.error).toBeNull()
  })

  it('ignores an old rejection without placing its error over the new phase', async () => {
    const { result, rerender } = renderHook(({ scope }) => useConfirmedAction(scope, true), { initialProps: { scope: 'old' } })
    const ack = deferred()
    let request!: Promise<boolean>
    act(() => { request = result.current.run(() => ack.promise) })
    rerender({ scope: 'new' })
    await act(async () => { ack.reject(new Error('late')); expect(await request).toBe(false) })
    expect(result.current.error).toBeNull()
  })

  it('cannot complete after unmount', async () => {
    const { result, unmount } = renderHook(() => useConfirmedAction('scope', true))
    const ack = deferred()
    let request!: Promise<boolean>
    act(() => { request = result.current.run(() => ack.promise) })
    unmount()
    await act(async () => { ack.resolve(true); expect(await request).toBe(false) })
  })
})
