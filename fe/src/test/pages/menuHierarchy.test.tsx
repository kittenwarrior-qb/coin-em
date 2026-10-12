import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameMenuModal } from '@/components/lobby/GameMenuModal'
import { CartoonModal } from '@/components/cartoon/CartoonModal'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'

afterEach(cleanup)

describe('menu-only A hierarchy', () => {
  it('keeps the Orbit inline badge and outline family separate from paper controls', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<ControlThemeProvider theme="emotion-orbit"><GameMenuModal open onClose={() => {}} /></ControlThemeProvider>)
    const cards3d = screen.getByRole('button', { name: 'Mở Bộ thẻ 3d trong tab mới' })
    expect(cards3d.querySelector('.brand-menu-text .orbit-menu-new')).toHaveTextContent('MỚI')
    expect(cards3d.querySelector('[data-cartoon-badge]')).toBeNull()
    expect(cards3d.querySelector('.brand-menu-icon svg')).toHaveAttribute('viewBox', '0 0 40 40')
    fireEvent.click(cards3d)
    expect(open).toHaveBeenCalledWith('/cards', '_blank', 'noopener,noreferrer')
    cleanup()
    render(<ControlThemeProvider theme="kindness-workshop"><GameMenuModal open onClose={() => {}} /></ControlThemeProvider>)
    const paperCards = screen.getByRole('button', { name: 'Mở Bộ thẻ 3d trong tab mới' })
    expect(paperCards.querySelector('.orbit-menu-new')).toBeNull()
    expect(paperCards.querySelector('[data-cartoon-badge]')).toHaveTextContent('MỚI')
    expect(paperCards.querySelector('.brand-menu-icon svg')).toHaveAttribute('viewBox', '0 0 42 42')
    open.mockRestore()
  })
  it('keeps the harmonized direction opt-in and removes cream/pink support actions', () => {
    render(<ControlThemeProvider theme="mint-blush"><GameMenuModal open onClose={() => {}} visualStyle="sky-pink-study" /></ControlThemeProvider>)
    expect(screen.getByRole('dialog', { name: 'Menu' })).toHaveClass('theme-a-menu--harmonized')
    for (const name of ['Bộ thẻ', 'Hướng dẫn', 'Hỗ trợ']) {
      expect(screen.getByRole('button', { name }).querySelector('img')).toHaveAttribute('src', '/cartoon/buttons/themes/sky-pink-a1/pill-sky-v2.png')
    }
    expect(screen.getByRole('button', { name: 'Mở Bộ thẻ 3d trong tab mới' }).querySelector('img')).toHaveAttribute('src', '/cartoon/buttons/themes/mint-blush-v2/pill-blush.png')
    cleanup()
    render(<ControlThemeProvider theme="mint-blush"><GameMenuModal open onClose={() => {}} /></ControlThemeProvider>)
    expect(screen.getByRole('dialog', { name: 'Menu' })).not.toHaveClass('theme-a-menu--harmonized')
  })
  it('uses A1 functional colors and the same pill primitive for the separate exit', async () => {
    const quit = vi.fn().mockResolvedValue(true)
    const close = vi.fn()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<ControlThemeProvider theme="mint-blush"><GameMenuModal open onClose={close} onQuit={quit} /></ControlThemeProvider>)
    const menu = screen.getByRole('dialog', { name: 'Menu' })
    expect(menu).toHaveClass('theme-a-menu')
    for (const [name, version, color] of [['Bộ thẻ', 'v2', 'mint'], ['Mở Bộ thẻ 3d trong tab mới', 'v2', 'blush'], ['Hướng dẫn', 'a1', 'cream'], ['Thoát game', 'a1', 'blush-soft']]) {
      const control = screen.getByRole('button', { name })
      const asset = color === 'mint' ? '/cartoon/buttons/themes/sky-pink-a1/pill-sky-v2.png' : version === 'a1' ? `/cartoon/buttons/themes/sky-pink-a1/pill-${color}-v2.png` : `/cartoon/buttons/themes/mint-blush-${version}/pill-${color}.png`
      expect(control.querySelector('img')).toHaveAttribute('src', asset)
      expect(control).toHaveClass('cartoon-control')
      expect(control.querySelector('[data-cartoon-surface="pill"]')).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Mở Bộ thẻ 3d trong tab mới' }))
    expect(open).toHaveBeenCalledWith('/cards', '_blank', 'noopener,noreferrer')
    open.mockRestore()
    const exit = screen.getByRole('button', { name: 'Thoát game' })
    expect(exit.parentElement).toHaveClass('theme-a-menu-exit')
    expect(screen.getByRole('button', { name: 'Đóng' })).toHaveClass('!h-11', '!w-11')
    fireEvent.click(exit)
    expect(quit).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Xác nhận thoát' })).not.toHaveClass('theme-a-menu')
    fireEvent.click(screen.getByRole('button', { name: 'Thoát' }))
    await waitFor(() => expect(quit).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1))
  })

  it('retains the support entry outside a room and does not theme ordinary dialogs', () => {
    render(<ControlThemeProvider theme="mint-blush"><GameMenuModal open onClose={() => {}} /></ControlThemeProvider>)
    expect(screen.getByRole('button', { name: 'Hỗ trợ' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Thoát game' })).not.toBeInTheDocument()
    cleanup()
    render(<ControlThemeProvider theme="mint-blush"><CartoonModal open title="Khác">Nội dung</CartoonModal></ControlThemeProvider>)
    expect(screen.getByRole('dialog', { name: 'Khác' })).not.toHaveClass('theme-a-menu')
  })

  it('leaves legacy menu art and close geometry intact', () => {
    render(<ControlThemeProvider theme="legacy"><GameMenuModal open onClose={() => {}} onQuit={() => {}} /></ControlThemeProvider>)
    expect(screen.getByRole('dialog', { name: 'Menu' })).not.toHaveClass('theme-a-menu')
    expect(screen.getByRole('button', { name: 'Thoát game' }).querySelector('img')).toHaveAttribute('src', '/cartoon/buttons/pill/Orange.png')
    expect(screen.getByRole('button', { name: 'Đóng' })).toHaveClass('!h-8', '!w-8')
  })
})
