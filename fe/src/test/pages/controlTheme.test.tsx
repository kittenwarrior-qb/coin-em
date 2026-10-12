import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CartoonButton, CartoonCircleButton } from '@/components/cartoon/CartoonButton'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { DEFAULT_CONTROL_THEME, pillAppearance } from '@/components/cartoon/controlThemes'

afterEach(cleanup)
describe('A control theme', () => {
  it.each(['green', 'pink'])('uses the versioned %s sprite and live dark-ink label', color => {
    render(<ControlThemeProvider theme="mint-blush"><CartoonButton color={color} badge="MỚI">Tiếp tục</CartoonButton></ControlThemeProvider>)
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toHaveAttribute('data-control-theme', 'mint-blush')
    expect(document.querySelector('img')).toHaveAttribute('src', color === 'green' ? '/cartoon/buttons/themes/sky-pink-a1/pill-sky-v2.png' : '/cartoon/buttons/themes/mint-blush-v2/pill-blush.png')
    expect(screen.getByText('Tiếp tục')).not.toHaveClass('drop-shadow-md')
    expect(screen.getByText('MỚI').parentElement).toHaveAttribute('data-cartoon-surface', 'pill')
    expect(screen.getByRole('button').style.color).toContain('--ui-brand-')
  })
  it('switches A to legacy in place without resetting pending/ref/label semantics', () => {
    const ref = createRef<HTMLButtonElement>()
    const click = vi.fn()
    const { rerender } = render(<ControlThemeProvider theme="mint-blush"><CartoonButton ref={ref} pending onClick={click}>Xác nhận</CartoonButton></ControlThemeProvider>)
    const button = ref.current!
    fireEvent.click(button)
    expect(click).not.toHaveBeenCalled()
    rerender(<ControlThemeProvider theme="legacy"><CartoonButton ref={ref} pending onClick={click}>Xác nhận</CartoonButton></ControlThemeProvider>)
    expect(ref.current).toBe(button)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(document.querySelector('img')).toHaveAttribute('src', '/cartoon/buttons/pill/Green.png')
    expect(screen.getByText('Xác nhận')).toHaveClass('drop-shadow-md')
  })
  it('isolates nested legacy themes while migrating orange and red controls', () => {
    render(<ControlThemeProvider theme="mint-blush"><CartoonButton color="orange">Tiếp tục</CartoonButton><ControlThemeProvider theme="legacy"><CartoonButton>Gửi</CartoonButton></ControlThemeProvider><CartoonCircleButton color="red" aria-label="Đóng" /></ControlThemeProvider>)
    expect(screen.getByRole('button', { name: 'Tiếp tục' }).querySelector('img')).toHaveAttribute('src', '/cartoon/buttons/themes/mint-blush-v2/pill-blush.png')
    expect(screen.getByRole('button', { name: 'Gửi' }).querySelector('img')).toHaveAttribute('src', '/cartoon/buttons/pill/Green.png')
    expect(screen.getByRole('button', { name: 'Đóng' }).querySelector('img')).toHaveAttribute('src', '/cartoon/buttons/themes/mint-blush-v2/circle-blush.png')
    expect(DEFAULT_CONTROL_THEME).toBe('emotion-orbit')
    expect(pillAppearance('mint-blush', 'unknown', { src: 'legacy.png', textColor: '#fff' }).src).toContain('sky-pink-a1/pill-sky-v2.png')
  })
  it('switches global chrome with the root theme and restores its previous attribute on unmount', () => {
    const previous = document.documentElement.dataset.uiTheme
    const { rerender, unmount } = render(<ControlThemeProvider root theme="mint-blush"><CartoonButton>Gửi</CartoonButton></ControlThemeProvider>)
    expect(document.documentElement.dataset.uiTheme).toBe('mint-blush')
    rerender(<ControlThemeProvider root theme="legacy"><CartoonButton>Gửi</CartoonButton></ControlThemeProvider>)
    expect(document.documentElement.dataset.uiTheme).toBe('legacy')
    unmount()
    expect(document.documentElement.dataset.uiTheme).toBe(previous)
  })
})
