import { useId } from 'react'
import type { CoinType } from './types'

/** UI denomination icon only; the owned Coin card faces are never replaced. */
export function BrandCoinIcon({ type, workshop }: { type: CoinType; workshop: boolean }) {
  const id = useId().replace(/:/g, '')
  const colors = { green: ['#b6d976', '#6b9c42', '#47792b'], yellow: ['#ffd47b', '#efad34', '#bb7c1a'], red: ['#f69b91', '#d85551', '#a73938'] }[type]
  return <svg data-ui-coin-icon={type} viewBox="0 0 64 64" role="img" aria-label={type} className="brand-coin-icon">
    <defs><linearGradient id={`coin-${id}`} x2=".3" y2="1"><stop stopColor={colors[0]} /><stop offset="1" stopColor={colors[1]} /></linearGradient></defs>
    <circle cx="32" cy="34" r="28" fill={colors[2]} />
    <circle cx="32" cy="30" r="27" fill={`url(#coin-${id})`} stroke={colors[2]} strokeWidth="1.5" />
    <circle cx="32" cy="30" r="21" fill="none" stroke={colors[0]} strokeWidth="2" />
    <g fill="none" stroke={colors[2]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {workshop ? <path d="m32 15 4.5 9 10 1.5-7.2 7 1.7 10-9-4.7-9 4.7 1.7-10-7.2-7 10-1.5Z" fill={colors[0]} /> : <>
        <circle cx="24" cy="25" r="1.5" fill={colors[2]} stroke="none" /><circle cx="40" cy="25" r="1.5" fill={colors[2]} stroke="none" />
        <path d={type === 'green' ? 'M21 34q11 13 22 0' : type === 'yellow' ? 'M23 36h18' : 'M21 40q11-13 22 0'} />
      </>}
    </g>
    <path d="M13 19q4-7 11-9" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
  </svg>
}
