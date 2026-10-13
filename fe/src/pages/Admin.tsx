import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AdminButton } from '@/features/admin/AdminButton'
import { CartoonModal } from '@/components/cartoon/CartoonModal'
import { adminClient, AdminRequestError, type AdminOverview, type AdminCloseCommand } from '@/features/admin/client'
import { CatalogEditor } from '@/features/admin/CatalogEditor'
import { BrandIcon, type BrandIconName } from '@/components/cartoon/BrandIcon'
import { AdminPassword } from '@/features/admin/AdminPassword'
import '@/styles/adminDesktop.css'
import { ThemeChooser } from '@/features/theme/ThemeChooser'
import { useThemePreference, isPublishedTheme } from '@/features/theme/preferenceModel'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'

type Section = 'overview' | 'catalog' | 'analytics' | 'database' | 'account'
const sections: { id: Section; label: string; icon: BrandIconName }[] = [
  { id: 'overview', label: 'Tổng quan & phòng', icon: 'rooms' },
  { id: 'catalog', label: 'Bộ thẻ', icon: 'cards' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'database', label: 'Dữ liệu', icon: 'database' },
  { id: 'account', label: 'Tài khoản', icon: 'lock' },
]

const statusLabels = { waiting: 'Đang chờ', playing: 'Đang chơi', ended: 'Đã kết thúc' }
const number = (value: number) => value.toLocaleString('vi-VN')
const panel = 'admin-card rounded-3xl border-2 border-[var(--c-blue)] bg-white p-5 shadow-sm'

