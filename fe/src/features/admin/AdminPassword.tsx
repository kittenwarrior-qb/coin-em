import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CartoonButton } from '@/components/cartoon/CartoonButton'
import { usePendingNavigationGuard } from '@/features/overlays/usePopupLifecycle'
import { adminClient, AdminRequestError } from './client'

export function AdminPassword({ onChanged, onBusy, onExpired }: { onChanged: () => void; onBusy: (busy: boolean) => void; onExpired: () => void }) {
  const [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false), [message, setMessage] = useState('')
  const active = useRef<AbortController | null>(null)
  usePendingNavigationGuard(pending)
  useEffect(() => { onBusy(pending) }, [pending, onBusy])
  useEffect(() => () => { active.current?.abort() }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (active.current) return
    if (next !== confirm || next === current || next.length < 15 || new TextEncoder().encode(next).length > 1024) {
      setMessage('Mật khẩu mới cần ít nhất 15 ký tự, khác mật khẩu cũ và khớp xác nhận.'); return
    }
    const controller = new AbortController(); active.current = controller
    setPending(true); setMessage(''); setCurrent(''); setNext(''); setConfirm('')
    try {
      await adminClient.changePassword(current, next, controller.signal)
      if (!controller.signal.aborted) onChanged()
    } catch (error) {
      if (controller.signal.aborted) return
      const status = error instanceof AdminRequestError ? error.status : 0
      if (status === 401) { onExpired(); return }
      setMessage(status === 400 ? 'Mật khẩu hiện tại chưa đúng hoặc mật khẩu mới không hợp lệ.' : status === 429 ? 'Đã thử quá nhiều lần. Chờ một phút rồi thử lại.' :
        'Chưa xác nhận được kết quả. Nếu phiên đã hết hạn, đăng nhập bằng mật khẩu mới trước, rồi thử mật khẩu cũ; không tự động gửi lại yêu cầu.')
    } finally { if (!controller.signal.aborted) { active.current = null; setPending(false) } }
  }
  return <section className="admin-card rounded-3xl border bg-white p-5"><h3>Đổi mật khẩu</h3>
    <p className="mb-5">Tài khoản emcoincloud@gmail.com. Đổi mật khẩu sẽ đăng xuất phiên hiện tại.</p>
    <form onSubmit={event => void submit(event)} className="flex max-w-lg flex-col gap-4">
      {([{ label: 'Mật khẩu hiện tại', value: current, setter: setCurrent, auto: 'current-password' },
        { label: 'Mật khẩu mới', value: next, setter: setNext, auto: 'new-password' },
        { label: 'Xác nhận mật khẩu mới', value: confirm, setter: setConfirm, auto: 'new-password' }] as const).map(field =>
        <label className="flex flex-col gap-2" key={field.label}>{field.label}<input type="password" autoComplete={field.auto} required maxLength={1024}
          disabled={pending} value={field.value} onChange={event => field.setter(event.target.value)} /></label>)}
      <p className="text-sm">Ít nhất 15 ký tự. Không dùng mật khẩu Gmail hoặc VPS.</p>
      {message && <p role="alert">{message}</p>}
      <CartoonButton type="submit" pending={pending}>Lưu mật khẩu mới</CartoonButton>
    </form></section>
}
