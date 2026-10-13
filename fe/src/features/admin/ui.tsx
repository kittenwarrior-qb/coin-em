import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usePopupLifecycle } from '@/features/overlays/usePopupLifecycle'
import { formatNumber } from './format'

/* Shared admin primitives. Presentation only: no data access or authorization here. */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
export function Badge({ tone = 'neutral', dot = false, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return <span className={`admin-badge is-${tone}`}>{dot && <i aria-hidden="true" />}{children}</span>
}

export function Panel({ title, description, actions, children, className = '', labelledBy }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; labelledBy?: string
}) {
  const generated = useId(), id = labelledBy ?? generated
  return <section className={`admin-card admin-panel ${className}`} aria-labelledby={title ? id : undefined}>
    {(title || actions) && <header className="admin-panel-head">
      <div>{title && <h2 id={id}>{title}</h2>}{description && <p>{description}</p>}</div>
      {actions && <div className="admin-panel-actions">{actions}</div>}
    </header>}
    {children}
  </section>
}

/** One headline number. `delta` compares with the period before; `null` means nothing to compare. */
export function StatTile({ label, value, icon, hint, delta, selected, onSelect }: {
  label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode
  delta?: { current: number; before: number; days: number }; selected?: boolean; onSelect?: () => void
}) {
  let change: ReactNode = null
  if (delta) {
    const diff = delta.current - delta.before
    const percent = delta.before > 0 ? Math.round(Math.abs(diff) / delta.before * 100) : null
    change = <span className={`admin-stat-delta ${diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : ''}`}>
      {delta.before === 0 && delta.current === 0 ? 'Chưa có số liệu' : percent === null ? `Mới · ${delta.days} ngày trước chưa có`
        : `${diff > 0 ? '▲' : diff < 0 ? '▼' : '•'} ${percent}% so với ${delta.days} ngày trước`}
    </span>
  }
  const body = <><span className="admin-stat-label">{icon}{label}</span><strong className="admin-stat-value">{value}</strong>{change}{hint && <span className="admin-stat-hint">{hint}</span>}</>
  return onSelect ? <button type="button" className="admin-stat" aria-pressed={selected} onClick={onSelect}>{body}</button>
    : <article className="admin-stat">{body}</article>
}

export function Segmented<T extends string | number>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: readonly { value: T; label: ReactNode; title?: string }[]; onChange: (value: T) => void; disabled?: boolean
}) {
  return <div className="admin-segmented" role="group" aria-label={label}>
    {options.map(option => <button key={String(option.value)} type="button" aria-pressed={option.value === value} aria-label={option.title}
      title={option.title} disabled={disabled} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return <div className="admin-empty">{icon}<strong>{title}</strong>{children && <p>{children}</p>}</div>
}

/** A ranked list: label, the number, its share of the total and a thin bar relative to the largest row. */
export function RankedList({ rows, unit, empty, label = value => value }: {
  rows: { label: string; count: number }[]; unit: string; empty: string; label?: (key: string) => string
}) {
  const max = Math.max(...rows.map(row => row.count), 1), total = rows.reduce((sum, row) => sum + row.count, 0)
  if (!rows.length) return <p className="admin-rank-empty">{empty}</p>
  return <ul className="admin-rank">{rows.map(row => <li key={row.label} title={`${label(row.label)}: ${formatNumber(row.count)} ${unit.toLocaleLowerCase('vi')}`}>
    <span className="admin-rank-label">{label(row.label)}</span>
    <strong>{formatNumber(row.count)}<span className="sr-only"> {unit.toLocaleLowerCase('vi')}</span></strong>
    <small>{total ? Math.round(row.count / total * 100) : 0}%</small>
    <span className="admin-rank-track" aria-hidden="true"><i style={{ width: `${row.count / max * 100}%` }} /></span>
  </li>)}</ul>
}

/** Admin dialog on the shared popup lifecycle: Escape/Back close it, focus returns, `persistent` blocks both. */
export function AdminDialog({ open, title, onClose, persistent = false, side = false, children }: {
  open: boolean; title: string; onClose: () => void; persistent?: boolean; side?: boolean; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null), titleId = useId()
  usePopupLifecycle(ref, open, { onClose, persistent })
  if (!open) return null
  return createPortal(<div className={`admin-overlay ${side ? 'is-side' : ''}`} onClick={persistent ? undefined : onClose}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="admin-dialog" onClick={event => event.stopPropagation()}>
      <header><h2 id={titleId}>{title}</h2>
        {!persistent && <button type="button" className="admin-icon-button" aria-label="Đóng" onClick={onClose}><X aria-hidden="true" /></button>}</header>
      <div className="admin-dialog-body">{children}</div>
    </div>
  </div>, document.body)
}
