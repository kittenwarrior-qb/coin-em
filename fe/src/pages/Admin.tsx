import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CartoonButton } from '@/components/cartoon/CartoonButton'
import { CartoonModal } from '@/components/cartoon/CartoonModal'
import { adminClient, AdminRequestError, type AdminOverview, type AdminCloseCommand } from '@/features/admin/client'
import { CatalogEditor } from '@/features/admin/CatalogEditor'

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
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(true)
  const [message, setMessage] = useState('')
  const [loginVisible, setLoginVisible] = useState(false)
  const [closeCommand, setCloseCommand] = useState<AdminCloseCommand | null>(null)
  const [closeSubmitted, setCloseSubmitted] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
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
    <main className="admin-page min-h-dvh bg-[var(--c-sky-mist)] px-4 py-8 font-body text-[var(--c-blue-dark)]">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-5">
        <header>
          <a href="/" className="underline underline-offset-4">Về EmCoin</a>
          <h1 className="mt-4 font-display text-3xl">Quản trị EmCoin</h1>
          <p className="mt-2 text-sm">Quản lý catalog bản nháp, trạng thái phòng và số liệu vận hành. Không xem lời chia sẻ riêng, chỉnh Coin hay vai trò trong phòng.</p>
        </header>
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
          <CartoonButton type="submit" pending={pending}>Đăng nhập</CartoonButton>
        </form>}
        {!loginVisible && !overview && !pending && <CartoonButton onClick={() => void run('refresh')}>Thử lại</CartoonButton>}
        {overview && <>
          {catalogOpen ? <CatalogEditor onClose={() => setCatalogOpen(false)} /> :
            <CartoonButton onClick={() => setCatalogOpen(true)}>Quản lý bộ thẻ</CartoonButton>}
          <section className={panel} aria-labelledby="admin-rooms">
            <h2 id="admin-rooms" className="font-display text-2xl">Phòng hiện tại ({number(overview.rooms.length)})</h2>
            {overview.rooms.length === 0 ? <p className="mt-3">Không có phòng đang được lưu.</p> :
              <ul className="mt-3 divide-y divide-[var(--c-sky)]">
                {overview.rooms.map(room => <li key={room.id} className="py-3">
                  <p className="break-all font-semibold">Phòng {room.id}</p>
                  <p>{statusLabels[room.status]} · {number(room.seats)} người</p>
                  <p className="text-sm">Phiên bản trạng thái: {number(room.revision)}</p>
                  <CartoonButton size="md" color="pink" className="mt-2" aria-label={`Đóng phòng ${room.id}`}
                    disabled={catalogOpen}
                    onClick={() => { setCloseSubmitted(false); setMessage(''); setCloseCommand({ roomId: room.id, expectedRevision: room.revision,
                      requestId: crypto.randomUUID(), reason: 'operator-request' }) }}>Đóng phòng</CartoonButton>
                </li>)}
              </ul>}
          </section>
          <section className={panel} aria-labelledby="admin-metrics">
            <h2 id="admin-metrics" className="font-display text-2xl">Vận hành máy chủ</h2>
            <p className="mt-2 text-sm">Tổng từ khi tiến trình này khởi động; đặt lại khi khởi động lại. Không phải số người truy cập.</p>
            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-3 tabular-nums">
              <dt>Yêu cầu HTTP đã xử lý</dt><dd>{number(overview.analytics.http.completed)}</dd>
              <dt>Lỗi yêu cầu (4xx)</dt><dd>{number(overview.analytics.http.clientErrors)}</dd>
              <dt>Lỗi máy chủ (5xx)</dt><dd>{number(overview.analytics.http.serverErrors)}</dd>
            </dl>
          </section>
          <div className="flex flex-wrap justify-between gap-3">
            <CartoonButton color="teal" pending={pending} disabled={catalogOpen} onClick={() => void run('refresh')}>Làm mới</CartoonButton>
            <CartoonButton color="pink" pending={pending} disabled={catalogOpen} onClick={() => void run('logout')}>Đăng xuất</CartoonButton>
          </div>
        </>}
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
            <CartoonButton color="teal" disabled={pending} onClick={() => setCloseCommand(null)}>Hủy</CartoonButton>
            <CartoonButton color="pink" pending={pending} onClick={() => void run('close')}>Xác nhận đóng</CartoonButton>
          </div>
        </div>}
      </CartoonModal>
    </main>
  )
}
