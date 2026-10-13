import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, ImageOff, LayoutGrid, Pencil, Plus, RefreshCw, Rocket, Rows3, Search } from 'lucide-react'
import { AdminButton } from './AdminButton'
import { usePendingNavigationGuard } from '@/features/overlays/usePopupLifecycle'
import { catalogClient, CatalogRequestError, isCatalogImageUrl, type CatalogCard, type CatalogDraft } from './catalogClient'
import { CatalogPublisher } from './CatalogPublisher'
import { formatNumber } from './format'
import { AdminDialog, Badge, Segmented } from './ui'

const labels = { role: 'Vai trò', situation: 'Tình huống', emotion: 'Cảm xúc', reflection: 'Phản tư', selfcare: 'Bí kíp tự ôm' }
const roles = { narrator: 'Người Quản trò', sender: 'Người Trao Gửi', silencer: 'Người Im Lặng', connector: 'Người Kết Nối', opener: 'Người Gợi Mở', guide: 'Người Dẫn Lối', healer: 'Người Chữa Lành' }
const tabs = [['metadata', 'Thông tin'], ['content', 'Nội dung'], ['images', 'Hình ảnh']] as const
const missingContent = (card: CatalogCard) => card.category === 'role' || card.category === 'emotion' ? !card.definition.trim() : !card.prompt.trim()

