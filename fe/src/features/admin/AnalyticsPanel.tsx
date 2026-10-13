import { useState } from 'react'
import { BarChart3, DoorOpen, Download, Eye, Gamepad2, UserRound } from 'lucide-react'
import type { AdminOverview } from './client'
import { AdminButton } from './AdminButton'
import { formatDay, formatNumber } from './format'
import { downloadTrafficCsv } from './exports'
import { TRAFFIC_RANGES, type TrafficMetric, type TrafficRange } from './insightsClient'
import { EmptyState, Panel, RankedList, Segmented, StatTile } from './ui'
import { TrendChart } from './TrendChart'
import { useTraffic } from './useInsights'

const metrics: { id: TrafficMetric; label: string; unit: string; chart: string; icon: typeof Eye }[] = [
  { id: 'visitors', label: 'Khách truy cập', unit: 'khách', chart: 'Khách truy cập mỗi ngày', icon: UserRound },
  { id: 'views', label: 'Lượt xem trang', unit: 'lượt xem', chart: 'Lượt xem trang mỗi ngày', icon: Eye },
  { id: 'rooms', label: 'Phòng được tạo', unit: 'phòng', chart: 'Phòng được tạo mỗi ngày', icon: DoorOpen },
  { id: 'games', label: 'Ván đã bắt đầu', unit: 'ván', chart: 'Ván đã bắt đầu mỗi ngày', icon: Gamepad2 },
]
const pageNames: Record<string, string> = { '/': 'Trang chơi (trang chủ)', '/game': 'Trang chơi (/game)', '/about': 'Giới thiệu',
  '/about/cards': 'Bộ thẻ (giới thiệu)', '/about/story': 'Hướng dẫn', '/cards': 'Trưng bày thẻ' }
const sourceNames: Record<string, string> = { direct: 'Trực tiếp (gõ địa chỉ, dấu trang, ứng dụng)', other: 'Trang khác' }
const deviceNames: Record<string, string> = { phone: 'Điện thoại', tablet: 'Máy tính bảng', desktop: 'Máy tính' }

