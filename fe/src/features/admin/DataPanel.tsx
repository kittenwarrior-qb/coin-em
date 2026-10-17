import { useRef, useState } from 'react'
import { BarChart3, Check, Cpu, DoorOpen, Download, Layers, X } from 'lucide-react'
import { AdminButton } from './AdminButton'
import { downloadCatalogJson, downloadTrafficCsv } from './exports'
import { catalogClient } from './catalogClient'
import { formatBytes, formatDay, formatDuration, formatNumber } from './format'
import { insightsClient } from './insightsClient'
import { Badge, Panel } from './ui'
import { useSystemInfo } from './useInsights'

const stored = ['Thông tin thẻ, URL ảnh hai mặt, bản nháp và các phiên bản đã đóng băng', 'Mã phòng, trạng thái, số người — đến khi phòng bị xóa',
  'Tổng lượt truy cập theo ngày: trang, nguồn, loại thiết bị', 'Mật khẩu quản trị dưới dạng băm một chiều',
  'Khi bật chat: tin nhắn được chọn báo cáo, tối đa 7 ngày kể từ lúc gửi; chỉ quản trị viên được xem']
const notStored = ['Toàn bộ lịch sử phòng đã xóa (ngoại trừ tin nhắn được chọn báo cáo trong thời hạn trên)', 'Địa chỉ IP, cookie theo dõi hay hồ sơ người chơi',
  'Tệp ảnh thẻ (ảnh nằm ở kho ảnh, database chỉ giữ URL)', 'Bản sao lưu nội dung phòng']

