import { useId } from 'react'

/** Candy medallion, independent of Orbit's concentric satin rings. */
export function CandyAvatarFrame({ tone }: { tone: string }) {
  const id = useId().replace(/:/g, '')
  return <svg data-ui-chrome="candy-avatar-frame" className="brand-avatar-frame" viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <defs><linearGradient id={`candy-${id}`} x2="1" y2="1"><stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#E9F6FC" /></linearGradient></defs>
    <path d="M49 5C76 3 95 23 95 49c2 27-17 46-44 46C24 98 5 79 5 52 2 26 22 5 49 5Z" fill={`url(#candy-${id})`} stroke={tone} strokeWidth="4" />
    <path d="M18 34c5-12 15-19 28-20" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    <path d="m80 13 2 5 6 2-6 2-2 5-2-5-6-2 6-2Z" fill="#F4CE80" stroke="#FFFFFF" strokeWidth="1.2" />
  </svg>
}
