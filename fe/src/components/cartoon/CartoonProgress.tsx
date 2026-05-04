/**
 * CartoonProgress — replicates Unity Progress Bar prefab (300×60)
 *
 * Layer structure (bottom to top):
 *   Background
 *     ├── Shadow       — y:-5, rgba(0,0,0,0.102)
 *     └── Background   — white rounded rect
 *   Mask (clips fill)
 *     └── Bar (Animator)
 *         ├── Border (Dark Color) — dark-tinted border
 *         ├── Background (Color)  — main fill color
 *         ├── Light               — white rgba(1,1,1,0.039) inner glow mask
 *         └── Circle × 2         — small white decorative dots at ends
 *   Text — "100%" label (optional)
 */
import { cn } from '@/lib/utils'

type ProgressColor = 'blue' | 'green' | 'pink' | 'purple' | 'red' | 'yellow'

// Extracted from prefab color values (Unity float → hex)
const FILL: Record<ProgressColor, { border: string; fill: string; gradient: string }> = {
  blue:   { border: '#1A74C6', fill: '#009BD4', gradient: 'linear-gradient(180deg,#00B8F0 0%,#009BD4 100%)' },
  green:  { border: '#3C8109', fill: '#94DD26', gradient: 'linear-gradient(180deg,#AAEE40 0%,#94DD26 100%)' },
  pink:   { border: '#BF2250', fill: '#FF6993', gradient: 'linear-gradient(180deg,#FF85A8 0%,#FF6993 100%)' },
  purple: { border: '#4A2090', fill: '#7B4FD4', gradient: 'linear-gradient(180deg,#9068E0 0%,#7B4FD4 100%)' },
  red:    { border: '#A61932', fill: '#EB3C54', gradient: 'linear-gradient(180deg,#F05068 0%,#EB3C54 100%)' },
  yellow: { border: '#B57523', fill: '#FFD93D', gradient: 'linear-gradient(180deg,#FFE566 0%,#FFD93D 100%)' },
}

interface CartoonProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number       // 0–100
  color?: ProgressColor
  label?: string
  showPercent?: boolean
}

export function CartoonProgress({
  value, color = 'blue', label, showPercent, className, ...props
}: CartoonProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const c = FILL[color]

  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="font-display text-xs text-[var(--c-gray-dark)]">{label}</span>
          {showPercent && (
            <span className="font-display text-xs text-[var(--c-gray)]">{Math.round(clamped)}%</span>
          )}
        </div>
      )}

      {/* Outer container — white bg + shadow */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          height: '1.75rem',
          background: '#fff',
          boxShadow: '0 4px 0 rgba(0,0,0,0.10)',
          padding: '3px',
        }}
      >
        {/* Gray track */}
        <div className="absolute inset-[3px] rounded-full bg-[#E9ECEF] overflow-hidden">
          {/* Colored fill bar */}
          <div
            className="h-full rounded-full relative overflow-hidden transition-all duration-500 ease-out"
            style={{ width: `${clamped}%`, background: c.gradient }}
          >
            {/* Dark border layer (bottom edge) */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: `inset 0 -3px 0 ${c.border}` }}
            />
            {/* White gloss highlight (top) */}
            <div
              className="absolute inset-x-2 top-0.5 h-[35%] rounded-full"
              style={{ background: 'rgba(255,255,255,0.35)' }}
            />
            {/* Decorative dot — left end */}
            {clamped > 8 && (
              <div
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/60"
                style={{ width: 5, height: 3, transform: 'translateY(-50%) rotate(-15deg)' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
