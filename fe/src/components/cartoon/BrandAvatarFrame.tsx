import { useId } from 'react'

// Small cut-paper deviations, not a perfectly machined circle or a random blob.
function paperEdge(radius: number, phase: number) {
  return Array.from({ length: 96 }, (_, i) => {
    const angle = i * Math.PI * 2 / 96
    const r = radius + Math.sin(angle * 11 + phase) * .65 + Math.sin(angle * 23) * .45
    return `${i ? 'L' : 'M'}${(50 + Math.cos(angle) * r).toFixed(2)} ${(50 + Math.sin(angle) * r).toFixed(2)}`
  }).join(' ') + 'Z'
}
const paperOuter = paperEdge(48, 0)
const paperRing = paperEdge(45, 1) + paperEdge(34, 2)

/** Layered paper/satin rim. The actual avatar and countdown remain separate. */
export function BrandAvatarFrame({ workshop, tone }: { workshop: boolean; tone: string }) {
  const id = useId().replace(/:/g, '')
  return <svg data-ui-chrome="avatar-frame" className="brand-avatar-frame" viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id={`satin-${id}`}><stop stopColor="#ffffff" /><stop offset="1" stopColor="#e6e3fb" /></radialGradient>
      <filter id={`paper-${id}`}><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="linear" slope=".12" /></feComponentTransfer><feComposite in2="SourceGraphic" operator="in" /><feBlend in="SourceGraphic" mode="multiply" /></filter>
    </defs>
    {workshop ? <g>
      <path d={paperOuter} fill="#f7edd4" filter={`url(#paper-${id})`} />
      <path d={paperRing} fill={tone} fillRule="evenodd" filter={`url(#paper-${id})`} />
    </g> : <g>
      <circle cx="50" cy="50" r="47" fill={`url(#satin-${id})`} />
      <circle cx="50" cy="50" r="40" fill="none" stroke={tone} strokeWidth="8" />
      <circle cx="50" cy="50" r="33" fill="#f6f5ff" stroke="#ffffff" strokeWidth="3" />
    </g>}
  </svg>
}
