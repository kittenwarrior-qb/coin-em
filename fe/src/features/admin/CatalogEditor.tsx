import { useEffect, useId, useRef, useState } from 'react'
import { AdminButton } from './AdminButton'
import { usePendingNavigationGuard } from '@/features/overlays/usePopupLifecycle'
import { catalogClient, CatalogRequestError, isCatalogImageUrl, type CatalogCard, type CatalogDraft } from './catalogClient'
import { CatalogPublisher } from './CatalogPublisher'

const labels = { role: 'Vai trò', situation: 'Tình huống', emotion: 'Cảm xúc', reflection: 'Phản tư', selfcare: 'Bí kíp tự ôm' }
const field = 'min-h-11 w-full rounded-xl border border-[var(--brand-edge)] bg-white px-3 text-[var(--brand-ink)]'
export function CatalogEditor({ onClose, onBusy }: { onClose: () => void; onBusy?: (busy: boolean) => void }) {
  const fieldId = useId()
  const [draft, setDraft] = useState<CatalogDraft | null>(null)
  const [card, setCard] = useState<CatalogCard | null>(null)
  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [editorTab, setEditorTab] = useState('metadata')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const active = useRef<AbortController | null>(null)
  const intent = useRef<{ card: CatalogCard; revision: number; requestId: string } | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const snapshotIntent = useRef<{ revision: number; requestId: string } | null>(null)
  const [snapshotUncertain, setSnapshotUncertain] = useState(false)
  const [releaseBusy, setReleaseBusy] = useState(false)
  const locked = pending || uncertain || snapshotUncertain || releaseBusy
  useEffect(() => { onBusy?.(locked || card !== null) }, [locked, card, onBusy])
  usePendingNavigationGuard(locked || card !== null)
  useEffect(() => {
    if (!locked && !card) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [locked, card])
  useEffect(() => {
    const controller = new AbortController()
    active.current = controller
    setPending(true)
    catalogClient.draft(controller.signal).then(data => { if (!controller.signal.aborted) setDraft(data) })
      .catch(() => { if (!controller.signal.aborted) setMessage('Không tải được catalog. Kiểm tra phiên đăng nhập rồi mở lại.') })
      .finally(() => { if (!controller.signal.aborted) { active.current = null; setPending(false) } })
    return () => { controller.abort(); active.current?.abort() }
  }, [])
  async function save() {
    if (!card || !draft || active.current || snapshotUncertain) return
    const command = intent.current ?? { card: { ...card }, revision: draft.revision, requestId: crypto.randomUUID() }
    intent.current = command
    const controller = new AbortController()
    active.current = controller; setPending(true); setMessage('')
    let committed = false
    try {
      await catalogClient.save(command.card, command.revision, command.requestId, controller.signal)
      if (controller.signal.aborted) return
      committed = true
      intent.current = null; setUncertain(false)
      const latest = await catalogClient.draft(controller.signal)
      if (controller.signal.aborted) return
      setDraft(latest); setCard(latest.cards.find(item => item.id === card.id) ?? null)
      setMessage('Đã lưu bản nháp. Chưa thay bộ thẻ trong phòng chơi.')
    } catch (error) {
      if (controller.signal.aborted) return
      if (committed) {
        setUncertain(false); setDraft(null); setCard(null)
        setMessage('Đã lưu bản nháp, nhưng chưa tải lại được danh sách. Đóng và mở lại quản lý thẻ để lấy bản mới; không cần gửi lại bản lưu.')
      } else if (error instanceof CatalogRequestError && [400, 401, 403, 409].includes(error.status)) {
        intent.current = null; setUncertain(false)
        if (error.status === 409) setMessage('Catalog đã thay đổi hoặc mã thẻ bị trùng. Đóng và mở lại để lấy bản mới; bản nháp của bạn vẫn đang hiển thị.')
        else setMessage('Không được phép lưu hoặc dữ liệu chưa hợp lệ. Kiểm tra mã thẻ, URL ảnh và phiên đăng nhập.')
      } else { setUncertain(true); setMessage('Chưa xác nhận được kết quả. Thử lại đúng bản lưu này để tránh lưu hai lần.') }
    } finally { if (!controller.signal.aborted) { active.current = null; setPending(false) } }
  }
  async function prepareSnapshot() {
    if (!draft || card || active.current || uncertain || releaseBusy) return
    const command = snapshotIntent.current ?? { revision: draft.revision, requestId: crypto.randomUUID() }
    snapshotIntent.current = command
    const controller = new AbortController()
    active.current = controller; setPending(true); setMessage('')
    let committed = false
    try {
      const version = await catalogClient.snapshot(command.revision, command.requestId, controller.signal)
      if (controller.signal.aborted) return
      committed = true; snapshotIntent.current = null; setSnapshotUncertain(false)
      setMessage(`Đã đóng băng phiên bản ${version}. Chưa áp dụng cho gameplay.`)
      const latest = await catalogClient.draft(controller.signal)
      if (!controller.signal.aborted) setDraft(latest)
    } catch (error) {
      if (controller.signal.aborted) return
      if (committed) {
        setDraft(null); setMessage('Phiên bản đã được tạo. Chưa tải lại được catalog; đóng và mở lại, không cần tạo lại.')
      } else if (error instanceof CatalogRequestError && [400, 401, 403, 409].includes(error.status)) {
        snapshotIntent.current = null; setSnapshotUncertain(false)
        setMessage('Chưa thể tạo phiên bản. Kiểm tra nội dung, trạng thái đã kiểm và tải lại bản nháp nếu có người vừa sửa.')
      } else {
        setSnapshotUncertain(true); setMessage('Chưa xác nhận được việc tạo phiên bản. Thử lại đúng yêu cầu để tránh tạo hai lần.')
      }
    } finally { if (!controller.signal.aborted) { active.current = null; setPending(false) } }
  }
  const patch = (value: Partial<CatalogCard>) => { if (card && !pending && !uncertain) setCard({ ...card, ...value }) }
  const unchecked = draft?.cards.filter(item => !item.archived && (!item.reviewed ||
    (item.category === 'role' || item.category === 'emotion' ? !item.definition.trim() : !item.prompt.trim()))) ?? []
  const missingCategory = Object.keys(labels).some(category => !draft?.cards.some(item => !item.archived && item.category === category))
  const normalize = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  const filtered = (draft?.cards ?? []).filter(item => normalize(`${item.code} ${item.name}`).includes(normalize(filter.trim())) &&
    (categoryFilter === 'all' || item.category === categoryFilter) && (reviewFilter === 'all' ||
      (reviewFilter === 'archived' ? item.archived : !item.archived && (reviewFilter === 'reviewed' ? item.reviewed : !item.reviewed))))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)), page = Math.min(pageIndex, pages - 1)
  return <section className={`admin-card admin-catalog ${card ? 'is-editing' : ''}`} aria-labelledby="catalog-title">
    <h2 id="catalog-title" className="font-display text-2xl">Quản lý bộ thẻ</h2>
    <p className="admin-catalog-caption">Sửa bản nháp; chỉ áp dụng cho phòng mới sau khi phát hành.</p>
    {pending && <p role="status">Đang chờ catalog…</p>}
    {message && <p role="status" className="my-3 break-words">{message}</p>}
    {draft && <>
      <div className="admin-catalog-summary"><p>{draft.cards.length} thẻ · bản nháp {draft.revision}</p>
      <p>{unchecked.length} thẻ còn thiếu nội dung hoặc chưa kiểm.{missingCategory ? ' Chưa đủ năm loại thẻ.' : ''}</p></div>
      {!card && <details className="admin-release-details" open={snapshotUncertain || releaseBusy || undefined}><summary>Phiên bản và phát hành</summary>
      <AdminButton className="mb-3 mt-3" pending={pending} disabled={releaseBusy || uncertain || (!snapshotUncertain && (unchecked.length > 0 || missingCategory))}
        onClick={() => void prepareSnapshot()}>{snapshotUncertain ? 'Thử lại đúng yêu cầu tạo phiên bản' : 'Đóng băng phiên bản đã kiểm'}</AdminButton>
      <CatalogPublisher revision={draft.revision} disabled={pending || uncertain || snapshotUncertain} onBusy={setReleaseBusy}
        onChanged={async () => { const latest = await catalogClient.draft(new AbortController().signal); setDraft(latest) }} />
      </details>}
      {!card && <><div className="admin-table-filters"><label>Tìm thẻ<input className={field} type="search" placeholder="Mã hoặc tên thẻ" value={filter} onChange={event => { setFilter(event.target.value); setPageIndex(0) }} disabled={locked} /></label>
        <label>Lọc loại<select disabled={locked} value={categoryFilter} onChange={event => { setCategoryFilter(event.target.value); setPageIndex(0) }}><option value="all">Tất cả loại</option>{Object.entries(labels).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
        <label>Lọc trạng thái<select disabled={locked} value={reviewFilter} onChange={event => { setReviewFilter(event.target.value); setPageIndex(0) }}><option value="all">Tất cả trạng thái</option><option value="reviewed">Đã kiểm</option><option value="unchecked">Chưa kiểm</option><option value="archived">Ngừng dùng</option></select></label>
      </div><div className="admin-table-scroll" aria-label="Danh sách thẻ" tabIndex={0}>
        <table className="admin-table"><caption className="sr-only">Bộ thẻ bản nháp</caption><thead><tr><th>Mã thẻ</th><th>Tên</th><th>Loại</th><th>Thứ tự</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>
        {filtered.slice(page * pageSize, page * pageSize + pageSize).map(item => <tr key={item.id}><td className="admin-code">{item.code}</td><td><div className="admin-card-name">{isCatalogImageUrl(item.frontImageUrl) ? <img src={item.frontImageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className="admin-thumb-placeholder" aria-hidden="true">{item.code.slice(0, 2)}</span>}<span>{item.name}</span></div></td><td>{labels[item.category]}</td><td>{item.sortOrder}</td>
          <td><span className={`admin-status ${item.archived ? 'is-archived' : item.reviewed ? 'is-reviewed' : 'is-unchecked'}`}>{item.archived ? 'Ngừng dùng' : item.reviewed ? 'Đã kiểm' : 'Chưa kiểm'}</span></td>
          <td><AdminButton color="white" disabled={locked} aria-label={`${item.code} · ${item.name}`} onClick={() => { setCard({ ...item }); setEditorTab('metadata'); setMessage('') }}>Sửa</AdminButton></td></tr>)}
        {filtered.length === 0 && <tr><td colSpan={6} className="admin-table-empty">Không tìm thấy thẻ. Thử đổi từ khóa hoặc bộ lọc.</td></tr>}
        </tbody></table></div><div className="admin-pagination"><p>{filtered.length} kết quả · Trang {page + 1}/{pages}</p><label>Số dòng/trang<select aria-label="Số dòng/trang" value={pageSize} disabled={locked} onChange={event => { setPageSize(Number(event.target.value)); setPageIndex(0) }}>{[10, 25, 50, 80].map(size => <option key={size} value={size}>{size}</option>)}</select></label><div><AdminButton color="white" disabled={locked || page === 0} onClick={() => setPageIndex(page - 1)}>Trang trước</AdminButton><AdminButton color="white" disabled={locked || page + 1 >= pages} onClick={() => setPageIndex(page + 1)}>Trang sau</AdminButton></div></div></>}
      {!card && <AdminButton disabled={locked} onClick={() => { setEditorTab('metadata'); setCard({ id: crypto.randomUUID(), code: 'NEW-001', name: 'Thẻ mới',
        category: 'situation', group: 'light', definition: '', prompt: '', sortOrder: draft.cards.length,
        frontImageUrl: '', backImageUrl: '', sourcePages: [], reviewed: false, archived: false }) }}>Thêm thẻ</AdminButton>}
    </>}
    {card && <div className="admin-card-editor flex flex-col gap-3">
      <p className="break-all text-xs">ID: {card.id} · {labels[card.category]} · Trang nguồn: {card.sourcePages.join(' / ') || 'Thẻ thêm mới'}</p>
      <div className="admin-editor-tabs" role="tablist" aria-label="Chi tiết thẻ">{[['metadata', 'Thông tin'], ['content', 'Nội dung'], ['images', 'Hình ảnh']].map(([id, title]) => <button type="button" role="tab" key={id} id={`${fieldId}-tab-${id}`} aria-controls={`${fieldId}-panel-${id}`} aria-selected={editorTab === id} onClick={() => setEditorTab(id)}>{title}</button>)}</div>
      <div className="admin-editor-body">
      <fieldset disabled={pending || uncertain} className="admin-catalog-fields flex min-w-0 flex-col gap-3">
        <div className="admin-field-panel" role="tabpanel" id={`${fieldId}-panel-metadata`} aria-labelledby={`${fieldId}-tab-metadata`} hidden={editorTab !== 'metadata'}>
        <label>Mã thẻ<input className={field} maxLength={64} value={card.code} onChange={event => patch({ code: event.target.value })} /></label>
        <label>Tên<input className={field} maxLength={160} value={card.name} onChange={event => patch({ name: event.target.value, reviewed: false })} /></label>
        <label>Thứ tự<input className={field} type="number" min={0} max={10000} step={1} value={card.sortOrder} onChange={event => patch({ sortOrder: Number(event.target.value) })} /></label>
        <label>Loại<select className={field} value={card.category} onChange={event => patch({ category: event.target.value as CatalogCard['category'], reviewed: false })}>
          {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Nhóm<input className={field} maxLength={64} value={card.group} onChange={event => patch({ group: event.target.value, reviewed: false })} /></label>
        {card.category === 'role' && <label>Vai trò gameplay<select className={field} value={card.roleKey ?? ''} onChange={event => patch({ roleKey: event.target.value, reviewed: false })}>
          <option value="">Chưa liên kết</option>
          {Object.entries({ narrator: 'Người Quản trò', sender: 'Người Trao Gửi', silencer: 'Người Im Lặng', connector: 'Người Kết Nối', opener: 'Người Gợi Mở', guide: 'Người Dẫn Lối', healer: 'Người Chữa Lành' }).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>}
        <label className="admin-check"><input type="checkbox" checked={card.reviewed} onChange={event => patch({ reviewed: event.target.checked })} />Đã kiểm nội dung và cặp mặt</label>
        <label className="admin-check"><input type="checkbox" checked={card.archived} onChange={event => patch({ archived: event.target.checked })} />Ngừng dùng trong bộ mới</label>
        </div>
        <div className="admin-field-panel" role="tabpanel" id={`${fieldId}-panel-content`} aria-labelledby={`${fieldId}-tab-content`} hidden={editorTab !== 'content'}>
        <div><label htmlFor={`${fieldId}-definition`}>Định nghĩa</label><textarea id={`${fieldId}-definition`} className={`${field} min-h-28 py-2`} maxLength={4000} value={card.definition} onChange={event => patch({ definition: event.target.value, reviewed: false })} /></div>
        <div><label htmlFor={`${fieldId}-prompt`}>Câu hỏi / hướng dẫn</label><textarea id={`${fieldId}-prompt`} className={`${field} min-h-24 py-2`} maxLength={2000} value={card.prompt} onChange={event => patch({ prompt: event.target.value, reviewed: false })} /></div>
        <div><label htmlFor={`${fieldId}-front`}>Nội dung mặt trước</label><textarea id={`${fieldId}-front`} className={`${field} min-h-24 py-2`} maxLength={6000} value={card.faceText?.front ?? ''} onChange={event => patch({ faceText: { front: event.target.value, back: card.faceText?.back ?? '' }, reviewed: false })} /></div>
        <div><label htmlFor={`${fieldId}-back`}>Nội dung mặt sau</label><textarea id={`${fieldId}-back`} className={`${field} min-h-24 py-2`} maxLength={6000} value={card.faceText?.back ?? ''} onChange={event => patch({ faceText: { front: card.faceText?.front ?? '', back: event.target.value }, reviewed: false })} /></div>
        </div>
        <div className="admin-field-panel" role="tabpanel" id={`${fieldId}-panel-images`} aria-labelledby={`${fieldId}-tab-images`} hidden={editorTab !== 'images'}>
        <label>URL mặt trước<input className={field} maxLength={2048} value={card.frontImageUrl} onChange={event => patch({ frontImageUrl: event.target.value, reviewed: false })} /></label>
        <label>URL mặt sau<input className={field} maxLength={2048} value={card.backImageUrl} onChange={event => patch({ backImageUrl: event.target.value, reviewed: false })} /></label>
        <p className="admin-image-note">Ảnh hai mặt giữ nguyên nội dung bộ thẻ. Kiểm tra cặp mặt trước khi đánh dấu đã kiểm.</p>
        </div>
      </fieldset>
        <div className="admin-card-faces grid grid-cols-2 gap-3">
          {[['Mặt trước', card.frontImageUrl], ['Mặt sau', card.backImageUrl]].map(([name, src]) => isCatalogImageUrl(src) && <figure key={name}>
            <img src={src} alt={`${name} ${card.name}`} className="w-full rounded-xl" loading="lazy" referrerPolicy="no-referrer" />
            <figcaption className="text-center text-sm">{name}</figcaption>
          </figure>)}
        </div>
      </div>
      <div className="admin-editor-actions">
      <AdminButton pending={pending} onClick={() => void save()}>{uncertain ? 'Thử lại đúng bản lưu' : 'Lưu bản nháp'}</AdminButton>
      <AdminButton disabled={pending || uncertain} color="white" onClick={() => setCard(null)}>Về danh sách</AdminButton>
      </div>
    </div>}
    <AdminButton className="mt-4" color="white" disabled={locked} onClick={onClose}>Đóng quản lý thẻ</AdminButton>
  </section>
}