function StatusBadge({ card }: { card: CatalogCard }) {
  return card.archived ? <Badge tone="neutral" dot>Ngừng dùng</Badge> : card.reviewed ? <Badge tone="success" dot>Đã kiểm</Badge> : <Badge tone="warning" dot>Chưa kiểm</Badge>
}
function Thumb({ card }: { card: CatalogCard }) {
  return isCatalogImageUrl(card.frontImageUrl) ? <img src={card.frontImageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
    : <span className="admin-thumb-placeholder" aria-hidden="true">{card.code.slice(0, 2)}</span>
}

export function CatalogEditor({ onBusy }: { onBusy?: (busy: boolean) => void }) {
  const fieldId = useId()
  const [draft, setDraft] = useState<CatalogDraft | null>(null)
  const [card, setCard] = useState<CatalogCard | null>(null)
  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [editorTab, setEditorTab] = useState<typeof tabs[number][0]>('metadata')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const active = useRef<AbortController | null>(null)
  const intent = useRef<{ card: CatalogCard; revision: number; requestId: string } | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const snapshotIntent = useRef<{ revision: number; requestId: string } | null>(null)
  const [snapshotUncertain, setSnapshotUncertain] = useState(false)
  const [releaseBusy, setReleaseBusy] = useState(false)
  const [releaseRequested, setReleaseRequested] = useState(false)
  const locked = pending || uncertain || snapshotUncertain || releaseBusy
  // An unconfirmed release command keeps its panel open until the outcome is known.
  const releaseOpen = !card && !!draft && (releaseRequested || snapshotUncertain || releaseBusy)
  useEffect(() => { onBusy?.(locked || card !== null) }, [locked, card, onBusy])
  usePendingNavigationGuard(locked || card !== null)
  useEffect(() => {
    if (!locked && !card) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [locked, card])
  const load = useCallback(() => {
    const controller = new AbortController()
    active.current = controller
    setPending(true)
    catalogClient.draft(controller.signal).then(data => { if (!controller.signal.aborted) { setDraft(data); setMessage('') } })
      .catch(() => { if (!controller.signal.aborted) setMessage('Không tải được catalog. Kiểm tra phiên đăng nhập rồi bấm Tải lại danh sách.') })
      .finally(() => { if (!controller.signal.aborted) { active.current = null; setPending(false) } })
    return controller
  }, [])
  useEffect(() => { const controller = load(); return () => { controller.abort(); active.current?.abort() } }, [load])
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
        setMessage('Đã lưu bản nháp, nhưng chưa tải lại được danh sách. Bấm Tải lại danh sách để lấy bản mới; không cần gửi lại bản lưu.')
      } else if (error instanceof CatalogRequestError && [400, 401, 403, 409].includes(error.status)) {
        intent.current = null; setUncertain(false)
        if (error.status === 409) setMessage('Catalog đã thay đổi hoặc mã thẻ bị trùng. Về danh sách và tải lại để lấy bản mới; bản nháp của bạn vẫn đang hiển thị.')
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
        setDraft(null); setMessage('Phiên bản đã được tạo. Chưa tải lại được catalog; bấm Tải lại danh sách, không cần tạo lại.')
      } else if (error instanceof CatalogRequestError && [400, 401, 403, 409].includes(error.status)) {
        snapshotIntent.current = null; setSnapshotUncertain(false)
        setMessage('Chưa thể tạo phiên bản. Kiểm tra nội dung, trạng thái đã kiểm và tải lại bản nháp nếu có người vừa sửa.')
      } else {
        setSnapshotUncertain(true); setMessage('Chưa xác nhận được việc tạo phiên bản. Thử lại đúng yêu cầu để tránh tạo hai lần.')
      }
    } finally { if (!controller.signal.aborted) { active.current = null; setPending(false) } }
  }
  const patch = (value: Partial<CatalogCard>) => { if (card && !pending && !uncertain) setCard({ ...card, ...value }) }
  const cards = draft?.cards ?? []
  const unchecked = cards.filter(item => !item.archived && (!item.reviewed || missingContent(item)))
  const missingCategory = Object.keys(labels).some(category => !cards.some(item => !item.archived && item.category === category))
  const normalize = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  const filtered = cards.filter(item => normalize(`${item.code} ${item.name}`).includes(normalize(filter.trim())) &&
    (categoryFilter === 'all' || item.category === categoryFilter) && (reviewFilter === 'all' ||
      (reviewFilter === 'archived' ? item.archived : !item.archived && (reviewFilter === 'reviewed' ? item.reviewed : !item.reviewed))))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)), page = Math.min(pageIndex, pages - 1)
  const visible = filtered.slice(page * pageSize, page * pageSize + pageSize)
  const original = card && cards.find(item => item.id === card.id)
  const dirty = !!card && JSON.stringify(original ?? null) !== JSON.stringify(card)
  const open = (item: CatalogCard) => { if (locked) return; setCard({ ...item }); setEditorTab('metadata'); setMessage('') }
  function addCard() {
    if (!draft || locked) return
    setEditorTab('metadata')
    setCard({ id: crypto.randomUUID(), code: 'NEW-001', name: 'Thẻ mới', category: 'situation', group: 'light',
      definition: '', prompt: '', sortOrder: draft.cards.length, frontImageUrl: '', backImageUrl: '', sourcePages: [], reviewed: false, archived: false })
  }
  const status = <>{pending && <p role="status" className="admin-notice is-quiet">Đang chờ catalog…</p>}
    {message && <p role="status" className="admin-notice">{message}</p>}</>

  if (card) return <section className="admin-card admin-catalog is-editing" aria-labelledby="catalog-title">
    <header className="admin-editor-head">
      <AdminButton color="white" disabled={pending || uncertain} onClick={() => setCard(null)}><ArrowLeft aria-hidden="true" />Về danh sách</AdminButton>
      <div className="admin-editor-title"><h2 id="catalog-title">{card.name}</h2>
        <p>{card.code} · {labels[card.category]} · Trang nguồn: {card.sourcePages.join(' / ') || 'Thẻ thêm mới'}</p></div>
      <div className="admin-editor-state">{dirty && <Badge tone="accent">Chưa lưu</Badge>}<StatusBadge card={card} /></div>
    </header>
    {status}
    <div className="admin-card-editor">
      <div className="admin-editor-tabs" role="tablist" aria-label="Chi tiết thẻ">{tabs.map(([id, title]) => <button type="button" role="tab" key={id} id={`${fieldId}-tab-${id}`}
        aria-controls={`${fieldId}-panel-${id}`} aria-selected={editorTab === id} onClick={() => setEditorTab(id)}>{title}</button>)}</div>
      <div className="admin-editor-body">
        <fieldset disabled={pending || uncertain} className="admin-catalog-fields">
          <div className="admin-field-panel" role="tabpanel" id={`${fieldId}-panel-metadata`} aria-labelledby={`${fieldId}-tab-metadata`} hidden={editorTab !== 'metadata'}>
            <label>Mã thẻ<input maxLength={64} value={card.code} onChange={event => patch({ code: event.target.value })} /></label>
            <label>Tên<input maxLength={160} value={card.name} onChange={event => patch({ name: event.target.value, reviewed: false })} /></label>
            <label>Loại<select value={card.category} onChange={event => patch({ category: event.target.value as CatalogCard['category'], reviewed: false })}>
              {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Nhóm<input maxLength={64} value={card.group} onChange={event => patch({ group: event.target.value, reviewed: false })} /></label>
            <label>Thứ tự<input type="number" min={0} max={10000} step={1} value={card.sortOrder} onChange={event => patch({ sortOrder: Number(event.target.value) })} /></label>
            {card.category === 'role' && <label>Vai trò gameplay<select value={card.roleKey ?? ''} onChange={event => patch({ roleKey: event.target.value, reviewed: false })}>
              <option value="">Chưa liên kết</option>
              {Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>}
            <div className="admin-check-group">
              <label className="admin-check"><input type="checkbox" checked={card.reviewed} onChange={event => patch({ reviewed: event.target.checked })} /><span><strong>Đã kiểm nội dung và cặp mặt</strong><small>Sửa tên, nội dung hoặc ảnh sẽ tự bỏ dấu kiểm này.</small></span></label>
              <label className="admin-check"><input type="checkbox" checked={card.archived} onChange={event => patch({ archived: event.target.checked })} /><span><strong>Ngừng dùng trong bộ mới</strong><small>Thẻ vẫn được giữ, chỉ không có trong phiên bản đóng băng tiếp theo.</small></span></label>
            </div>
            <p className="admin-card-source">ID nội bộ: {card.id}</p>
          </div>
          <div className="admin-field-panel is-stacked" role="tabpanel" id={`${fieldId}-panel-content`} aria-labelledby={`${fieldId}-tab-content`} hidden={editorTab !== 'content'}>
            <div><label htmlFor={`${fieldId}-definition`}>Định nghĩa</label><textarea id={`${fieldId}-definition`} maxLength={4000} value={card.definition} onChange={event => patch({ definition: event.target.value, reviewed: false })} /></div>
            <div><label htmlFor={`${fieldId}-prompt`}>Câu hỏi / hướng dẫn</label><textarea id={`${fieldId}-prompt`} maxLength={2000} value={card.prompt} onChange={event => patch({ prompt: event.target.value, reviewed: false })} /></div>
            <div><label htmlFor={`${fieldId}-front`}>Nội dung mặt trước</label><textarea id={`${fieldId}-front`} maxLength={6000} value={card.faceText?.front ?? ''} onChange={event => patch({ faceText: { front: event.target.value, back: card.faceText?.back ?? '' }, reviewed: false })} /></div>
            <div><label htmlFor={`${fieldId}-back`}>Nội dung mặt sau</label><textarea id={`${fieldId}-back`} maxLength={6000} value={card.faceText?.back ?? ''} onChange={event => patch({ faceText: { front: card.faceText?.front ?? '', back: event.target.value }, reviewed: false })} /></div>
          </div>
          <div className="admin-field-panel is-stacked" role="tabpanel" id={`${fieldId}-panel-images`} aria-labelledby={`${fieldId}-tab-images`} hidden={editorTab !== 'images'}>
            <label>URL mặt trước<input maxLength={2048} value={card.frontImageUrl} onChange={event => patch({ frontImageUrl: event.target.value, reviewed: false })} /></label>
            <label>URL mặt sau<input maxLength={2048} value={card.backImageUrl} onChange={event => patch({ backImageUrl: event.target.value, reviewed: false })} /></label>
            <p className="admin-image-note">Ảnh hai mặt giữ nguyên nội dung bộ thẻ. Kiểm tra cặp mặt trước khi đánh dấu đã kiểm.</p>
          </div>
        </fieldset>
        <aside className="admin-card-faces" aria-label="Xem trước hai mặt thẻ">
          {[['Mặt trước', card.frontImageUrl], ['Mặt sau', card.backImageUrl]].map(([name, src]) => <figure key={name}>
            {isCatalogImageUrl(src) ? <img src={src} alt={`${name} ${card.name}`} loading="lazy" referrerPolicy="no-referrer" />
              : <div className="admin-face-empty"><ImageOff aria-hidden="true" /><span>Chưa có ảnh {name.toLocaleLowerCase('vi')}</span></div>}
            <figcaption>{name}</figcaption>
          </figure>)}
        </aside>
      </div>
      <div className="admin-editor-actions"><span className="admin-save-note">Chỉ lưu bản nháp, không thay bộ thẻ đang chơi.</span>
        <AdminButton pending={pending} onClick={() => void save()}>{uncertain ? 'Thử lại đúng bản lưu' : 'Lưu bản nháp'}</AdminButton>
      </div>
    </div>
  </section>

  return <section className="admin-card admin-catalog" aria-labelledby="catalog-title">
    <header className="admin-catalog-heading">
      <div><h2 id="catalog-title">Danh sách thẻ</h2>
        <p className="admin-catalog-caption">Quản lý bản nháp; chỉ áp dụng cho phòng mới sau khi phát hành.</p></div>
      {draft && <div className="admin-panel-actions">
        <AdminButton color="white" disabled={pending || uncertain} onClick={() => setReleaseRequested(true)}><Rocket aria-hidden="true" />Phát hành</AdminButton>
        <AdminButton disabled={locked} onClick={addCard}><Plus aria-hidden="true" />Thêm thẻ</AdminButton>
      </div>}
    </header>
    {!releaseOpen && status}
    {!draft && !pending && <div><AdminButton color="white" onClick={() => { if (!active.current) load() }}><RefreshCw aria-hidden="true" />Tải lại danh sách</AdminButton></div>}
    {draft && <>
      <dl className="admin-catalog-summary">
        <div><dt>Tổng số thẻ</dt><dd>{formatNumber(cards.length)}</dd></div>
        <div><dt>Đã kiểm</dt><dd>{formatNumber(cards.filter(item => !item.archived && item.reviewed).length)}</dd></div>
        <div className={unchecked.length ? 'is-warning' : ''}><dt>Cần xử lý</dt><dd>{formatNumber(unchecked.length)}</dd></div>
        <div><dt>Ngừng dùng</dt><dd>{formatNumber(cards.filter(item => item.archived).length)}</dd></div>
        <div><dt>Bản nháp</dt><dd>#{formatNumber(draft.revision)}</dd></div>
      </dl>
      <div className="admin-table-filters">
        <label className="admin-search"><span className="sr-only">Tìm thẻ</span><Search aria-hidden="true" />
          <input type="search" placeholder="Tìm theo mã hoặc tên thẻ" value={filter} onChange={event => { setFilter(event.target.value); setPageIndex(0) }} disabled={locked} /></label>
        <label><span className="sr-only">Lọc loại</span><select disabled={locked} value={categoryFilter} onChange={event => { setCategoryFilter(event.target.value); setPageIndex(0) }}>
          <option value="all">Tất cả loại</option>{Object.entries(labels).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
        <label><span className="sr-only">Lọc trạng thái</span><select disabled={locked} value={reviewFilter} onChange={event => { setReviewFilter(event.target.value); setPageIndex(0) }}>
          <option value="all">Tất cả trạng thái</option><option value="reviewed">Đã kiểm</option><option value="unchecked">Chưa kiểm</option><option value="archived">Ngừng dùng</option></select></label>
        <Segmented label="Kiểu hiển thị" value={view} onChange={setView} options={[
          { value: 'table', label: <Rows3 aria-hidden="true" />, title: 'Dạng bảng' }, { value: 'grid', label: <LayoutGrid aria-hidden="true" />, title: 'Dạng lưới' }]} />
      </div>
      <div className="admin-table-scroll" aria-label="Danh sách thẻ" tabIndex={0}>
        {view === 'table' ? <table className="admin-table"><caption className="sr-only">Bộ thẻ bản nháp</caption>
          <thead><tr><th>Thẻ</th><th>Loại</th><th>Nhóm</th><th className="is-number">Thứ tự</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody>
            {visible.map(item => <tr key={item.id} className="is-clickable" onClick={() => open(item)}>
              <td><div className="admin-card-name"><Thumb card={item} /><span><strong>{item.name}</strong><small>{item.code}</small></span></div></td>
              <td>{labels[item.category]}</td><td className="admin-muted">{item.group || '—'}</td><td className="is-number">{item.sortOrder}</td>
              <td><StatusBadge card={item} />{!item.archived && missingContent(item) && <Badge tone="danger">Thiếu nội dung</Badge>}</td>
              <td><AdminButton color="white" disabled={locked} aria-label={`${item.code} · ${item.name}`} onClick={event => { event.stopPropagation(); open(item) }}><Pencil aria-hidden="true" />Sửa</AdminButton></td>
            </tr>)}
            {filtered.length === 0 && <tr><td colSpan={6} className="admin-table-empty">Không tìm thấy thẻ. Thử đổi từ khóa hoặc bộ lọc.</td></tr>}
          </tbody></table>
          : filtered.length === 0 ? <p className="admin-table-empty">Không tìm thấy thẻ. Thử đổi từ khóa hoặc bộ lọc.</p>
          : <ul className="admin-card-grid">{visible.map(item => <li key={item.id}>
            <button type="button" disabled={locked} aria-label={`${item.code} · ${item.name}`} onClick={() => open(item)}>
              <span className="admin-card-grid-face"><Thumb card={item} /></span>
              <strong>{item.name}</strong><small>{item.code} · {labels[item.category]}</small><StatusBadge card={item} />
            </button></li>)}</ul>}
      </div>
      <div className="admin-pagination"><p>{filtered.length} kết quả · Trang {page + 1}/{pages}</p>
        <label>Số dòng/trang<select aria-label="Số dòng/trang" value={pageSize} disabled={locked} onChange={event => { setPageSize(Number(event.target.value)); setPageIndex(0) }}>{[10, 25, 50, 80].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
        <div><AdminButton color="white" disabled={locked || page === 0} onClick={() => setPageIndex(page - 1)}><ChevronLeft aria-hidden="true" />Trang trước</AdminButton>
          <AdminButton color="white" disabled={locked || page + 1 >= pages} onClick={() => setPageIndex(page + 1)}>Trang sau<ChevronRight aria-hidden="true" /></AdminButton></div></div>
      <AdminDialog side open={releaseOpen} title="Phiên bản và phát hành" persistent={locked} onClose={() => setReleaseRequested(false)}>
        {status}
        <ol className="admin-release-steps">
          <li><h3>1. Đóng băng bản nháp</h3>
            <p>Tạo một phiên bản không thể sửa từ {formatNumber(cards.length - cards.filter(item => item.archived).length)} thẻ đang dùng. Chưa ảnh hưởng tới phòng chơi.</p>
            {(unchecked.length > 0 || missingCategory) && <p className="admin-notice is-warning">{unchecked.length > 0 && `Còn ${formatNumber(unchecked.length)} thẻ thiếu nội dung hoặc chưa kiểm. `}{missingCategory && 'Chưa đủ năm loại thẻ.'}</p>}
            <AdminButton pending={pending} disabled={releaseBusy || uncertain || (!snapshotUncertain && (unchecked.length > 0 || missingCategory))}
              onClick={() => void prepareSnapshot()}>{snapshotUncertain ? 'Thử lại đúng yêu cầu tạo phiên bản' : 'Đóng băng phiên bản đã kiểm'}</AdminButton></li>
          <li><CatalogPublisher revision={draft.revision} disabled={pending || uncertain || snapshotUncertain} onBusy={setReleaseBusy}
            onChanged={async () => { const latest = await catalogClient.draft(new AbortController().signal); setDraft(latest) }} /></li>
        </ol>
      </AdminDialog>
    </>}
  </section>
}
