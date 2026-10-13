import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CatalogEditor } from '@/features/admin/CatalogEditor'
import { catalogClient, CatalogRequestError, type CatalogCard } from '@/features/admin/catalogClient'

vi.mock('@/features/admin/catalogClient', async importOriginal => {
  const actual = await importOriginal<typeof import('@/features/admin/catalogClient')>()
  return { ...actual, catalogClient: { draft: vi.fn(), save: vi.fn(), snapshot: vi.fn(), releases: vi.fn(), activate: vi.fn() } }
})
const card: CatalogCard = { id: 'pdf-v1-emotion-11', code: 'CX-011', name: 'Hung hăng', sortOrder: 10, category: 'emotion',
  group: 'advanced', definition: '', prompt: '', frontImageUrl: '/emcoin/decks/pdf-v1/page-071.webp',
  backImageUrl: '/emcoin/decks/pdf-v1/page-072.webp', sourcePages: [71, 72], reviewed: false, archived: false }
beforeEach(() => {
  vi.mocked(catalogClient.draft).mockReset().mockResolvedValue({ revision: 1, active: false, cards: [card] })
  vi.mocked(catalogClient.save).mockReset().mockResolvedValue(undefined)
  vi.mocked(catalogClient.snapshot).mockReset().mockResolvedValue(`catalog-${'a'.repeat(64)}`)
  vi.mocked(catalogClient.releases).mockReset().mockResolvedValue({ revision: 1, ready: false, snapshots: [] })
  vi.mocked(catalogClient.activate).mockReset().mockResolvedValue(undefined)
})
afterEach(cleanup)
it('shows paired thumbnails and changes page size without writes', async () => {
  vi.mocked(catalogClient.draft).mockResolvedValue({ revision: 1, active: false, cards: Array.from({ length: 27 }, (_, i) => ({ ...card, id: `size-${i}`, code: `SIZE-${i}`, sortOrder: i })) })
  render(<CatalogEditor />)
  await screen.findByRole('button', { name: 'SIZE-0 · Hung hăng' })
  expect(document.querySelector('.admin-card-name img')).toHaveAttribute('src', card.frontImageUrl)
  fireEvent.change(screen.getByLabelText('Số dòng/trang'), { target: { value: '25' } })
  expect(screen.getAllByRole('row')).toHaveLength(26)
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  expect(screen.getAllByRole('row')).toHaveLength(3)
  expect(catalogClient.save).not.toHaveBeenCalled()
})
it('keeps unsaved content when switching detail panels', async () => {
  await select()
  fireEvent.click(screen.getByRole('tab', { name: 'Nội dung' }))
  fireEvent.change(screen.getByLabelText('Định nghĩa'), { target: { value: 'Bản sửa chưa lưu' } })
  fireEvent.click(screen.getByRole('tab', { name: 'Hình ảnh' }))
  expect(screen.getByRole('tabpanel')).toHaveTextContent('URL mặt trước')
  fireEvent.click(screen.getByRole('tab', { name: 'Nội dung' }))
  expect(screen.getByLabelText('Định nghĩa')).toHaveValue('Bản sửa chưa lưu')
  expect(catalogClient.save).not.toHaveBeenCalled()
})
async function select() {
  render(<CatalogEditor />)
  await screen.findByRole('button', { name: /CX-011 · Hung hăng/ })
  fireEvent.click(screen.getByRole('button', { name: /CX-011 · Hung hăng/ }))
}
it('searches without Vietnamese accents, filters status/category and paginates without database writes', async () => {
  const cards = Array.from({ length: 27 }, (_, i) => ({ ...card, id: `qa-${i}`, code: `QA-${i}`, name: `Thẻ kiểm thử ${i}`,
    sortOrder: i, category: (i % 2 ? 'situation' : 'emotion') as typeof card.category, reviewed: i % 3 === 0 }))
  vi.mocked(catalogClient.draft).mockResolvedValue({ revision: 1, active: false, cards })
  render(<CatalogEditor />)
  await screen.findByRole('button', { name: 'QA-0 · Thẻ kiểm thử 0' })
  expect(screen.getAllByRole('row')).toHaveLength(11)
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  expect(screen.getByRole('button', { name: 'QA-10 · Thẻ kiểm thử 10' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Tìm thẻ'), { target: { value: 'kiem thu 25' } })
  expect(screen.getByRole('button', { name: 'QA-25 · Thẻ kiểm thử 25' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Lọc loại'), { target: { value: 'emotion' } })
  expect(screen.getByText('Không tìm thấy thẻ. Thử đổi từ khóa hoặc bộ lọc.')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Tìm thẻ'), { target: { value: '' } })
  fireEvent.change(screen.getByLabelText('Lọc trạng thái'), { target: { value: 'reviewed' } })
  expect(screen.getByText('5 kết quả · Trang 1/1')).toBeInTheDocument()
  expect(catalogClient.save).not.toHaveBeenCalled()
})
it('edits stable identity/metadata and renders paired PDF faces without publishing gameplay', async () => {
  await select()
  expect(screen.getByAltText('Mặt sau Hung hăng')).toHaveAttribute('src', card.backImageUrl)
  fireEvent.change(screen.getByLabelText('Tên'), { target: { value: 'Tên chỉnh sửa' } })
  fireEvent.change(screen.getByLabelText('Định nghĩa'), { target: { value: 'Nội dung đã kiểm' } })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' })) })
  expect(catalogClient.save).toHaveBeenCalledWith(expect.objectContaining({ id: card.id, name: 'Tên chỉnh sửa', reviewed: false }), 1, expect.any(String), expect.any(AbortSignal))
  expect(screen.getByRole('status')).toHaveTextContent('Chưa thay bộ thẻ')
})
it('freezes uncertain intent and retries the same request ID/card/revision after unknown outcome', async () => {
  vi.mocked(catalogClient.save).mockRejectedValueOnce(new CatalogRequestError(503)).mockResolvedValue(undefined)
  await select()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' })) })
  expect(screen.getByLabelText('Tên')).toBeDisabled()
  const first = vi.mocked(catalogClient.save).mock.calls[0]
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Thử lại đúng bản lưu' })) })
  const second = vi.mocked(catalogClient.save).mock.calls[1]
  expect(second.slice(0, 3)).toEqual(first.slice(0, 3))
})
it('rejects stale revision without discarding the local edited draft', async () => {
  vi.mocked(catalogClient.save).mockRejectedValue(new CatalogRequestError(409))
  await select()
  fireEvent.change(screen.getByLabelText('Tên'), { target: { value: 'Bản chỉnh chưa lưu' } })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' })) })
  expect(screen.getByLabelText('Tên')).toHaveValue('Bản chỉnh chưa lưu')
  expect(screen.getByRole('status')).toHaveTextContent('Catalog đã thay đổi')
})
it('blocks closing during a pending commit and cancels loading only on actual unmount', async () => {
  let resolve!: () => void
  vi.mocked(catalogClient.save).mockImplementation(() => new Promise<void>(done => { resolve = done }))
  await select()
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Về danh sách' })).toBeDisabled())
  await act(async () => { resolve() })
})
it('does not resend a confirmed commit when only the follow-up catalog refresh fails', async () => {
  vi.mocked(catalogClient.draft).mockResolvedValueOnce({ revision: 1, active: false, cards: [card] })
    .mockRejectedValueOnce(new CatalogRequestError(503))
  await select()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' })) })
  expect(catalogClient.save).toHaveBeenCalledOnce()
  expect(screen.getByRole('status')).toHaveTextContent('Đã lưu bản nháp, nhưng chưa tải lại')
  expect(screen.queryByRole('button', { name: 'Thử lại đúng bản lưu' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Tải lại danh sách' })).toBeEnabled()
})
const checkedCards = (['role', 'situation', 'emotion', 'reflection', 'selfcare'] as const).map((category, index) => ({
  ...card, id: `checked-${index}`, code: `CHECK-${index}`, category, reviewed: true, definition: 'Synthetic definition', prompt: 'Synthetic prompt',
}))
it('blocks preparing a version until every active card has content/review and all categories exist', async () => {
  render(<CatalogEditor />)
  await screen.findByRole('button', { name: /CX-011 · Hung hăng/ })
  fireEvent.click(screen.getByRole('button', { name: 'Phát hành' }))
  expect(screen.getByRole('button', { name: 'Đóng băng phiên bản đã kiểm' })).toBeDisabled()
  expect(catalogClient.snapshot).not.toHaveBeenCalled()
})
it('retries an uncertain immutable-version request verbatim and locks edits/navigation', async () => {
  vi.mocked(catalogClient.draft).mockResolvedValue({ revision: 8, active: false, cards: checkedCards })
  vi.mocked(catalogClient.snapshot).mockRejectedValueOnce(new CatalogRequestError(503)).mockResolvedValue(`catalog-${'a'.repeat(64)}`)
  render(<CatalogEditor />)
  fireEvent.click(await screen.findByRole('button', { name: 'Phát hành' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Đóng băng phiên bản đã kiểm' })).toBeEnabled())
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Đóng băng phiên bản đã kiểm' })) })
  expect(screen.getByRole('button', { name: 'Thêm thẻ' })).toBeDisabled()
  expect(screen.getByLabelText('Tìm thẻ')).toBeDisabled()
  const first = vi.mocked(catalogClient.snapshot).mock.calls[0]
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu tạo phiên bản' })) })
  expect(vi.mocked(catalogClient.snapshot).mock.calls[1].slice(0, 2)).toEqual(first.slice(0, 2))
  expect(screen.getByRole('status')).toHaveTextContent('Chưa áp dụng cho gameplay')
  expect(screen.getByRole('button', { name: 'Thêm thẻ' })).toBeEnabled()
})
it('does not retry an acknowledged version if the refresh fails afterwards', async () => {
  vi.mocked(catalogClient.draft).mockResolvedValueOnce({ revision: 8, active: false, cards: checkedCards }).mockRejectedValueOnce(new CatalogRequestError(503))
  render(<CatalogEditor />)
  fireEvent.click(await screen.findByRole('button', { name: 'Phát hành' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Đóng băng phiên bản đã kiểm' })).toBeEnabled())
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Đóng băng phiên bản đã kiểm' })) })
  expect(catalogClient.snapshot).toHaveBeenCalledOnce()
  expect(screen.getByRole('status')).toHaveTextContent('Phiên bản đã được tạo')
  expect(screen.getByRole('button', { name: 'Tải lại danh sách' })).toBeEnabled()
})
it('locks all editor writes after uncertain activation and retries the identical version/revision/request', async () => {
  const version = `catalog-${'a'.repeat(64)}`
  vi.mocked(catalogClient.releases).mockResolvedValue({ revision: 1, ready: false, snapshots: [{ version, createdAt: 1, active: false }] })
  vi.mocked(catalogClient.activate).mockRejectedValueOnce(new CatalogRequestError(503)).mockResolvedValue(undefined)
  render(<CatalogEditor />)
  fireEvent.click(await screen.findByRole('button', { name: 'Phát hành' }))
  await screen.findByLabelText('Phiên bản')
  fireEvent.change(screen.getByLabelText('Phiên bản'), { target: { value: version } })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Áp dụng cho phòng mới' })) })
  expect(screen.getByRole('button', { name: 'Thêm thẻ' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Thêm thẻ' })).toBeDisabled()
  expect(screen.getByLabelText('Phiên bản')).toBeDisabled()
  const first = vi.mocked(catalogClient.activate).mock.calls[0]
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu áp dụng' })) })
  expect(vi.mocked(catalogClient.activate).mock.calls[1].slice(0, 3)).toEqual(first.slice(0, 3))
  expect(screen.getByRole('status')).toHaveTextContent('Phòng đang chờ hoặc đang chơi vẫn giữ bộ thẻ cũ')
  expect(screen.getByRole('button', { name: 'Thêm thẻ' })).toBeEnabled()
})
