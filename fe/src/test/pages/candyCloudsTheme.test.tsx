import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { CartoonButton } from '@/components/cartoon/CartoonButton'
import { CartoonModal } from '@/components/cartoon/CartoonModal'
import { circleAppearance, isBrandTheme, themeBackdrop, themeLogo, themeArtUrl, DEFAULT_CONTROL_THEME } from '@/components/cartoon/controlThemes'
import { ThemePreferenceProvider } from '@/features/theme/ThemePreference'
import { ThemeChooser } from '@/features/theme/ThemeChooser'
import { initialTheme, isPublishedTheme, THEME_STORAGE_KEY } from '@/features/theme/preferenceModel'
import { handlePlatformBack } from '@/features/overlays/usePopupLifecycle'

afterEach(async () => {
  cleanup()
  await waitFor(() => expect(handlePlatformBack()).toBe(false))
  localStorage.clear(); window.history.replaceState(null, '', '/')
})
it('registers the third theme without changing defaults, card URLs or semantic Coin artwork', () => {
  expect(DEFAULT_CONTROL_THEME).toBe('emotion-orbit')
  expect(isPublishedTheme('candy-clouds')).toBe(true)
  expect(isBrandTheme('candy-clouds')).toBe(true)
  expect(themeLogo('candy-clouds')).toBe('/logo.svg')
  expect(themeBackdrop('candy-clouds', 'old')).toBe('url(/cartoon/ui/themes/candy-clouds/backdrop.webp)')
  for (const url of ['/emcoin/decks/pdf-v1/page-1.webp', '/cards/role.png', '/emcoin/coins/orbit/red.svg']) expect(themeArtUrl('candy-clouds', url)).toBe(url)
  expect(circleAppearance('candy-clouds', 'blue', 'old').src).toBe('/cartoon/ui/themes/candy-clouds/circle.svg')
})
it('keeps controls live and pending protection intact while changing to Candy Clouds', () => {
  const click = vi.fn()
  const { rerender } = render(<ControlThemeProvider theme="emotion-orbit"><CartoonButton pending onClick={click}>Gửi</CartoonButton></ControlThemeProvider>)
  const button = screen.getByRole('button', { name: 'Gửi' })
  rerender(<ControlThemeProvider theme="candy-clouds"><CartoonButton pending onClick={click}>Gửi</CartoonButton></ControlThemeProvider>)
  expect(screen.getByRole('button', { name: 'Gửi' })).toBe(button)
  expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-busy', 'true')
  expect(button.querySelector('img')).toHaveAttribute('src', '/cartoon/ui/themes/candy-clouds/primary.svg')
  fireEvent.click(button); expect(click).not.toHaveBeenCalled()
})
it('persists the new theme, restores it and preserves router state when selected', () => {
  window.history.replaceState({ keep: true }, '', '/?theme=emotion-orbit&keep=1')
  const view = render(<ThemePreferenceProvider><CartoonModal open title="Thử giao diện"><ThemeChooser /><p>Giữ nội dung</p></CartoonModal></ThemePreferenceProvider>)
  const dialog = screen.getByRole('dialog', { name: 'Thử giao diện' })
  const popupHistory = window.history.state
  fireEvent.click(screen.getByRole('radio', { name: /Mây Kẹo/ }))
  expect(document.documentElement.dataset.uiTheme).toBe('candy-clouds')
  expect(screen.getByRole('dialog', { name: 'Thử giao diện' })).toBe(dialog)
  expect(window.history.state).toEqual(popupHistory)
  expect(window.history.state.keep).toBe(true)
  expect(window.location.search).toBe('?keep=1')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('candy-clouds')
  view.unmount()
  expect(initialTheme('', false, localStorage)).toBe('candy-clouds')
  expect(initialTheme('?theme=candy-clouds', false, { getItem: () => null })).toBe('candy-clouds')
})
it('removes a stale preview override restored by popup Back without losing unrelated history', () => {
  window.history.replaceState({ keep: 7 }, '', '/?theme=emotion-orbit&keep=1')
  render(<ThemePreferenceProvider><ThemeChooser /></ThemePreferenceProvider>)
  fireEvent.click(screen.getByRole('radio', { name: /Mây Kẹo/ }))
  const restored = { keep: 7, __emcoinPopup: 'retained-popup' }
  window.history.replaceState(restored, '', '/?theme=emotion-orbit&keep=1')
  fireEvent.popState(window, { state: restored })
  expect(window.location.search).toBe('?keep=1')
  expect(window.history.state).toEqual(restored)
  expect(document.documentElement.dataset.uiTheme).toBe('candy-clouds')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('candy-clouds')
})
