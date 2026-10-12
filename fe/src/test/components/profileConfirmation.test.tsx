import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProfileModal } from '@/components/cartoon/ProfileModal'

afterEach(cleanup)
const base = { open: true, currentName: 'Fixture', currentAvatarIndex: 0, currentBgIndex: 0 }
it('keeps active drafts on broadcasts but reseeds the next opening from confirmed profile', () => {
  const close = vi.fn(), save = vi.fn()
  const { rerender } = render(<ProfileModal {...base} onClose={close} onSave={save} />)
  fireEvent.change(screen.getByPlaceholderText('Nhập tên'), { target: { value: 'Draft' } })
  rerender(<ProfileModal {...base} currentName="Committed" onClose={close} onSave={save} />)
  expect(screen.getByPlaceholderText('Nhập tên')).toHaveValue('Draft')
  rerender(<ProfileModal {...base} currentName="Committed" open={false} onClose={close} onSave={save} />)
  rerender(<ProfileModal {...base} currentName="Committed" onClose={close} onSave={save} />)
  expect(screen.getByPlaceholderText('Nhập tên')).toHaveValue('Committed')
})
it.each([true, false])('retains draft and blocks duplicate/backdrop until confirmed: %s', async answer => {
  let ack!: (ok: boolean) => void
  const save = vi.fn(() => new Promise<boolean>(resolve => { ack = resolve })), close = vi.fn()
  render(<ProfileModal {...base} onClose={close} onSave={save} />)
  fireEvent.change(screen.getByPlaceholderText('Nhập tên'), { target: { value: 'Changed' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(save).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: /Đang xử lý|Lưu/ })).toBeDisabled()
  fireEvent.click(screen.getByTestId('cartoon-modal-overlay'))
  expect(close).not.toHaveBeenCalled()
  await act(async () => { ack(answer) })
  expect(close).toHaveBeenCalledTimes(answer ? 1 : 0)
  expect(screen.getByPlaceholderText('Nhập tên')).toHaveValue('Changed')
})
it('keeps draft and shows uncertainty on unexpected save rejection', async () => {
  const close = vi.fn()
  render(<ProfileModal {...base} onClose={close} onSave={vi.fn().mockRejectedValue(new Error('fixture'))} />)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Lưu' })) })
  expect(screen.getByRole('alert')).toHaveTextContent('Chưa xác nhận')
  expect(close).not.toHaveBeenCalled()
})
it('cannot close a reopened editor from an older completion', async () => {
  let ack!: (ok: boolean) => void
  const save = vi.fn(() => new Promise<boolean>(resolve => { ack = resolve })), close = vi.fn()
  const { rerender } = render(<ProfileModal {...base} onClose={close} onSave={save} />)
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  rerender(<ProfileModal {...base} open={false} onClose={close} onSave={save} />)
  rerender(<ProfileModal {...base} onClose={close} onSave={save} />)
  await act(async () => { ack(true) })
  expect(close).not.toHaveBeenCalled()
})
