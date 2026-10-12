import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { CartoonModal } from '@/components/cartoon/CartoonModal'
import { MutedNoticeModal, NightActionConfirmModal, PhaseNavConfirmModal, ReflectionRewardConfirmModal } from '@/components/game/GameModals'

afterEach(async () => {
  cleanup()
  await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined())
})
it('pending night confirmation consumes Back/Esc without cancelling or performing an action', async () => {
  const cancel = vi.fn(), heal = vi.fn(), silence = vi.fn()
  const props = { action: { type: 'heal' as const, targetId: 'synthetic-seat', targetName: 'Người chơi', iconSrc: '/synthetic.svg' }, onCancel: cancel, onConfirmHeal: heal, onConfirmSilence: silence }
  const { rerender } = render(<NightActionConfirmModal {...props} pending />)
  const dialog = screen.getByRole('dialog', { name: 'Xác nhận bảo vệ' })
  expect(dialog).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Escape' })
  window.history.back()
  await new Promise(resolve => setTimeout(resolve, 40))
  expect(cancel).not.toHaveBeenCalled(); expect(heal).not.toHaveBeenCalled(); expect(silence).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeDisabled()
  rerender(<NightActionConfirmModal {...props} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(cancel).toHaveBeenCalledOnce()
  expect(heal).not.toHaveBeenCalled()
})
it('closes only a custom phase child and restores focus to the parent opener', async () => {
  const confirm = vi.fn()
  function Fixture() {
    const [child, setChild] = useState(false)
    return <><CartoonModal open title="Menu" hideClose><button onClick={() => setChild(true)}>Mở xác nhận</button></CartoonModal>
      <PhaseNavConfirmModal navigation={child ? { direction: 'next', targetPhase: 'night' } : null} activePhase="role-reveal" onCancel={() => setChild(false)} onConfirm={confirm} />
    </>
  }
  render(<Fixture />)
  const opener = screen.getByRole('button', { name: 'Mở xác nhận' })
  fireEvent.click(opener)
  expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chuyển sang phase tiếp theo?' })).not.toBeInTheDocument())
  expect(opener).toHaveFocus()
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Menu' })).toBeVisible())
  expect(confirm).not.toHaveBeenCalled()
})
it('mandatory reward confirmation never translates Escape/Back into skip or reward', async () => {
  const skip = vi.fn(), confirm = vi.fn()
  render(<ReflectionRewardConfirmModal players={[]} onSkip={skip} onConfirm={confirm} />)
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Xác nhận phần thưởng' })).toBeVisible())
  fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(resolve => setTimeout(resolve, 40))
  expect(skip).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: 'Xác nhận phần thưởng' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }))
  expect(skip).toHaveBeenCalledOnce()
})
it('registers the replacement notice node and closes without game mutations', () => {
  const dismiss = vi.fn()
  const { rerender } = render(<MutedNoticeModal notice={null} onDismiss={dismiss} />)
  rerender(<MutedNoticeModal notice={{ name: 'Người chơi', isMe: true, nonce: 1 }} onDismiss={dismiss} />)
  const first = screen.getByRole('dialog', { name: 'Thông báo im lặng' })
  rerender(<MutedNoticeModal notice={{ name: 'Người chơi', isMe: true, nonce: 2 }} onDismiss={dismiss} />)
  const second = screen.getByRole('dialog', { name: 'Thông báo im lặng' })
  expect(second).not.toBe(first)
  expect(screen.getByRole('button', { name: 'Đã hiểu' })).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(dismiss).toHaveBeenCalledOnce()
})
