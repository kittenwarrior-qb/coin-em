import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BarChart3, Database, ExternalLink, Layers, LayoutDashboard, LockKeyhole, LogOut, Palette, RefreshCw, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'
import { AdminButton } from '@/features/admin/AdminButton'
import { adminClient, AdminRequestError, type AdminOverview, type AdminCloseCommand } from '@/features/admin/client'
import { CatalogEditor } from '@/features/admin/CatalogEditor'
import { AdminPassword } from '@/features/admin/AdminPassword'
import { OverviewPanel } from '@/features/admin/OverviewPanel'
import { AnalyticsPanel } from '@/features/admin/AnalyticsPanel'
import { DataPanel } from '@/features/admin/DataPanel'
import { ReportsPanel } from '@/features/admin/ReportsPanel'
import { AdminDialog, Panel } from '@/features/admin/ui'
import { formatNumber } from '@/features/admin/format'
import '@/styles/adminDesktop.css'
import { ThemeChooser } from '@/features/theme/ThemeChooser'
import { useThemePreference, isPublishedTheme } from '@/features/theme/preferenceModel'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'

type Section = 'overview' | 'catalog' | 'analytics' | 'database' | 'account' | 'reports'
const groups: { title: string; items: { id: Section; label: string; icon: LucideIcon; description: string }[] }[] = [
  { title: 'Vận hành', items: [
    { id: 'overview', label: 'Tổng quan & phòng', icon: LayoutDashboard, description: 'Phòng đang mở, người tham gia và tình trạng máy chủ.' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Lưu lượng truy cập, nguồn khách và hoạt động chơi.' },
    { id: 'reports', label: 'Báo cáo an toàn', icon: ShieldCheck, description: 'Bằng chứng được người chơi chọn báo cáo và tình trạng xử lý.' }] },
  { title: 'Nội dung', items: [
    { id: 'catalog', label: 'Bộ thẻ', icon: Layers, description: 'Chỉnh sửa bản nháp, kiểm nội dung và phát hành cho phòng mới.' }] },
  { title: 'Hệ thống', items: [
    { id: 'database', label: 'Dữ liệu', icon: Database, description: 'Kho lưu trữ, dung lượng, thời hạn giữ và xuất dữ liệu.' },
    { id: 'account', label: 'Tài khoản', icon: UserRound, description: 'Mật khẩu quản trị và giao diện trên thiết bị này.' }] },
]
const sections = groups.flatMap(group => group.items)

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
  // The shell stays up while a signed-in view revalidates; privileged data does not.
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(true)
  const [message, setMessage] = useState('')
  const [loginVisible, setLoginVisible] = useState(false)
  const [closeCommand, setCloseCommand] = useState<AdminCloseCommand | null>(null)
  const [closeSubmitted, setCloseSubmitted] = useState(false)
  const [section, setSection] = useState<Section>('overview')
  const [editorBusy, setEditorBusy] = useState(false)
  const active = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  const expire = (text: string) => { setOverview(null); setAuthed(false); setLoginVisible(true); setSection('overview'); setMessage(text); setEditorBusy(false) }

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    active.current = controller
    adminClient.overview(controller.signal).then(data => {
      if (!controller.signal.aborted) { setOverview(data); setAuthed(true) }
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
    setEditorBusy(false)
    if (action === 'login' || action === 'logout') setSection('overview')
    const submittedPassword = password
    setPassword('')
    try {
      if (action === 'logout') {
        await adminClient.logout(controller.signal)
        if (!mounted.current || controller.signal.aborted) return
        setAuthed(false)
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
        setAuthed(true)
        setLoginVisible(false)
      }
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return
      if (error instanceof AdminRequestError && error.status === 401) {
        setAuthed(false); setLoginVisible(true); setCloseCommand(null); setSection('overview')
      }
      if (error instanceof AdminRequestError && (error.status === 409 || error.status === 404)) setCloseCommand(null)
      setMessage(errorMessage(error))
    } finally {
      if (mounted.current && !controller.signal.aborted) { active.current = null; setPending(false) }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void run('login') }
  const current = sections.find(item => item.id === section)!
  const blocked = editorBusy || pending
  const leave = (event: { preventDefault: () => void }) => { if (blocked) event.preventDefault() }

  return (
    <main className={`admin-page admin-desktop ${authed ? 'is-authenticated' : 'is-login'}`}>
      {authed && <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-disabled={blocked} onClick={leave}><span className="admin-brand-mark" aria-hidden="true">E</span>
          <span>EmCoin<small>Quản trị ứng dụng</small></span></a>
        <nav aria-label="Quản trị EmCoin">{groups.map(group => <div key={group.title} className="admin-nav-group"><p>{group.title}</p>
          {group.items.map(item => <button key={item.id} type="button" aria-current={section === item.id ? 'page' : undefined} disabled={blocked}
            onClick={() => { setSection(item.id); setMessage('') }}><item.icon aria-hidden="true" /><span>{item.label}</span></button>)}</div>)}</nav>
        <details className="admin-scope-info"><summary><ShieldCheck aria-hidden="true" />Phạm vi quản trị</summary>
          <p>Không xem lời chia sẻ riêng, chỉnh Coin hay vai trò trong phòng. Website emcoin.cloud được quản lý riêng.</p></details>
      </aside>}
      <div className="admin-content">
        {authed ? <header className="admin-topbar">
          <div className="admin-topbar-title"><h1>{current.label}</h1><p>{current.description}</p></div>
          <div className="admin-topbar-tools">
            {themePreference && <label className="admin-theme-switch"><Palette aria-hidden="true" /><span className="sr-only">Giao diện quản trị</span>
              <select aria-label="Giao diện quản trị" value={isPublishedTheme(controlTheme) ? controlTheme : 'emotion-orbit'} disabled={blocked}
                onChange={event => { if (isPublishedTheme(event.target.value)) themePreference.choose(event.target.value) }}>
                <option value="emotion-orbit">Vòng Cảm Xúc</option><option value="kindness-workshop">Xưởng Tử Tế</option><option value="candy-clouds">Mây Kẹo</option></select></label>}
            <a className="admin-topbar-link" href="/" aria-disabled={blocked} onClick={leave}>Về EmCoin<ExternalLink aria-hidden="true" /></a>
            <AdminButton color="white" pending={pending} disabled={editorBusy} onClick={() => void run('refresh')}><RefreshCw aria-hidden="true" />Làm mới</AdminButton>
            <AdminButton color="white" pending={pending} disabled={editorBusy} onClick={() => void run('logout')}><LogOut aria-hidden="true" />Đăng xuất</AdminButton>
          </div>
        </header> : <header className="admin-login-heading"><span className="admin-brand-mark" aria-hidden="true"><LockKeyhole /></span><h1>EmCoin Admin</h1></header>}
        <div className={`admin-workspace admin-workspace--${section} ${section === 'catalog' && overview ? 'is-catalog-workspace' : ''}`}>
          {pending && <p role="status" aria-live="polite" className="admin-loading">Đang chờ máy chủ…</p>}
          {message && !closeCommand && <p role="alert" className="admin-notice is-danger">{message}</p>}
          {loginVisible && <form onSubmit={submit} className="admin-card admin-form admin-login">
            <div><h2>Đăng nhập</h2><p>Dùng mật khẩu riêng của EmCoin, không phải mật khẩu Gmail.</p></div>
            <label>Email
              <input type="email" name="email" autoComplete="username" required maxLength={254}
                value={email} onChange={event => setEmail(event.target.value)} disabled={pending} />
            </label>
            <label>Mật khẩu EmCoin
              <input type="password" name="password" autoComplete="current-password" required maxLength={1024}
                value={password} onChange={event => setPassword(event.target.value)} disabled={pending} />
            </label>
            <AdminButton type="submit" pending={pending}>Đăng nhập</AdminButton>
          </form>}
          {!loginVisible && !overview && !pending && <div><AdminButton onClick={() => void run('refresh')}>Thử lại</AdminButton></div>}
          {authed && !overview && pending && <div className="admin-skeleton" aria-hidden="true"><i /><i /><i /><i /><b /></div>}
          {overview && <>
            {section === 'overview' && <OverviewPanel overview={overview} closeDisabled={pending} onOpenAnalytics={() => setSection('analytics')}
              onCloseRoom={room => { setCloseSubmitted(false); setMessage(''); setCloseCommand({ roomId: room.id, expectedRevision: room.revision,
                requestId: crypto.randomUUID(), reason: 'operator-request' }) }} />}
            {section === 'analytics' && <AnalyticsPanel http={overview.analytics.http} />}
            {section === 'catalog' && <CatalogEditor onBusy={setEditorBusy} />}
            {section === 'database' && <DataPanel onOpenCatalog={() => setSection('catalog')} />}
            {section === 'reports' && <ReportsPanel onBusy={setEditorBusy} onExpired={() => expire('Phiên đã hết hạn. Hãy đăng nhập lại để xem báo cáo.')} />}
            {section === 'account' && <>
              <AdminPassword onBusy={setEditorBusy} onExpired={() => expire('Phiên đã hết hạn. Nếu vừa đổi mật khẩu, hãy đăng nhập bằng mật khẩu mới.')}
                onChanged={() => expire('Đã đổi mật khẩu. Hãy đăng nhập lại bằng mật khẩu mới.')} />
              {!editorBusy && <Panel><ThemeChooser /></Panel>}
            </>}
          </>}
        </div>
      </div>
      <AdminDialog open={!!closeCommand} title="Đóng phòng?" persistent={pending} onClose={() => { if (!active.current) setCloseCommand(null) }}>
        {closeCommand && <div className="admin-form">
          <p className="admin-dialog-target">Phòng {closeCommand.roomId} · phiên bản {formatNumber(closeCommand.expectedRevision)}</p>
          <p>Toàn bộ người chơi sẽ rời phòng. Dữ liệu phòng bị xóa, không có bản lưu nội dung để khôi phục.</p>
          <label>Lý do đóng phòng
            <select disabled={pending || closeSubmitted} value={closeCommand.reason}
              onChange={event => setCloseCommand({ ...closeCommand, reason: event.target.value as AdminCloseCommand['reason'] })}>
              <option value="operator-request">Yêu cầu của quản trị viên</option>
              <option value="stuck-room">Phòng bị kẹt</option>
              <option value="safety">An toàn người chơi</option>
            </select>
          </label>
          {pending && <p role="status" className="admin-notice is-quiet">Đang xác nhận với máy chủ…</p>}
          {!pending && message && <p role="alert" className="admin-notice is-danger">{message}</p>}
          <div className="admin-dialog-actions">
            <AdminButton color="white" disabled={pending} onClick={() => setCloseCommand(null)}>Hủy</AdminButton>
            <AdminButton color="pink" pending={pending} onClick={() => void run('close')}>Xác nhận đóng</AdminButton>
          </div>
        </div>}
      </AdminDialog>
    </main>
  )
}
