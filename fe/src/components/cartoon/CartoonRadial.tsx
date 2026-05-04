/**
 * CartoonRadial — replicates Unity Progress Bar - Radial prefab
 * Uses SVG circle with stroke-dasharray/dashoffset for fill animation.
 * Layers: outer dark ring → colored fill → inner bg circle → text label
 */
import { cn } from '@/lib/utils'

type RadialColor = 'blue' | 'pink' | 'teal'

const COLORS: Record<RadialColor, { fill: string; dark: string; bg: string }> = {
  blue:  { fill: '#0E94C5', dark: '#1A74C6', bg: '#1A2A3A' },
  pink:  { fill: '#FF6993', dark: '#BF2250', bg: '#2A1A22' },
  teal:  { fill: '#22B8CF', dark: '#0E94C5', bg: '#0A2030' },
}

interface CartoonRadialProps {
  value: number       // 0–100
  color?: RadialColor
  size?: number       // px, default 100
  label?: string
  className?: string
}

export function CartoonRadial({ value, color = 'blue', size = 100, label, className }: CartoonRadialProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const c = COLORS[color]
  const r = 40
  const cx = 50
  const cy = 50
  const circumference = 2 * Math.PI * r
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
        {/* Outer dark ring */}
        <circle cx={cx} cy={cy} r={r + 4} fill={c.dark} />
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
        {/* Colored fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={c.fill}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        {/* Inner background circle */}
        <circle cx={cx} cy={cy} r={r - 8} fill={c.bg} />
      </svg>

      {/* Center text */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span className="font-display text-white" style={{ fontSize: size * 0.18 }}>
          {label ?? `${Math.round(clamped)}%`}
        </span>
      </div>
    </div>
  )
}
