import { afterEach, describe, expect, it, vi } from 'vitest'
import { canUpdatePwa, setPwaRoomIdle, subscribePwaGate } from '../../features/pwa/updateGate'

afterEach(() => { setPwaRoomIdle(false); localStorage.clear(); vi.restoreAllMocks() })
describe('public-only PWA update gate', () => {
  it('defers unknown/active/admitting/offline game route state', () => {
    expect(canUpdatePwa('/')).toBe(false)
    expect(canUpdatePwa('/game')).toBe(false)
    expect(canUpdatePwa('/not-a-public-page')).toBe(false)
  })
  it('permits confirmed empty lobby but not the private admission/snapshot gap', () => {
    setPwaRoomIdle(true)
    expect(canUpdatePwa('/')).toBe(true)
    localStorage.setItem('emcoin_session', 'opaque secret or malformed storage')
    expect(canUpdatePwa('/')).toBe(false)
    expect(canUpdatePwa('/game')).toBe(false)
  })
  it('public pages can vote idle; each other tab must separately vote', () => {
    for (const route of ['/about', '/about/cards', '/about/story', '/cards/']) expect(canUpdatePwa(route)).toBe(true)
  })
  it('storage access failure is not permission to reload a game route', () => {
    setPwaRoomIdle(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    expect(canUpdatePwa('/')).toBe(false)
  })
  it('notifies presentation only when the gate changes and unsubscribes cleanly', () => {
    const changed = vi.fn(), unsubscribe = subscribePwaGate(changed)
    setPwaRoomIdle(true); setPwaRoomIdle(true)
    expect(changed).toHaveBeenCalledOnce()
    unsubscribe(); setPwaRoomIdle(false)
    expect(changed).toHaveBeenCalledOnce()
  })
})
