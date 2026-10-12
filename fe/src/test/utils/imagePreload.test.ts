import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { preloadImages } from '../../utils/imagePreload'

describe('bounded image preloading', () => {
  const images: Array<{ onload: (() => void) | null; onerror: (() => void) | null; src: string }> = []
  beforeEach(() => {
    images.length = 0
    vi.useFakeTimers()
    vi.stubGlobal('Image', class {
      onload = null
      onerror = null
      src = ''
      constructor() { images.push(this) }
    })
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
  it('deduplicates URLs, caps concurrency and reports every requested item once', () => {
    const each = vi.fn(), done = vi.fn()
    preloadImages([{ url: '/a', tag: 'a' }, { url: '/a', tag: 'duplicate' }, { url: '/b', tag: 'b' }, { url: '/c', tag: 'c' }], each, done, { concurrency: 2 })
    expect(images).toHaveLength(2)
    images[0].onload!()
    expect(images).toHaveLength(3)
    images[1].onload!()
    images[2].onload!()
    expect(each).toHaveBeenCalledTimes(4)
    expect(done).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('retries once then settles an offline or hung image without blocking', () => {
    const each = vi.fn(), done = vi.fn()
    preloadImages([{ url: '/offline', tag: 'critical' }], each, done, { timeoutMs: 100, retries: 1 })
    vi.advanceTimersByTime(200)
    expect(images).toHaveLength(2)
    expect(each).toHaveBeenCalledWith({ url: '/offline', tag: 'critical' }, false)
    expect(done).toHaveBeenCalledTimes(1)
  })
  it('cancels on unmount without late state updates or remaining timers', () => {
    const each = vi.fn(), done = vi.fn()
    const cancel = preloadImages([{ url: '/slow', tag: 'critical' }], each, done)
    cancel()
    vi.runAllTimers()
    expect(images[0].onload).toBeNull()
    expect(each).not.toHaveBeenCalled()
    expect(done).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
