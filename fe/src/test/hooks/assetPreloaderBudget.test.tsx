import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAssetPreloader } from '@/hooks/useAssetPreloader'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { startupAssets } from '@/utils/startupAssets'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({ preload: vi.fn() }))
vi.mock('@/utils/imagePreload', () => ({ preloadImages: mocks.preload }))

describe('selected theme startup only', () => {
  it.each(['emotion-orbit', 'kindness-workshop'] as const)('loads four %s WebP images, not unused avatar/icon families', theme => {
    const assets = startupAssets(theme)
    expect(assets).toHaveLength(4)
    expect(assets.every(item => item.url.startsWith(`/cartoon/ui/themes/${theme}/`) && item.url.endsWith('.webp'))).toBe(true)
    expect(JSON.stringify(assets)).not.toContain('/emcoin/')
  })
  it('cancels on unmount, treats failures as settled, and does not schedule the 106 inventory assets', () => {
    mocks.preload.mockClear()
    const cancel = vi.fn()
    mocks.preload.mockReturnValue(cancel)
    const wrapper = ({ children }: { children: ReactNode }) => <ControlThemeProvider theme="kindness-workshop">{children}</ControlThemeProvider>
    const hook = renderHook(() => useAssetPreloader(), { wrapper })
    const [items, onEach, onDone] = mocks.preload.mock.calls[0]
    act(() => { for (const item of items) onEach(item, false); onDone() })
    expect(hook.result.current).toMatchObject({ total: 4, loaded: 4, done: true, bgTotal: 0, bgDone: true })
    expect(mocks.preload).toHaveBeenCalledTimes(1)
    hook.unmount()
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})
