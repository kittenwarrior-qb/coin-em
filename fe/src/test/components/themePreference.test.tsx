import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemePreferenceProvider } from '@/features/theme/ThemePreference'
import { THEME_STORAGE_KEY, initialTheme } from '@/features/theme/preferenceModel'
import { ThemeChooser } from '@/features/theme/ThemeChooser'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { CartoonButton } from '@/components/cartoon/CartoonButton'

beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '/'); delete document.documentElement.dataset.uiTheme })
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); window.history.replaceState(null, '', '/') })
describe('published UI themes only', () => {
  it('defaults new visitors to Candy Clouds and preserves explicit saved themes', () => {
    expect(initialTheme('', false, localStorage)).toBe('candy-clouds')
    localStorage.setItem(THEME_STORAGE_KEY, 'emotion-orbit')
    expect(initialTheme('', false, localStorage)).toBe('emotion-orbit')
    localStorage.setItem(THEME_STORAGE_KEY, 'kindness-workshop')
    expect(initialTheme('', false, localStorage)).toBe('kindness-workshop')
  })
  it('ignores old/unknown themes in production, retaining only validated preferences', () => {
    for (const value of ['legacy', 'mint-blush', 'unknown', '<script>']) {
      localStorage.setItem(THEME_STORAGE_KEY, value)
      expect(initialTheme(`?theme=${value}`, false, localStorage)).toBe('candy-clouds')
    }
    localStorage.setItem(THEME_STORAGE_KEY, 'kindness-workshop')
    expect(initialTheme('?theme=legacy', false, localStorage)).toBe('kindness-workshop')
    expect(initialTheme('?theme=emotion-orbit', false, localStorage)).toBe('emotion-orbit')
    expect(initialTheme('?theme=legacy', true, localStorage)).toBe('legacy')
  })
  it('accepts a public Workshop link and tolerates storage being blocked', () => {
    const blocked = { getItem: () => { throw new Error('synthetic-storage-denied') } }
    expect(initialTheme('?theme=kindness-workshop', false, blocked)).toBe('kindness-workshop')
    expect(initialTheme('', false, blocked)).toBe('candy-clouds')
  })
  it('changes materials without remounting children or changing router/popup state and restores on reload', () => {
    const mounted = vi.fn(), unmounted = vi.fn()
    function Probe() {
      useEffect(() => { mounted(); return unmounted }, [])
      return <><output aria-label="Theme">{useControlTheme()}</output><CartoonButton>Thử nút</CartoonButton></>
    }
    const state = { idx: 7, usr: { preserve: true }, __emcoinPopup: 'synthetic-entry' }
    window.history.replaceState(state, '', '/?theme=emotion-orbit&keep=1')
    const view = render(<ThemePreferenceProvider><ThemeChooser /><Probe /></ThemePreferenceProvider>)
    fireEvent.click(screen.getByRole('radio', { name: /Xưởng Tử Tế/ }))
    expect(screen.getByLabelText('Theme')).toHaveTextContent('kindness-workshop')
    expect(screen.getByRole('button', { name: 'Thử nút' }).querySelector('img')).toHaveAttribute('src', '/cartoon/ui/themes/kindness-workshop/primary-v3.webp')
    expect(document.documentElement.dataset.uiTheme).toBe('kindness-workshop')
    expect(mounted).toHaveBeenCalledTimes(1); expect(unmounted).not.toHaveBeenCalled()
    expect(window.history.state).toEqual(state)
    expect(window.location.search).toBe('?keep=1')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('kindness-workshop')
    view.unmount()
    render(<ThemePreferenceProvider><ThemeChooser /><Probe /></ThemePreferenceProvider>)
    expect(screen.getByRole('radio', { name: /Xưởng Tử Tế/ })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: /Vòng Cảm Xúc/ }))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('emotion-orbit')
  })
  it('still switches in memory when persistence fails and clearly reports it', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('synthetic-storage-denied') })
    render(<ThemePreferenceProvider><ThemeChooser /></ThemePreferenceProvider>)
    await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /Xưởng Tử Tế/ })) })
    expect(screen.getByRole('radio', { name: /Xưởng Tử Tế/ })).toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent('không cho lưu')
  })
})
