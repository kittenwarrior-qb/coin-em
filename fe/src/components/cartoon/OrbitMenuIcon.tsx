/** Satin theme uses light outline icons, independently of the paper silhouette family. */
export function OrbitMenuIcon({ name }: { name: 'cards' | 'box' | 'book' | 'headset' | 'arrow' }) {
  const paths = {
    cards: <><rect x="7" y="7" width="17" height="25" rx="2" transform="rotate(-12 15 19)" /><path d="m24 6 8 3a2 2 0 0 1 1 3l-6 21a2 2 0 0 1-3 1l-5-2" /></>,
    box: <><path d="m7 12 13-7 13 7v17l-13 7-13-7Z" /><path d="m7 12 13 7 13-7M20 19v17" /></>,
    book: <><path d="M20 10C15 7 9 7 4 9v24c6-2 11-1 16 2 5-3 10-4 16-2V9c-5-2-11-2-16 1Z" /><path d="M20 10v25" /></>,
    headset: <><path d="M7 23v-6a13 13 0 0 1 26 0v6" /><rect x="4" y="21" width="7" height="12" rx="3" /><rect x="29" y="21" width="7" height="12" rx="3" /></>,
    arrow: <path d="M5 20h29M23 9l11 11-11 11" />,
  }
  return <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
