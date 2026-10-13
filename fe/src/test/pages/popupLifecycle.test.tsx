import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CartoonModal } from '../../components/cartoon/CartoonModal'
import { handlePlatformBack, usePendingNavigationGuard, usePopupLifecycle } from '../../features/overlays/usePopupLifecycle'

afterEach(async () => {
  cleanup()
  await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined())
})

describe('owner-approved topmost popup lifecycle', () => {
  it('native Back consumes pending guards and closes only an ordinary top popup', async () => {
    const close=vi.fn()
    function Fixture({pending,open}:{pending:boolean;open:boolean}) {
      usePendingNavigationGuard(pending)
      return <CartoonModal open={open} title="Native popup" onClose={close}><button>Action</button></CartoonModal>
    }
    const {rerender}=render(<Fixture pending={true} open={false} />)
    expect(handlePlatformBack()).toBe(true);expect(close).not.toHaveBeenCalled()
    rerender(<Fixture pending={false} open={false} />)
    await waitFor(()=>expect(window.history.state?.__emcoinPopup).toBeUndefined())
    expect(handlePlatformBack()).toBe(false)
    rerender(<Fixture pending={false} open={true} />)
    expect(handlePlatformBack()).toBe(true);expect(close).toHaveBeenCalledTimes(1)
  })
  it('immediate replacement during history consumption retains original router state and connected opener', async () => {
    const url = window.location.href
    const state = { idx: 17, key: 'replacement', usr: { keep: true } }
    window.history.replaceState(state, '', url)
    function Dialog({ name, onClose, onReplace }: { name: string; onClose: () => void; onReplace?: () => void }) {
      const ref = useRef<HTMLDivElement>(null)
      usePopupLifecycle(ref, true, { onClose })
      return <div ref={ref} role="dialog" aria-label={name} tabIndex={-1}>
        <button onClick={onReplace ?? onClose}>{onReplace ? 'Đổi popup' : 'Đóng'}</button>
      </div>
    }
    function Fixture() {
      const [mode, setMode] = useState(0)
      return <><button onClick={() => setMode(1)}>Mở</button>
        {mode === 1 && <Dialog key="first" name="Đầu" onClose={() => setMode(0)} onReplace={() => setMode(2)} />}
        {mode === 2 && <Dialog key="second" name="Sau" onClose={() => setMode(0)} />}
      </>
    }
    render(<Fixture />)
    const opener = screen.getByRole('button', { name: 'Mở' })
    opener.focus(); fireEvent.click(opener)
    // Browser traversal is asynchronous: leave the owned entry current until popstate.
    const traversal = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Đổi popup' }))
    traversal.mockRestore()
    window.history.back()
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(screen.getByRole('dialog', { name: 'Sau' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(window.history.state).toEqual(state))
    await waitFor(() => expect(opener).toHaveFocus())
    expect(window.location.href).toBe(url)
  })
  it('pending non-popup command consumes Back without a dialog or stealing focus', async () => {
    function Fixture({ pending }: { pending: boolean }) {
      usePendingNavigationGuard(pending)
      return <button>Giữ focus</button>
    }
    const routerPop = vi.fn()
    window.addEventListener('popstate', routerPop)
    const { rerender } = render(<Fixture pending={false} />)
    const button = screen.getByRole('button', { name: 'Giữ focus' })
    button.focus()
    rerender(<Fixture pending />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
    window.history.back()
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(routerPop).not.toHaveBeenCalled()
    expect(window.history.state?.__emcoinPopup).toEqual(expect.any(String))
    rerender(<Fixture pending={false} />)
    await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined())
    expect(routerPop).not.toHaveBeenCalled()
    window.removeEventListener('popstate', routerPop)
  })
  it('pending navigation guard blocks an otherwise closable popup until settled', () => {
    const close = vi.fn()
    function Fixture({ pending }: { pending: boolean }) {
      usePendingNavigationGuard(pending)
      return <CartoonModal open title="Menu" onClose={close}><button>Trong</button></CartoonModal>
    }
    const { rerender } = render(<Fixture pending />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(close).not.toHaveBeenCalled()
    rerender(<Fixture pending={false} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(close).toHaveBeenCalledOnce()
  })
  it('Escape dismisses only the child, restores its opener, then restores the page opener', async () => {
    function Fixture() {
      const [parent, setParent] = useState(false), [child, setChild] = useState(false)
      return <><button onClick={() => setParent(true)}>Mở cha</button>
        <CartoonModal open={parent} title="Cha" onClose={() => setParent(false)}>
          <button onClick={() => setChild(true)}>Mở con</button>
        </CartoonModal>
        <CartoonModal open={child} title="Con" onClose={() => setChild(false)}><button>Trong con</button></CartoonModal>
      </>
    }
    render(<Fixture />)
    const pageOpener = screen.getByRole('button', { name: 'Mở cha' })
    pageOpener.focus(); fireEvent.click(pageOpener)
    const parentOpener = screen.getByRole('button', { name: 'Mở con' })
    expect(parentOpener).toHaveFocus()
    fireEvent.click(parentOpener)
    expect(screen.getByRole('dialog', { name: 'Con' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.queryByRole('dialog', { name: 'Cha' })).not.toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Con' })).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Cha' })).toBeInTheDocument()
    expect(parentOpener).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cha' })).not.toBeInTheDocument())
    await waitFor(() => expect(pageOpener).toHaveFocus())
  })
  it('traps Tab and external focus in the top dialog, excluding disabled controls', () => {
    render(<><button>Ngoài</button><CartoonModal open title="Focus" hideClose>
      <button>Đầu</button><button disabled>Khóa</button><button>Cuối</button>
    </CartoonModal></>)
    const first = screen.getByRole('button', { name: 'Đầu' }), last = screen.getByRole('button', { name: 'Cuối' })
    expect(first).toHaveFocus()
    last.focus(); fireEvent.keyDown(last, { key: 'Tab' }); expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true }); expect(last).toHaveFocus()
    screen.getByRole('button', { name: 'Ngoài' }).focus(); expect(first).toHaveFocus()
  })
  it('consumes Back/Escape for pending top without closing parent or notifying the router', async () => {
    const parentClose = vi.fn(), childClose = vi.fn(), routerPop = vi.fn()
    window.addEventListener('popstate', routerPop)
    const { rerender } = render(<><CartoonModal open title="Cha" onClose={parentClose}>Cha</CartoonModal>
      <CartoonModal open title="Đang chờ" onClose={childClose} persistent><button>Chờ</button></CartoonModal></>)
    fireEvent.keyDown(document, { key: 'Escape' })
    window.history.back()
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(childClose).not.toHaveBeenCalled(); expect(parentClose).not.toHaveBeenCalled()
    expect(routerPop).not.toHaveBeenCalled()
    expect(window.history.state?.__emcoinPopup).toEqual(expect.any(String))
    rerender(<><CartoonModal open title="Cha" onClose={parentClose}>Cha</CartoonModal>
      <CartoonModal open title="Đang chờ" onClose={childClose}><button>Chờ</button></CartoonModal></>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(childClose).toHaveBeenCalledOnce(); expect(parentClose).not.toHaveBeenCalled()
    window.removeEventListener('popstate', routerPop)
  })
  it('Back closes one popup while preserving router state and route', async () => {
    const originalURL = window.location.href
    window.history.replaceState({ idx: 7, key: 'fixture', usr: { keep: true } }, '', originalURL)
    function Fixture() {
      const [open, setOpen] = useState(true)
      return <CartoonModal open={open} title="Back" onClose={() => setOpen(false)}><button>Nội dung</button></CartoonModal>
    }
    render(<Fixture />)
    expect(window.history.state.idx).toBe(7)
    window.history.back()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Back' })).not.toBeInTheDocument())
    await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined())
    expect(window.location.href).toBe(originalURL)
    expect(window.history.state).toEqual({ idx: 7, key: 'fixture', usr: { keep: true } })
  })
})
