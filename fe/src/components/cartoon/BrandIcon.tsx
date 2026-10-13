/** Shared hand-rounded silhouette/stroke family; no embedded labels or action state. */
import type { CSSProperties } from 'react'
export type BrandIconName = 'cards' | 'box' | 'book' | 'headset' | 'gift' | 'chevron' | 'close' | 'settings' | 'help' | 'chart' | 'rooms' | 'database' | 'lock'
export function BrandIcon({ name, className = '', style }: { name: BrandIconName; className?: string; style?: CSSProperties }) {
  const paths = {
    chart: <><path d="M7 6v30h30M14 27V18M23 27V10M32 27V14" /></>,
    rooms: <><path d="M7 37V7h28v30M14 37V14h14v23" /><circle cx="24" cy="26" r="1.5" fill="currentColor" /></>,
    database: <><ellipse cx="21" cy="9" rx="14" ry="5" /><path d="M7 9v23c0 7 28 7 28 0V9M7 20c0 7 28 7 28 0" /></>,
    lock: <><rect x="8" y="18" width="26" height="21" rx="5" /><path d="M13 18v-7a8 8 0 0 1 16 0v7M21 27v5" /></>,
    cards: <><path d="m11 5 17-3 5 28-17 3Z" fill="currentColor" stroke="none" /><path d="m28 8 9 3-7 26-10-3" /><circle cx="27" cy="27" r="2" fill="var(--brand-ivory)" stroke="none" /></>,
    box: <><path d="m7 12 14-7 14 7v22l-14 7-14-7Z" /><path d="m7 12 14 7 14-7M21 19v22M14 8l14 7" /><path d="m26 24 5 3-5 2-3-2Z" fill="currentColor" stroke="none" /></>,
    book: <><path d="M21 10C16 6 8 6 4 8v27c6-2 12-1 17 3 5-4 11-5 17-3V8c-4-2-12-2-17 2Z" /><path d="M21 10v28" /></>,
    headset: <><path d="M7 25v-8a14 14 0 0 1 28 0v8M35 28v6c0 4-5 5-10 5" /><rect x="4" y="20" width="8" height="12" rx="3" fill="currentColor" stroke="none" /><rect x="30" y="20" width="8" height="12" rx="3" fill="currentColor" stroke="none" /><rect x="20" y="36" width="9" height="5" rx="2" fill="currentColor" stroke="none" /></>,
    gift: <><path d="M7 18h28v20H7ZM4 12h34v8H4M21 12v26" /><path d="M21 12C5 12 10-2 18 6l3 6c15 0 11-14 3-6Z" /></>,
    chevron: <path d="m16 10 10 11-10 11" />,
    close: <path d="m12 12 18 18M30 12 12 30" />,
    help: <><path d="M13 12c0-11 21-11 21 0 0 7-13 7-13 14" strokeWidth="6" /><circle cx="21" cy="35" r="3.2" fill="currentColor" stroke="none" /></>,
    settings: <><path d="m17 5 1-3h6l1 3 5 3 4-1 3 5-3 3v6l3 3-3 5-4-1-5 3-1 4h-6l-1-4-5-3-4 1-3-5 3-3v-6l-3-3 3-5 4 1Z" fill="currentColor" stroke="none" transform="translate(0 2)" /><circle cx="21" cy="20" r="6" fill="var(--brand-ivory)" stroke="none" /></>,
  }
  return <svg className={className} style={style} viewBox="0 0 42 42" fill="none" stroke="currentColor" strokeWidth={name === 'close' ? 6 : 3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
