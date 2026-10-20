import { useEffect, useRef, useState } from 'react'
import { Search, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { AdminButton } from './AdminButton'
import { AdminRequestError } from './client'
import { AdminDialog, Badge, EmptyState, Panel, Segmented } from './ui'
import { reportReasons, reportStatuses, reportsClient, type ReportFilter, type ReportResolution, type ReportsPage, type SafetyReport } from './reportsClient'
import { usePendingNavigationGuard } from '@/features/overlays/usePopupLifecycle'

const time = (value: number) => new Date(value).toLocaleString('vi-VN')
export function ReportsPanel({ onBusy, onExpired }: { onBusy: (value: boolean) => void; onExpired: () => void }) {
  const [filter, setFilter] = useState<ReportFilter>('open'), [search, setSearch] = useState('')
  const [criteria, setCriteria] = useState({ query: '', offset: 0 })
  const [page, setPage] = useState<ReportsPage | null>(null), [loading, setLoading] = useState(true)
  const [error, setError] = useState(''), [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<SafetyReport | null>(null)
  const [command, setCommand] = useState<ReportResolution | null>(null), [pending, setPending] = useState(false)
  const mutation = useRef<AbortController | null>(null), mounted = useRef(true)
  const expireRef = useRef(onExpired); expireRef.current = onExpired
  usePendingNavigationGuard(pending)
  useEffect(() => { onBusy(pending || !!command) }, [pending, command, onBusy])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; mutation.current?.abort() } }, [])
  useEffect(() => {
    const controller = new AbortController()
    setPage(null); setLoading(true); setError('')
    reportsClient.list(filter, controller.signal, criteria).then(data => {
      if (!controller.signal.aborted) setPage(data)
    }).catch(reason => {
      if (controller.signal.aborted) return
      if (reason instanceof AdminRequestError && reason.status === 401) { expireRef.current(); return }
      setError(reason instanceof AdminRequestError && reason.status === 503 ? 'Báo cáo chưa được bật hoặc kho báo cáo chưa sẵn sàng. Chat không được mở từ màn hình này.' : 'Không tải được báo cáo. Kiểm tra kết nối rồi thử lại.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filter, criteria, refresh])
  async function resolve(next: ReportResolution) {
    if (mutation.current) return
    const controller = new AbortController(); mutation.current = controller
    setCommand(next); setPending(true); setError('')
    try {
      await reportsClient.resolve(next, controller.signal)
      if (!mounted.current || controller.signal.aborted) return
      setCommand(null); setSelected(null); setRefresh(value => value + 1)
    } catch (reason) {
      if (!mounted.current || controller.signal.aborted) return
      const status = reason instanceof AdminRequestError ? reason.status : 0
      if (status === 401) { setPage(null); setSelected(null); setCommand(null); expireRef.current(); return }
      if (status === 404 || status === 409 || status === 400) {
        setCommand(null); setSelected(null); setRefresh(value => value + 1)
      } else setError('Chưa xác nhận được kết quả. Dùng “Kiểm tra lại” để gửi đúng yêu cầu cũ, không tạo thao tác mới.')
    } finally { if (mounted.current && !controller.signal.aborted) { mutation.current = null; setPending(false) } }
  }
  const rows = page?.reports ?? []
  return <Panel className="admin-reports" title="Báo cáo an toàn" description="Chỉ xem tin nhắn được người chơi chọn báo cáo. Bằng chứng hết hạn sau 7 ngày kể từ lúc gửi."
    actions={<AdminButton color="white" disabled={pending || !!command || loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw aria-hidden="true" />Làm mới</AdminButton>}>
    <Segmented label="Trạng thái báo cáo" value={filter} disabled={pending || !!command} onChange={value => { setFilter(value); setCriteria(value => ({ ...value, offset: 0 })) }}
      options={[{ value: 'open', label: 'Chờ xử lý' }, { value: 'resolved', label: 'Đã xử lý' }, { value: 'dismissed', label: 'Không cần xử lý' }, { value: 'all', label: 'Tất cả' }]} />
    <form className="admin-report-search" onSubmit={event => { event.preventDefault(); if (!pending && !command) setCriteria({ query: search.trim(), offset: 0 }) }}>
      <label className="admin-search"><Search aria-hidden="true" /><span className="sr-only">Tìm báo cáo</span>
        <input type="search" placeholder="Tên người gửi, mã phòng hoặc nội dung được báo cáo…" maxLength={100} disabled={pending || !!command} value={search} onChange={event => setSearch(event.target.value)} /></label>
      <AdminButton type="submit" disabled={pending || !!command || loading}><Search aria-hidden="true" />Tìm kiếm</AdminButton>
    </form>
    {loading && <p role="status">Đang tải báo cáo…</p>}
    {error && !selected && <p role="alert" className="admin-notice is-danger">{error}</p>}
    {page && <><p className="admin-form-hint" role="status">{page.total ? `${page.offset + 1}–${page.offset + rows.length}` : '0'} / {page.total} báo cáo{criteria.query ? ' khớp tìm kiếm' : ''} · Chỉ trong bằng chứng còn hạn.</p>
      <div className="admin-reports-table"><table><thead><tr><th>Người gửi / phòng</th><th>Lý do</th><th>Thời gian</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.message.senderName}</strong><small>Phòng {row.roomId}</small></td><td>{reportReasons[row.reason]}</td>
          <td>{time(row.createdAt)}</td><td><Badge tone={row.status === 'open' ? 'warning' : 'neutral'}>{reportStatuses[row.status]}</Badge></td>
          <td><AdminButton color="white" disabled={pending || !!command} onClick={() => { setSelected(row); setError('') }}>Xem báo cáo</AdminButton></td></tr>)}</tbody></table></div>
      {!rows.length && <EmptyState icon={<ShieldCheck aria-hidden="true" />} title={criteria.query ? 'Không tìm thấy báo cáo phù hợp' : 'Không có báo cáo ở trạng thái này'} />}
      <nav className="admin-pagination" aria-label="Phân trang báo cáo"><span>50 báo cáo / trang</span><div>
        <AdminButton color="white" disabled={pending || !!command || page.offset === 0} onClick={() => setCriteria(value => ({ ...value, offset: Math.max(0, page.offset - 50) }))}><ChevronLeft aria-hidden="true" />Trang trước</AdminButton>
        <AdminButton color="white" disabled={pending || !!command || page.offset + rows.length >= page.total} onClick={() => setCriteria(value => ({ ...value, offset: page.offset + 50 }))}>Trang sau<ChevronRight aria-hidden="true" /></AdminButton>
      </div></nav></>}
    <AdminDialog open={!!selected} title="Chi tiết báo cáo" persistent={pending || !!command} onClose={() => { setSelected(null); setError('') }}>
      {selected && <div className="admin-form"><Badge tone={selected.status === 'open' ? 'warning' : 'neutral'}>{reportStatuses[selected.status]}</Badge>
        <dl className="admin-facts"><div><dt>Người gửi tin</dt><dd>{selected.message.senderName}</dd></div><div><dt>Phòng</dt><dd>{selected.roomId}</dd></div>
          <div><dt>Lý do</dt><dd>{reportReasons[selected.reason]}</dd></div><div><dt>Tin được gửi lúc</dt><dd>{time(selected.message.sentAt)}</dd></div>
          <div><dt>Bằng chứng hết hạn</dt><dd>{time(selected.expiresAt)}</dd></div></dl>
        <blockquote className="admin-report-evidence">{selected.message.text}</blockquote>
        <p className="admin-form-hint">Đánh dấu xử lý không tự chặn người chơi hoặc đóng phòng. Không xem được lịch sử trò chuyện của phòng.</p>
        {pending && <p role="status">Đang xác nhận với máy chủ…</p>}{error && <p role="alert" className="admin-notice is-danger">{error}</p>}
        <div className="admin-dialog-actions">{command ? <AdminButton pending={pending} onClick={() => void resolve(command)}>Kiểm tra lại</AdminButton> : selected.status === 'open' && <>
          <AdminButton color="white" onClick={() => void resolve({ id: selected.id, status: 'dismissed', requestId: crypto.randomUUID() })}>Không cần xử lý</AdminButton>
          <AdminButton onClick={() => void resolve({ id: selected.id, status: 'resolved', requestId: crypto.randomUUID() })}>Đánh dấu đã xử lý</AdminButton></>}</div>
      </div>}
    </AdminDialog>
  </Panel>
}
