import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportsPanel } from '@/features/admin/ReportsPanel'
import { AdminRequestError } from '@/features/admin/client'

const mocks = vi.hoisted(() => ({ list: vi.fn(), resolve: vi.fn() }))
vi.mock('@/features/admin/reportsClient', async original => ({ ...await original<typeof import('@/features/admin/reportsClient')>(), reportsClient: mocks }))
const report = { id: 'a1234567-1234-4123-8123-123456789abc', roomId: 'fixture', reporterId: 'reporter', reason: 'unsafe', status: 'open', createdAt: 2000,
  expiresAt: 1000 + 7 * 86400000, resolvedAt: null, message: { id: 'b1234567-1234-4123-8123-123456789abc', senderId: 'sender', senderName: 'Người thử nghiệm', text: '<script>literal</script>', sentAt: 1000 } }
beforeEach(() => { vi.resetAllMocks(); mocks.list.mockResolvedValue({ version: 'chat-reports/v1', total: 51, reports: [report] }) })
afterEach(cleanup)
describe('admin selected report workflow', () => {
  it('shows bounded counts, searches loaded rows and renders evidence as text', async () => {
    render(<ReportsPanel onBusy={vi.fn()} onExpired={vi.fn()} />)
    await screen.findByText('Người thử nghiệm')
    expect(screen.getByText(/Đã tải 1 \/ 51/)).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } })
    expect(screen.getByText('Không có kết quả trong báo cáo đã tải')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    expect(screen.getByText('<script>literal</script>')).toBeInTheDocument()
    expect(document.querySelector('blockquote script')).toBeNull()
  })
  it('keeps the exact resolution UUID after timeout and does not close on Escape', async () => {
    const busy = vi.fn()
    mocks.resolve.mockRejectedValueOnce(Error('lost response')).mockResolvedValueOnce({ success: true, replayed: true })
    render(<ReportsPanel onBusy={busy} onExpired={vi.fn()} />)
    await screen.findByText('Người thử nghiệm'); fireEvent.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã xử lý' }))
    await screen.findByText(/Chưa xác nhận được kết quả/)
    expect(mocks.resolve).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại' }))
    await waitFor(() => expect(mocks.resolve).toHaveBeenCalledTimes(2))
    expect(mocks.resolve.mock.calls[1][0]).toEqual(mocks.resolve.mock.calls[0][0])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(busy).toHaveBeenLastCalledWith(false)
  })
  it('clears evidence and expires authentication on 401', async () => {
    const expired = vi.fn(); mocks.resolve.mockRejectedValue(new AdminRequestError(401))
    render(<ReportsPanel onBusy={vi.fn()} onExpired={expired} />)
    await screen.findByText('Người thử nghiệm'); fireEvent.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Không cần xử lý' }))
    await waitFor(() => expect(expired).toHaveBeenCalledOnce())
    expect(screen.queryByText('<script>literal</script>')).not.toBeInTheDocument()
  })
  it('aborts a read on unmount and shows unavailable without claiming an empty queue', async () => {
    mocks.list.mockRejectedValue(new AdminRequestError(503))
    const view = render(<ReportsPanel onBusy={vi.fn()} onExpired={vi.fn()} />)
    await screen.findByText(/Báo cáo chưa được bật/)
    expect(screen.queryByText('Không có báo cáo ở trạng thái này')).not.toBeInTheDocument()
    const signal = mocks.list.mock.calls[0][1] as AbortSignal
    await act(async () => view.unmount())
    expect(signal.aborted).toBe(true)
  })
})
