import { useState } from 'react'
import { Activity, DoorOpen, Gamepad2, Search, UserRound, Users } from 'lucide-react'
import type { AdminOverview } from './client'
import { AdminButton } from './AdminButton'
import { formatNumber } from './format'
import { Badge, EmptyState, Panel, Segmented, StatTile, type Tone } from './ui'
import { TrendChart } from './TrendChart'
import { useTraffic } from './useInsights'

type Room = AdminOverview['rooms'][number]
type StatusFilter = 'all' | Room['status']
const statusLabels: Record<Room['status'], string> = { waiting: 'Đang chờ', playing: 'Đang chơi', ended: 'Đã kết thúc' }
const statusTones: Record<Room['status'], Tone> = { waiting: 'warning', playing: 'success', ended: 'neutral' }
const MAX_SEATS = 10

export function OverviewPanel({ overview, closeDisabled, onCloseRoom, onOpenAnalytics }: {
  overview: AdminOverview; closeDisabled: boolean; onCloseRoom: (room: Room) => void; onOpenAnalytics: () => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const traffic = useTraffic(7)
  const { rooms, analytics: { http } } = overview
  const seats = rooms.reduce((sum, room) => sum + room.seats, 0)
  const count = (value: Room['status']) => rooms.filter(room => room.status === value).length
  const matches = rooms.filter(room => room.id.toLowerCase().includes(query.trim().toLowerCase()))
  const visible = matches.filter(room => status === 'all' || room.status === status)
  const today = traffic.state === 'ready' ? traffic.data.daily[traffic.data.daily.length - 1] : null
  const failed = http.clientErrors + http.serverErrors
  return <>
    <div className="admin-stats">
      <StatTile icon={<DoorOpen aria-hidden="true" />} label="Phòng đang mở" value={formatNumber(rooms.length)} hint={`${formatNumber(count('waiting'))} phòng đang chờ người`} />
      <StatTile icon={<Gamepad2 aria-hidden="true" />} label="Phòng đang chơi" value={formatNumber(count('playing'))} hint="Ván đang diễn ra lúc này" />
      <StatTile icon={<Users aria-hidden="true" />} label="Chỗ đang tham gia" value={formatNumber(seats)} hint={rooms.length ? `Trung bình ${(seats / rooms.length).toFixed(1).replace('.', ',')} người mỗi phòng` : 'Chưa có phòng nào'} />
      <StatTile icon={<UserRound aria-hidden="true" />} label="Khách hôm nay" value={today ? formatNumber(today.visitors) : '—'}
        hint={today ? `${formatNumber(today.views)} lượt xem trang` : traffic.state === 'loading' ? 'Đang tải…' : 'Chưa có số liệu truy cập'} />
    </div>
    <div className="admin-overview-grid">
      <Panel labelledBy="admin-rooms" title={`Phòng hiện tại (${formatNumber(rooms.length)})`} description="Chỉ hiển thị mã phòng, trạng thái và số người — không có nội dung chia sẻ."
        actions={rooms.length > 0 && <Segmented label="Lọc trạng thái phòng" value={status} onChange={setStatus} options={[
          { value: 'all', label: 'Tất cả' }, { value: 'waiting', label: 'Phòng chờ' }, { value: 'playing', label: 'Trong ván' }, { value: 'ended', label: 'Kết thúc' }]} />}>
        {rooms.length === 0 ? <EmptyState icon={<DoorOpen aria-hidden="true" />} title="Không có phòng đang được lưu.">Phòng mới sẽ xuất hiện ở đây ngay khi người chơi tạo.</EmptyState> : <>
          <label className="admin-search"><span className="sr-only">Tìm mã phòng</span><Search aria-hidden="true" />
            <input type="search" placeholder="Tìm theo mã phòng" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">Phòng hiện tại</caption>
            <thead><tr><th>Mã phòng</th><th>Trạng thái</th><th>Người chơi</th><th className="is-number">Phiên bản</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>{visible.map(room => <tr key={room.id}>
              <td className="admin-code">Phòng {room.id}</td>
              <td><Badge tone={statusTones[room.status]} dot>{statusLabels[room.status]}</Badge></td>
              <td><span className="admin-seats"><meter min={0} max={MAX_SEATS} value={room.seats} aria-hidden="true" /><span>{formatNumber(room.seats)}<small>/{MAX_SEATS}</small></span></span></td>
              <td className="is-number">{formatNumber(room.revision)}</td>
              <td><AdminButton color="pink" aria-label={`Đóng phòng ${room.id}`} disabled={closeDisabled} onClick={() => onCloseRoom(room)}>Đóng phòng</AdminButton></td>
            </tr>)}
            {visible.length === 0 && matches.length > 0 && <tr><td colSpan={5} className="admin-table-empty">Không có phòng ở trạng thái này.</td></tr>}
            </tbody></table></div>
          {matches.length === 0 && <p className="admin-table-note">Không tìm thấy phòng khớp mã này.</p>}
        </>}
      </Panel>
      <div className="admin-overview-side">
        <Panel title="Khách truy cập 7 ngày" description={traffic.state === 'ready' ? `${formatNumber(traffic.data.totals.visitors)} khách · ${formatNumber(traffic.data.totals.views)} lượt xem trang` : undefined}
          actions={<AdminButton color="white" onClick={onOpenAnalytics}>Xem Analytics</AdminButton>}>
          {traffic.state === 'ready' && traffic.data.hasData ? <TrendChart compact label="Khách truy cập mỗi ngày trong 7 ngày" unit="khách"
            data={traffic.data.daily.map(day => ({ day: day.day, value: day.visitors, detail: `${formatNumber(day.views)} lượt xem trang` }))} />
            : <EmptyState icon={<Activity aria-hidden="true" />} title={traffic.state === 'loading' ? 'Đang tải số liệu…' : 'Chưa có số liệu truy cập'}>
              {traffic.state !== 'loading' && 'Số liệu xuất hiện khi có người mở trang công khai của EmCoin.'}</EmptyState>}
        </Panel>
        <Panel labelledBy="admin-metrics" title="Vận hành máy chủ" description="Tổng từ khi tiến trình này khởi động; đặt lại khi khởi động lại. Không phải số người truy cập.">
          <dl className="admin-facts">
            <div><dt>Yêu cầu HTTP đã xử lý</dt><dd>{formatNumber(http.completed)}</dd></div>
            <div><dt>Lỗi yêu cầu (4xx)</dt><dd>{formatNumber(http.clientErrors)}</dd></div>
            <div><dt>Lỗi máy chủ (5xx)</dt><dd>{http.serverErrors > 0 ? <Badge tone="danger">{formatNumber(http.serverErrors)}</Badge> : formatNumber(http.serverErrors)}</dd></div>
            <div><dt>Tỷ lệ lỗi</dt><dd>{http.completed ? `${(failed / http.completed * 100).toFixed(1).replace('.', ',')}%` : '—'}</dd></div>
          </dl>
        </Panel>
      </div>
    </div>
  </>
}
