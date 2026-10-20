import type { CSSProperties } from 'react'
import type { BrandIconName } from './BrandIcon'

/** Optical 24px grid: one rounded stroke, no stock raster assets. */
export function CandyIcon({ name, className = '', style }: { name: BrandIconName | 'friends' | 'plus' | 'crown'; className?: string; style?: CSSProperties }) {
  const paths = {
    crown: <><path d="m3 7 4 3 5-6 5 6 4-3-2 12H5Z" /><path d="M6 22h12" /></>,
    cards: <><rect x="5" y="4" width="12" height="16" rx="2.5" transform="rotate(-10 11 12)" /><path d="m18 6 3 1-3 14-8-2" /><path d="m10 10 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" fill="currentColor" stroke="none" /></>,
    box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5l8 4.5" /></>,
    book: <><path d="M12 6C9 4 5 4 2.5 5v14c3-1 6-1 9.5 1 3.5-2 6.5-2 9.5-1V5C19 4 15 4 12 6Zm0 0v14" /></>,
    headset: <><path d="M4 14v-3a8 8 0 0 1 16 0v6c0 3-2 4-6 4" /><rect x="3" y="11" width="4" height="7" rx="2" /><rect x="17" y="11" width="4" height="7" rx="2" /><path d="M12 21h2" /></>,
    gift: <><path d="M4 10h16v11H4ZM3 7h18v4H3M12 7v14" /><path d="M12 7C3 8 5 0 9 3l3 4c9 1 7-7 3-4Z" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    settings: <><path d="m9 3 1-1h4l1 3 2 1 3-1 2 4-2 2v2l2 2-2 4-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-4 2-2v-2L2 9l2-4 3 1 2-1Z" /><circle cx="12" cy="12" r="3" /></>,
    help: <><path d="M8 8a4 4 0 1 1 7 3c-2 1-3 2-3 4" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></>,
    chart: <path d="M4 3v17h17M9 15v-5M14 15V6M19 15v-7" />,
    rooms: <><path d="M4 21V4h16v17M8 21V8h8v13M12 14h.01" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" /></>,
    lock: <><rect x="5" y="10" width="14" height="12" rx="3" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3" /></>,
    friends: <><circle cx="9" cy="7" r="3.5" /><path d="M2 21v-3a6 6 0 0 1 12 0v3M17 4a3.5 3.5 0 0 1 0 7M18 15a5 5 0 0 1 4 5" /></>,
    plus: <><rect x="3" y="3" width="18" height="18" rx="6" /><path d="M12 7v10M7 12h10" /></>,
  }
  return <svg className={className} style={style} data-candy-icon={name} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
