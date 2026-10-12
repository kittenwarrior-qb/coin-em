import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { CartoonModal } from '@/components/cartoon/CartoonModal'

afterEach(() => { cleanup(); document.querySelectorAll('[data-test-shell]').forEach(element => element.remove()) })
function shell(id: string, className = '') {
  const root = document.createElement('div'); root.id = id; root.className = className
  root.dataset.testShell = 'true'; document.body.appendChild(root); return root
}
describe('deterministic shell-scoped modal portal', () => {
  it('portals to the game shell on the first opening, not after a later state update', () => {
    const root = shell('game-panel')
    render(<CartoonModal open title="Menu">Nội dung</CartoonModal>)
    expect(root).toContainElement(screen.getByText('Nội dung'))
    expect(screen.getByTestId('cartoon-modal-overlay')).toHaveClass('absolute')
  })
  it('explicit container overrides unrelated shells', () => {
    shell('game-panel')
    const root = shell('explicit-shell')
    render(<CartoonModal container={root} open>Nội dung riêng</CartoonModal>)
    expect(root).toContainElement(screen.getByText('Nội dung riêng'))
  })
  it('uses fixed viewport scope only when no screen shell exists', () => {
    render(<CartoonModal open>Nội dung trang</CartoonModal>)
    expect(screen.getByTestId('cartoon-modal-overlay')).toHaveClass('fixed')
  })
  it('falls back to the existing non-game screen shell', () => {
    const root = shell('lobby-shell', 'screen-panel')
    render(<CartoonModal open>Sảnh</CartoonModal>)
    expect(root).toContainElement(screen.getByText('Sảnh'))
  })
  it('does not remount child state when a parent changes', () => {
    const mounted = vi.fn()
    function Child() { const [id] = useState(() => { mounted(); return 'Giữ trạng thái' }); return <span>{id}</span> }
    shell('game-panel')
    const { rerender } = render(<CartoonModal open title="Menu"><Child /></CartoonModal>)
    rerender(<CartoonModal open title="Menu mới"><Child /></CartoonModal>)
    expect(mounted).toHaveBeenCalledOnce()
    expect(screen.getByText('Giữ trạng thái')).toBeInTheDocument()
  })
})
