import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { CartoonButton, CartoonCircleButton } from '@/components/cartoon/CartoonButton'
import { CartoonModal } from '@/components/cartoon/CartoonModal'
import { BrandHome } from '@/components/lobby/BrandHome'
import { previewControlTheme, themeBackdrop, themePanel, themeLogo } from '@/components/cartoon/controlThemes'

afterEach(cleanup)
describe('Independent brand themes', () => {
  it.each(['emotion-orbit', 'kindness-workshop'] as const)('gives %s secondary white actions a quiet surface, not a primary CTA', theme => {
    render(<ControlThemeProvider theme={theme}><CartoonButton color="white">Rời phòng</CartoonButton><CartoonCircleButton iconSrc="/emcoin/icons/orbit/settings.svg" aria-label="Cài đặt" /></ControlThemeProvider>)
    expect(screen.getByRole('button', { name: 'Rời phòng' }).querySelector('img')).toHaveAttribute('src', `/cartoon/ui/themes/${theme}/quiet-v3.webp`)
    const settings = screen.getByRole('button', { name: 'Cài đặt' }).querySelector('svg')
    expect(settings).toHaveAttribute('viewBox', theme === 'emotion-orbit' ? '0 0 24 24' : '0 0 42 42')
  })
  it.each(['emotion-orbit', 'kindness-workshop'] as const)('keeps %s home actions live and exposes resume only when available', theme => {
    const join = vi.fn(), create = vi.fn(), guide = vi.fn(), menu = vi.fn(), resume = vi.fn()
    const view = (count: number) => <ControlThemeProvider theme={theme}><BrandHome logo={<span>EmCoin</span>} onJoin={join} onCreate={create} onGuide={guide} onMenu={menu} onResume={resume} resumeCount={count} /></ControlThemeProvider>
    const { rerender } = render(view(0))
    for (const [label, callback] of [['Tìm phòng', join], ['Tạo phòng', create], ['Hướng dẫn', guide], ['Cài đặt', menu]] as const) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(callback).toHaveBeenCalledOnce()
    }
    expect(screen.queryByRole('button', { name: /Tiếp tục phòng/ })).not.toBeInTheDocument()
    rerender(view(2))
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục phòng (2)' }))
    expect(resume).toHaveBeenCalledOnce()
  })
  it.each(['emotion-orbit', 'kindness-workshop'] as const)('applies %s to controls and portals without changing actions', theme => {
    const click = vi.fn()
    render(<ControlThemeProvider root theme={theme}><CartoonButton onClick={click}>Gửi</CartoonButton><CartoonModal open title="Menu"><p>Nội dung</p></CartoonModal></ControlThemeProvider>)
    expect(document.documentElement.dataset.uiTheme).toBe(theme)
    expect(screen.getByRole('button', { name: 'Gửi' })).toHaveAttribute('data-control-theme', theme)
    expect(screen.getByRole('button', { name: 'Gửi' }).querySelector('img')).toHaveAttribute('src', `/cartoon/ui/themes/${theme}/primary-v3.webp`)
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }))
    expect(click).toHaveBeenCalledOnce()
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()
    expect(themeBackdrop(theme, 'legacy')).toContain(theme)
    expect(themePanel(theme)).toBe('none')
    expect(themeLogo(theme)).toBe(`/cartoon/ui/themes/${theme}/logo-v2.webp`)
  })
  it('switches theme in place without clearing the pending state', () => {
    const click = vi.fn()
    const { rerender } = render(<ControlThemeProvider root theme="emotion-orbit"><CartoonButton pending onClick={click}>Xác nhận</CartoonButton></ControlThemeProvider>)
    const before = screen.getByRole('button', { name: 'Xác nhận' })
    rerender(<ControlThemeProvider root theme="kindness-workshop"><CartoonButton pending onClick={click}>Xác nhận</CartoonButton></ControlThemeProvider>)
    expect(screen.getByRole('button', { name: 'Xác nhận' })).toBe(before)
    expect(before).toBeDisabled()
    expect(before).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(before)
    expect(click).not.toHaveBeenCalled()
  })
  it('accepts registered preview IDs only and retains the current default', () => {
    expect(previewControlTheme('?theme=emotion-orbit')).toBe('emotion-orbit')
    expect(previewControlTheme('?theme=kindness-workshop')).toBe('kindness-workshop')
    expect(previewControlTheme('?theme=__proto__')).toBe('emotion-orbit')
    expect(previewControlTheme('?theme=unknown')).toBe('emotion-orbit')
    expect(themeLogo('legacy')).toBe('/emcoin_logo.png')
  })
})