export function AnalyticsPanel({ http }: { http: AdminOverview['analytics']['http'] }) {
  const [days, setDays] = useState<TrafficRange>(30)
  const [metric, setMetric] = useState<TrafficMetric>('visitors')
  const traffic = useTraffic(days)
  const report = traffic.state === 'ready' ? traffic.data : null
  const current = metrics.find(item => item.id === metric)!
  const buckets = http.durationBuckets ?? []
  const largest = Math.max(1, ...buckets.map(bucket => bucket.count))
  return <>
    <div className="admin-toolbar">
      <div><h2>Lưu lượng truy cập</h2><p>{report ? `${formatDay(report.from)} – ${formatDay(report.to)} · so với ${days} ngày liền trước` : 'Khách, lượt xem trang và hoạt động chơi theo ngày.'}</p></div>
      <div className="admin-toolbar-actions">
        <Segmented label="Khoảng thời gian" value={days} onChange={setDays} options={TRAFFIC_RANGES.map(range => ({ value: range, label: `${range} ngày` }))} />
        <AdminButton color="white" disabled={!report?.hasData} onClick={() => { if (report) downloadTrafficCsv(report) }}><Download aria-hidden="true" />Xuất CSV</AdminButton>
      </div>
    </div>
    {traffic.state === 'unavailable' && <p role="status" className="admin-notice">Chưa lấy được số liệu truy cập từ máy chủ. Bộ đếm có thể chưa được bật trên bản đang chạy; số liệu vận hành bên dưới vẫn chính xác.</p>}
    {report && !report.hasData && <p role="status" className="admin-notice">Chưa có lượt truy cập nào được đếm. Số liệu xuất hiện ngay khi có người mở trang công khai; trang quản trị không được tính.</p>}
    <div className="admin-stats">
      {metrics.map(item => <StatTile key={item.id} icon={<item.icon aria-hidden="true" />} label={item.label} selected={metric === item.id} onSelect={() => setMetric(item.id)}
        value={report ? formatNumber(report.totals[item.id]) : '—'}
        delta={report ? { current: report.totals[item.id], before: report.previous[item.id], days } : undefined}
        hint={!report ? (traffic.state === 'loading' ? 'Đang tải…' : 'Chưa có số liệu') : undefined} />)}
    </div>
    <Panel title={current.chart} description="Rê chuột hoặc dùng phím Tab vào từng ngày để xem số liệu. Bấm một ô phía trên để đổi chỉ số.">
      {report ? <>
        <TrendChart label={`${current.chart}, ${days} ngày gần nhất`} unit={current.unit}
          data={report.daily.map(day => ({ day: day.day, value: day[metric], detail: metric === 'visitors' ? `${formatNumber(day.views)} lượt xem trang` : metric === 'views' ? `${formatNumber(day.visitors)} khách` : undefined }))} />
        <details className="admin-chart-table"><summary>Xem số liệu dạng bảng</summary>
          <div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">Số liệu theo ngày</caption>
            <thead><tr><th>Ngày</th>{metrics.map(item => <th key={item.id} className="is-number">{item.label}</th>)}</tr></thead>
            <tbody>{[...report.daily].reverse().map(day => <tr key={day.day}><td>{formatDay(day.day, true)}</td>
              {metrics.map(item => <td key={item.id} className="is-number">{formatNumber(day[item.id])}</td>)}</tr>)}</tbody></table></div>
        </details>
      </> : <EmptyState icon={<BarChart3 aria-hidden="true" />} title={traffic.state === 'loading' ? 'Đang tải số liệu…' : 'Chưa có số liệu truy cập'} />}
    </Panel>
    <div className="admin-rank-grid">
      <Panel title="Trang được xem nhiều" description="Người dùng mở trang nào nhiều nhất.">
        <RankedList rows={report?.pages ?? []} unit="Lượt xem" empty="Chưa có lượt xem trong khoảng này." label={key => pageNames[key] ?? key} /></Panel>
      <Panel title="Nguồn truy cập" description="Khách đến EmCoin từ đâu, tính ở trang đầu tiên họ mở.">
        <RankedList rows={report?.sources ?? []} unit="Lượt đến" empty="Chưa có lượt đến trong khoảng này." label={key => sourceNames[key] ?? key} /></Panel>
      <Panel title="Thiết bị" description="Khách dùng gì để mở EmCoin.">
        <RankedList rows={report?.devices ?? []} unit="Khách" empty="Chưa có khách trong khoảng này." label={key => deviceNames[key] ?? key} /></Panel>
    </div>
    <Panel labelledBy="admin-metrics" title="Vận hành máy chủ" description="Tổng từ khi tiến trình này khởi động; đặt lại khi khởi động lại. Đây là số yêu cầu kỹ thuật, khác với số khách ở trên.">
      <div className="admin-ops">
        <dl className="admin-facts">
          <div><dt>Yêu cầu HTTP đã xử lý</dt><dd>{formatNumber(http.completed)}</dd></div>
          <div><dt>Lỗi yêu cầu (4xx)</dt><dd>{formatNumber(http.clientErrors)}</dd></div>
          <div><dt>Lỗi máy chủ (5xx)</dt><dd>{formatNumber(http.serverErrors)}</dd></div>
        </dl>
        <div className="admin-latency"><h3>Thời gian xử lý HTTP</h3>
          <p>Số yêu cầu trong từng khoảng, không phải tốc độ tải trang.</p>
          {buckets.map((bucket, index) => <div key={index} title={`${formatNumber(bucket.count)} yêu cầu`}>
            <span>{index === 0 ? '0' : formatNumber(buckets[index - 1].upperBoundMs ?? 0)}–{bucket.upperBoundMs === null ? '∞' : formatNumber(bucket.upperBoundMs)} ms</span>
            <span className="admin-latency-track"><i style={{ width: `${bucket.count / largest * 100}%` }} /></span>
            <strong>{formatNumber(bucket.count)}</strong></div>)}
        </div>
      </div>
    </Panel>
    <p className="admin-footnote">Số liệu do chính EmCoin đếm: không cookie, không dịch vụ bên ngoài và không lưu thông tin nhận diện cá nhân. Một “khách” là một trình duyệt trong một ngày. Robot và trang quản trị không được tính. Số liệu theo ngày được giữ 400 ngày.</p>
  </>
}
