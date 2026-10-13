import { useEffect, useRef, useState } from 'react'
import { AdminButton } from './AdminButton'
import { catalogClient, CatalogRequestError, type CatalogReleaseState } from './catalogClient'
export function CatalogPublisher({ revision, disabled, onBusy, onChanged }: {
  revision: number; disabled: boolean; onBusy: (busy: boolean) => void; onChanged: () => Promise<void>
}) {
  const [state, setState] = useState<CatalogReleaseState | null>(null), [target, setTarget] = useState('')
  const [message, setMessage] = useState(''), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false)
  const active = useRef<AbortController | null>(null)
  const intent = useRef<{ version: string | null; revision: number; requestId: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    catalogClient.releases(controller.signal).then(value => { if (!controller.signal.aborted) setState(value) })
      .catch(() => { if (!controller.signal.aborted) setMessage('Chưa tải được danh sách phiên bản. Đóng và mở lại quản lý thẻ để thử lại.') })
    return () => controller.abort()
  }, [revision])
  useEffect(() => () => { active.current?.abort() }, [])
  async function activate() {
    if (!state || active.current || disabled || (!intent.current && !target)) return
    const command = intent.current ?? { version: target === 'legacy' ? null : target, revision: state.revision, requestId: crypto.randomUUID() }
    intent.current = command
    const controller = new AbortController(); active.current = controller
    setPending(true); onBusy(true); setMessage('')
    let committed = false
    try {
      await catalogClient.activate(command.version, command.revision, command.requestId, controller.signal)
      if (controller.signal.aborted) return
      committed = true; intent.current = null; setUncertain(false)
      setMessage('Đã áp dụng cho phòng tạo mới. Phòng đang chờ hoặc đang chơi vẫn giữ bộ thẻ cũ của phòng.')
      await onChanged()
      if (!controller.signal.aborted) setTarget('')
    } catch (error) {
      if (controller.signal.aborted) return
      if (committed) { setState(null); setMessage('Đã áp dụng phiên bản, nhưng chưa tải lại được dữ liệu. Đóng và mở lại; không gửi lại yêu cầu.') }
      else if (error instanceof CatalogRequestError && [400, 401, 403, 409].includes(error.status)) {
        intent.current = null; setUncertain(false)
        setMessage('Chưa thể áp dụng. Kiểm tra liên kết vai trò, nội dung hai mặt và phiên bản nháp; đóng và mở lại nếu có người vừa sửa.')
      } else { setUncertain(true); setMessage('Chưa xác nhận được việc áp dụng. Thử lại đúng yêu cầu; không sửa phiên bản đang chờ.') }
    } finally {
      if (!controller.signal.aborted) { active.current = null; setPending(false); onBusy(!!intent.current) }
    }
  }
  return <section className="my-4 flex min-w-0 flex-col gap-3 rounded-2xl border border-[var(--brand-edge)] p-3" aria-label="Phát hành bộ thẻ">
    <h3 className="font-display text-lg">Phát hành bộ thẻ</h3>
    <p className="text-sm">Chỉ áp dụng cho phòng tạo mới. Chọn phiên bản trước để quay lại; không xóa phiên bản hay ảnh của phòng hiện có.</p>
    {message && <p role="status" className="break-words text-sm">{message}</p>}
    {state && <>
      <p className="break-all text-xs">Đang áp dụng: {state.snapshots.find(item => item.active)?.version ?? 'Bộ thẻ cũ'}</p>
      <label>Phiên bản<select className="min-h-11 w-full min-w-0 rounded-xl border bg-white px-2" value={target} disabled={disabled || pending || uncertain} onChange={event => setTarget(event.target.value)}>
        <option value="">Chọn phiên bản</option><option value="legacy">Quay về bộ thẻ cũ</option>
        {state.snapshots.map(item => <option key={item.version} value={item.version}>Phiên bản {item.version.slice(8, 20)}{item.active ? ' · đang dùng' : ''}</option>)}
      </select></label>
      <AdminButton pending={pending} disabled={disabled || (!uncertain && !target)} onClick={() => void activate()}>{uncertain ? 'Thử lại đúng yêu cầu áp dụng' : 'Áp dụng cho phòng mới'}</AdminButton>
    </>}
  </section>
}