function errorMessage(error: unknown): string {
  const status = error instanceof AdminRequestError ? error.status : 0
  if (status === 401) return 'Email hoặc mật khẩu không đúng, hoặc phiên đăng nhập đã hết hạn.'
  if (status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một phút rồi thử lại.'
  if (status === 503) return 'Admin chưa được cấu hình hoặc máy chủ đang không sẵn sàng.'
  if (status === 403) return 'Yêu cầu không được phép. Hãy mở admin trên địa chỉ HTTPS chính thức.'
  if (status === 409) return 'Phòng đã thay đổi hoặc yêu cầu không còn khớp. Hãy làm mới rồi xác nhận lại.'
  if (status === 404) return 'Phòng không còn tồn tại. Hãy làm mới danh sách phòng.'
  return 'Không thể xác nhận kết quả từ máy chủ. Vui lòng thử lại khi kết nối ổn định.'
}

export default function Admin() {
  const themePreference = useThemePreference()
  const controlTheme = useControlTheme()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(true)
  const [message, setMessage] = useState('')
  const [loginVisible, setLoginVisible] = useState(false)
  const [closeCommand, setCloseCommand] = useState<AdminCloseCommand | null>(null)
  const [closeSubmitted, setCloseSubmitted] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [section, setSection] = useState<Section>('overview')
  const [editorBusy, setEditorBusy] = useState(false)
  const [roomFilter, setRoomFilter] = useState('')
  const active = useRef<AbortController | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    active.current = controller
    adminClient.overview(controller.signal).then(data => {
      if (!controller.signal.aborted) setOverview(data)
    }).catch(error => {
      if (controller.signal.aborted) return
      if (error instanceof AdminRequestError && error.status === 401) setLoginVisible(true)
      else setMessage(errorMessage(error))
    }).finally(() => {
      if (!controller.signal.aborted) { active.current = null; setPending(false) }
    })
    return () => { mounted.current = false; controller.abort(); active.current?.abort() }
  }, [])

  async function run(action: 'login' | 'refresh' | 'logout' | 'close') {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    setPending(true)
    setMessage('')
    // Do not leave the last privileged snapshot visible while revalidating the session.
    setOverview(null)
    setCatalogOpen(false)
    setSection('overview')
    const submittedPassword = password
    setPassword('')
    try {
      if (action === 'logout') {
        await adminClient.logout(controller.signal)
        if (!mounted.current || controller.signal.aborted) return
        setLoginVisible(true)
        setEmail('')
      } else {
        if (action === 'login') await adminClient.login(email, submittedPassword, controller.signal)
        if (action === 'close') {
          if (!closeCommand) return
          setCloseSubmitted(true)
          await adminClient.closeRoom(closeCommand, controller.signal)
          if (!mounted.current || controller.signal.aborted) return
          setCloseCommand(null)
        }
        const data = await adminClient.overview(controller.signal)
        if (!mounted.current || controller.signal.aborted) return
        setOverview(data)
        setLoginVisible(false)
      }
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return
      if (error instanceof AdminRequestError && error.status === 401) {
        setLoginVisible(true); setCloseCommand(null)
      }
      if (error instanceof AdminRequestError && (error.status === 409 || error.status === 404)) setCloseCommand(null)
      setMessage(errorMessage(error))
    } finally {
      if (mounted.current && !controller.signal.aborted) { active.current = null; setPending(false) }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void run('login') }

  return (
    <main className={`admin-page admin-desktop ${overview ? 'is-authenticated' : ''} min-h-dvh font-body text-[var(--c-blue-dark)]`}>
      {overview && <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-disabled={editorBusy || pending} onClick={event => { if (editorBusy || pending) event.preventDefault() }}>EmCoin<span>Quản trị ứng dụng</span></a>
        <nav aria-label="Quản trị EmCoin">{sections.map(item => <button key={item.id} type="button"
          aria-current={section === item.id ? 'page' : undefined} disabled={editorBusy || pending}
          onClick={() => { setSection(item.id); setCatalogOpen(item.id === 'catalog'); setMessage('') }}>
          <BrandIcon name={item.icon} /><span>{item.label}</span>
        </button>)}</nav>
        <p>app.emcoin.cloud<br />Chỉ quản trị ứng dụng chơi.</p>
      </aside>}
      <div className="admin-content flex w-full flex-col">
        <header className="admin-topbar">
          <div className="admin-topbar-tools">
          {themePreference && <label className="admin-theme-switch"><BrandIcon name="settings" /><span className="sr-only">Giao diện quản trị</span><select aria-label="Giao diện quản trị" value={isPublishedTheme(controlTheme) ? controlTheme : 'emotion-orbit'} disabled={pending}
            onChange={event => { if (isPublishedTheme(event.target.value)) themePreference.choose(event.target.value) }}><option value="emotion-orbit">Vòng Cảm Xúc</option><option value="kindness-workshop">Xưởng Tử Tế</option></select></label>}
          <a href="/" aria-disabled={editorBusy || pending} onClick={event => { if (editorBusy || pending) event.preventDefault() }} className="underline underline-offset-4">Về EmCoin</a>
          </div>
          <h1 className="mt-4 font-display text-3xl">Quản trị EmCoin</h1>
          <p className="mt-2 text-sm">Không xem lời chia sẻ riêng, chỉnh Coin hay vai trò trong phòng. Website emcoin.cloud được quản lý riêng.</p>
        </header>
        <div className="admin-workspace">
        {pending && <p role="status" aria-live="polite">Đang chờ máy chủ…</p>}
        {message && !closeCommand && <p role="alert" className={`${panel} text-[var(--c-red-dark)]`}>{message}</p>}
        {loginVisible && <form onSubmit={submit} className={`${panel} flex flex-col gap-4`}>
          <h2 className="font-display text-2xl">Đăng nhập</h2>
          <p className="text-sm">Dùng mật khẩu riêng của EmCoin, không phải mật khẩu Gmail.</p>
          <label className="flex flex-col gap-1">Email
            <input type="email" name="email" autoComplete="username" required maxLength={254}
              value={email} onChange={event => setEmail(event.target.value)} disabled={pending}
              className="min-h-12 w-full rounded-xl border-2 border-[var(--c-blue)] px-3" />
          </label>
          <label className="flex flex-col gap-1">Mật khẩu EmCoin
            <input type="password" name="password" autoComplete="current-password" required maxLength={1024}
              value={password} onChange={event => setPassword(event.target.value)} disabled={pending}
              className="min-h-12 w-full rounded-xl border-2 border-[var(--c-blue)] px-3" />
          </label>
          <AdminButton type="submit" pending={pending}>Đăng nhập</AdminButton>
        </form>}
        {!loginVisible && !overview && !pending && <AdminButton onClick={() => void run('refresh')}>Thử lại</AdminButton>}
        {overview && <>
          <div className="admin-toolbar"><h2>{sections.find(item => item.id === section)?.label}</h2>
            <div className="flex gap-3"><AdminButton color="teal" size="md" pending={pending} disabled={editorBusy} onClick={() => void run('refresh')}>Làm mới</AdminButton>
            <AdminButton color="white" size="md" pending={pending} disabled={editorBusy} onClick={() => void run('logout')}>Đăng xuất</AdminButton></div>
          </div>
          {section === 'overview' && <div className="admin-stats"><article><span>Phòng hiện tại</span><strong>{number(overview.rooms.length)}</strong></article>
            <article><span>Chỗ đang tham gia</span><strong>{number(overview.rooms.reduce((sum, room) => sum + room.seats, 0))}</strong></article>
            <article><span>Phòng đang chơi</span><strong>{number(overview.rooms.filter(room => room.status === 'playing').length)}</strong></article></div>}
          {catalogOpen && <CatalogEditor onBusy={setEditorBusy} onClose={() => { setEditorBusy(false); setCatalogOpen(false); setSection('overview') }} />}
          {section === 'account' && <AdminPassword onBusy={setEditorBusy} onExpired={() => { setOverview(null); setLoginVisible(true); setSection('overview'); setMessage('Phiên đã hết hạn. Nếu vừa đổi mật khẩu, hãy đăng nhập bằng mật khẩu mới.'); setEditorBusy(false) }} onChanged={() => { setOverview(null); setLoginVisible(true); setSection('overview'); setMessage('Đã đổi mật khẩu. Hãy đăng nhập lại bằng mật khẩu mới.'); setEditorBusy(false) }} />}
          {section === 'account' && !editorBusy && <section className={panel}><ThemeChooser /></section>}
          {section === 'database' && <section className={panel} aria-label="Quản lý dữ liệu">
            <h3>Các loại dữ liệu</h3><dl className="admin-data-list"><dt>Bộ thẻ · SQLite</dt><dd>Thông tin thẻ, URL hai mặt, bản nháp và phiên bản đã kiểm. Ảnh không lưu trực tiếp trong database.</dd>
              <dt>Phòng chơi · Redis</dt><dd>Xóa sau 1 giờ không hoạt động. Không lưu nội dung phòng đã xóa và không có backup nội dung.</dd>
              <dt>Số liệu vận hành</dt><dd>Bộ đếm trong tiến trình; đặt lại khi máy chủ khởi động lại. Không theo dõi lời chia sẻ cá nhân.</dd></dl>
            <AdminButton onClick={() => { setSection('catalog'); setCatalogOpen(true) }}>Quản lý bộ thẻ</AdminButton>
            <p className="mt-4 text-sm">Không cung cấp SQL hoặc nút xóa toàn bộ dữ liệu để tránh ảnh hưởng phòng đang chơi.</p>
          </section>}
          {section === 'overview' && <section className={panel} aria-labelledby="admin-rooms">
            <h2 id="admin-rooms" className="font-display text-2xl">Phòng hiện tại ({number(overview.rooms.length)})</h2>
            <label className="admin-search">Tìm mã phòng<input type="search" value={roomFilter} onChange={event => setRoomFilter(event.target.value)} /></label>
            {overview.rooms.length === 0 ? <p className="mt-3">Không có phòng đang được lưu.</p> :
              <div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">Phòng hiện tại</caption><thead><tr><th>Mã phòng</th><th>Trạng thái</th><th>Người chơi</th><th>Phiên bản</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>
                {overview.rooms.filter(room => room.id.toLowerCase().includes(roomFilter.toLowerCase())).map(room => <tr key={room.id}>
                  <td className="admin-code">Phòng {room.id}</td>
                  <td><span className="admin-status">{statusLabels[room.status]}</span></td>
                  <td>{number(room.seats)}</td><td>{number(room.revision)}</td><td>
                  <AdminButton size="md" color="pink" className="mt-2" aria-label={`Đóng phòng ${room.id}`}
                    disabled={catalogOpen}
                    onClick={() => { setCloseSubmitted(false); setMessage(''); setCloseCommand({ roomId: room.id, expectedRevision: room.revision,
                      requestId: crypto.randomUUID(), reason: 'operator-request' }) }}>Đóng phòng</AdminButton>
                  </td></tr>)}
              </tbody></table></div>}
            {overview.rooms.length > 0 && !overview.rooms.some(room => room.id.toLowerCase().includes(roomFilter.toLowerCase())) && <p>Không tìm thấy phòng khớp mã này.</p>}
          </section>}
          {(section === 'analytics' || section === 'overview') && <section className={panel} aria-labelledby="admin-metrics">
            <h2 id="admin-metrics" className="font-display text-2xl">Vận hành máy chủ</h2>
            <p className="mt-2 text-sm">Tổng từ khi tiến trình này khởi động; đặt lại khi khởi động lại. Không phải số người truy cập.</p>
            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-3 tabular-nums">
              <dt>Yêu cầu HTTP đã xử lý</dt><dd>{number(overview.analytics.http.completed)}</dd>
              <dt>Lỗi yêu cầu (4xx)</dt><dd>{number(overview.analytics.http.clientErrors)}</dd>
              <dt>Lỗi máy chủ (5xx)</dt><dd>{number(overview.analytics.http.serverErrors)}</dd>
            </dl>
            {section === 'analytics' && <div className="admin-latency"><h3>Thời gian xử lý HTTP</h3>
              <p className="text-sm">Số yêu cầu trong từng khoảng, không phải tốc độ tải trang.</p>
              {overview.analytics.http.durationBuckets?.map((bucket, i, buckets) => <div key={i}><span>{i === 0 ? '0' : buckets[i - 1].upperBoundMs}–{bucket.upperBoundMs ?? '∞'} ms</span><meter min={0} max={Math.max(1, overview.analytics.http.completed)} value={bucket.count} /><strong>{number(bucket.count)}</strong></div>)}
            </div>}
          </section>}
        </>}
        </div>
      </div>
      <CartoonModal open={!!closeCommand} title="Đóng phòng?" persistent={pending} hideClose={pending}
        onClose={() => { if (!active.current) setCloseCommand(null) }}>
        {closeCommand && <div className="flex flex-col gap-4 text-[var(--c-blue-dark)]">
          <p className="break-all">Phòng {closeCommand.roomId} · phiên bản {number(closeCommand.expectedRevision)}</p>
          <p>Toàn bộ người chơi sẽ rời phòng. Dữ liệu phòng bị xóa, không có bản lưu nội dung để khôi phục.</p>
          <label className="flex flex-col gap-1">Lý do đóng phòng
            <select disabled={pending || closeSubmitted} value={closeCommand.reason}
              onChange={event => setCloseCommand({ ...closeCommand, reason: event.target.value as AdminCloseCommand['reason'] })}
              className="min-h-12 rounded-xl border-2 border-[var(--c-blue)] bg-white px-2">
              <option value="operator-request">Yêu cầu của quản trị viên</option>
              <option value="stuck-room">Phòng bị kẹt</option>
              <option value="safety">An toàn người chơi</option>
            </select>
          </label>
          {pending && <p role="status">Đang xác nhận với máy chủ…</p>}
          {!pending && message && <p role="alert">{message}</p>}
          <div className="flex flex-wrap justify-between gap-3">
            <AdminButton color="teal" disabled={pending} onClick={() => setCloseCommand(null)}>Hủy</AdminButton>
            <AdminButton color="pink" pending={pending} onClick={() => void run('close')}>Xác nhận đóng</AdminButton>
          </div>
        </div>}
      </CartoonModal>
    </main>
  )
}