export function DataPanel({ onOpenCatalog }: { onOpenCatalog: () => void }) {
  const system = useSystemInfo()
  const info = system.state === 'ready' ? system.data : null
  const [busy, setBusy] = useState<'catalog' | 'traffic' | null>(null)
  const [message, setMessage] = useState('')
  const active = useRef<AbortController | null>(null)
  async function exportFile(kind: 'catalog' | 'traffic') {
    if (active.current) return
    const controller = new AbortController(); active.current = controller
    setBusy(kind); setMessage('')
    try {
      if (kind === 'catalog') {
        const draft = await catalogClient.draft(controller.signal)
        downloadCatalogJson(draft)
        setMessage(`Đã xuất ${formatNumber(draft.cards.length)} thẻ của bản nháp ${draft.revision}.`)
      } else {
        downloadTrafficCsv(await insightsClient.traffic(90, controller.signal))
        setMessage('Đã xuất số liệu truy cập 90 ngày gần nhất.')
      }
    } catch { setMessage('Chưa xuất được dữ liệu. Kiểm tra phiên đăng nhập rồi thử lại.') }
    finally { active.current = null; setBusy(null) }
  }
  const unknown = system.state === 'loading' ? 'Đang tải…' : '—'
  return <>
    <div className="admin-toolbar"><div><h2>Kho dữ liệu</h2><p>EmCoin lưu gì, ở đâu, dung lượng bao nhiêu và giữ trong bao lâu.</p></div></div>
    {system.state === 'unavailable' && <p role="status" className="admin-notice">Chưa lấy được thông tin kho dữ liệu từ máy chủ. Các nút xuất dữ liệu vẫn dùng được nếu phiên đăng nhập còn hiệu lực.</p>}
    {message && <p role="status" className="admin-notice">{message}</p>}
    <div className="admin-store-grid">
      <Panel className="admin-store" title={<><Layers aria-hidden="true" />Bộ thẻ</>} description="SQLite · catalog.sqlite"
        actions={<Badge tone={info?.catalog ? 'success' : 'neutral'} dot>{info?.catalog ? 'Hoạt động' : info ? 'Chưa sẵn sàng' : unknown}</Badge>}>
        <dl className="admin-facts">
          <div><dt>Dung lượng</dt><dd>{info?.catalog ? formatBytes(info.catalog.bytes) : unknown}</dd></div>
          <div><dt>Số thẻ trong bản nháp</dt><dd>{info?.catalog ? `${formatNumber(info.catalog.cards)}${info.catalog.archived ? ` (${formatNumber(info.catalog.archived)} ngừng dùng)` : ''}` : unknown}</dd></div>
          <div><dt>Bản nháp hiện tại</dt><dd>{info?.catalog ? `#${formatNumber(info.catalog.revision)}` : unknown}</dd></div>
          <div><dt>Phiên bản đã đóng băng</dt><dd>{info?.catalog ? formatNumber(info.catalog.snapshots) : unknown}</dd></div>
          <div><dt>Đang dùng cho phòng mới</dt><dd>{info?.catalog ? info.catalog.activeVersion ? <code>{info.catalog.activeVersion.slice(8, 20)}</code> : 'Bộ thẻ gốc' : unknown}</dd></div>
        </dl>
        <div className="admin-store-actions"><AdminButton color="white" pending={busy === 'catalog'} disabled={busy !== null} onClick={() => void exportFile('catalog')}><Download aria-hidden="true" />Xuất bộ thẻ (JSON)</AdminButton>
          <AdminButton color="white" onClick={onOpenCatalog}>Quản lý bộ thẻ</AdminButton></div>
      </Panel>
      <Panel className="admin-store" title={<><DoorOpen aria-hidden="true" />Phòng chơi</>} description={info ? info.rooms.mode === 'redis' ? 'Redis · bộ nhớ thời gian thực' : 'Tệp JSON · chế độ dự phòng' : 'Redis'}
        actions={<Badge tone={info ? info.rooms.connected ? 'success' : 'warning' : 'neutral'} dot>{info ? info.rooms.connected ? 'Đã kết nối' : 'Dự phòng' : unknown}</Badge>}>
        <dl className="admin-facts">
          <div><dt>Phòng đang lưu</dt><dd>{info ? formatNumber(info.rooms.total) : unknown}</dd></div>
          <div><dt>Đang chờ · đang chơi · kết thúc</dt><dd>{info ? `${formatNumber(info.rooms.waiting)} · ${formatNumber(info.rooms.playing)} · ${formatNumber(info.rooms.ended)}` : unknown}</dd></div>
          <div><dt>Tự xóa khi không hoạt động</dt><dd>{info ? `${formatNumber(info.rooms.retentionMinutes)} phút` : unknown}</dd></div>
          <div><dt>Sao lưu nội dung phòng</dt><dd>Không có</dd></div>
        </dl>
        <p className="admin-store-note">Đóng phòng thủ công ở mục Tổng quan. Không có nút xóa toàn bộ để tránh ảnh hưởng ván đang chơi.</p>
      </Panel>
      <Panel className="admin-store" title={<><BarChart3 aria-hidden="true" />Lượt truy cập</>} description="SQLite · traffic.sqlite"
        actions={<Badge tone={info?.traffic ? 'success' : 'neutral'} dot>{info?.traffic ? 'Đang đếm' : info ? 'Chưa bật' : unknown}</Badge>}>
        <dl className="admin-facts">
          <div><dt>Dung lượng</dt><dd>{info?.traffic ? formatBytes(info.traffic.bytes) : unknown}</dd></div>
          <div><dt>Số dòng tổng hợp</dt><dd>{info?.traffic ? formatNumber(info.traffic.rows) : unknown}</dd></div>
          <div><dt>Có số liệu từ</dt><dd>{info?.traffic ? info.traffic.firstDay ? formatDay(info.traffic.firstDay, true) : 'Chưa có' : unknown}</dd></div>
          <div><dt>Giữ số liệu theo ngày</dt><dd>{info?.traffic ? `${formatNumber(info.traffic.retentionDays)} ngày` : unknown}</dd></div>
          <div><dt>Mã băm chống đếm trùng</dt><dd>{info?.traffic ? `Xóa sau ${formatNumber(info.traffic.visitorHashDays)} ngày` : unknown}</dd></div>
        </dl>
        <div className="admin-store-actions"><AdminButton color="white" pending={busy === 'traffic'} disabled={busy !== null || !info?.traffic} onClick={() => void exportFile('traffic')}><Download aria-hidden="true" />Xuất 90 ngày (CSV)</AdminButton></div>
      </Panel>
    </div>
    <div className="admin-data-grid">
      <Panel title={<><Cpu aria-hidden="true" />Tiến trình máy chủ</>} description="Trạng thái của bản backend đang chạy.">
        <dl className="admin-facts">
          <div><dt>Thời gian chạy liên tục</dt><dd>{info ? formatDuration(info.process.uptimeSeconds) : unknown}</dd></div>
          <div><dt>Bộ nhớ đang dùng</dt><dd>{info ? formatBytes(info.process.memoryBytes) : unknown}</dd></div>
          <div><dt>Môi trường</dt><dd>{info ? info.process.environment === 'production' ? 'Production' : 'Development' : unknown}</dd></div>
          <div><dt>Node.js</dt><dd>{info ? info.process.node : unknown}</dd></div>
        </dl>
      </Panel>
      <Panel title="Chính sách dữ liệu" description="Phạm vi này cố định trong mã nguồn, trang quản trị không thay đổi được.">
        <div className="admin-policy">
          <div><h3>Có lưu</h3><ul>{stored.map(item => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul></div>
          <div><h3>Không lưu</h3><ul className="is-excluded">{notStored.map(item => <li key={item}><X aria-hidden="true" />{item}</li>)}</ul></div>
        </div>
      </Panel>
    </div>
  </>
}
