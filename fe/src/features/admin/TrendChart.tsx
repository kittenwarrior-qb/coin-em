import { useRef, useState } from 'react'
import { formatDay, formatNumber } from './format'

export interface TrendPoint { day: string; value: number; detail?: string }

const PAD = { top: 16, right: 16, bottom: 28, left: 48 }

/** A round number at or above the largest value, and the tick step that divides it. */
function scaleFor(max: number) {
  if (max <= 4) return { top: 4, step: 1 }
  const rough = max / 4, power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map(multiple => multiple * power).find(candidate => candidate >= rough) ?? 10 * power
  return { top: step * 4, step }
}

/**
 * One series per chart: a 2px line over a light wash, no legend (the heading names it).
 * Hovering or focusing a day shows that day's numbers; the same numbers are in the table
 * next to the chart for anyone who cannot hover.
 */
export function TrendChart({ data, unit, label, compact = false }: { data: TrendPoint[]; unit: string; label: string; compact?: boolean }) {
  const [active, setActive] = useState<number | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  // The compact chart sits in a narrow column: a smaller canvas keeps its labels readable.
  const W = compact ? 480 : 960, height = compact ? 180 : 260
  const { top, step } = scaleFor(Math.max(...data.map(point => point.value), 1))
  const innerW = W - PAD.left - PAD.right, innerH = height - PAD.top - PAD.bottom
  const x = (index: number) => PAD.left + (data.length === 1 ? innerW / 2 : index / (data.length - 1) * innerW)
  const y = (value: number) => PAD.top + innerH - value / top * innerH
  const line = data.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
  // About six date labels, whatever the range.
  const every = Math.max(1, Math.ceil(data.length / 6))
  const ticks = Array.from({ length: 5 }, (_, index) => index * step).filter((_, index) => !compact || index % 2 === 0)
  const nearest = (clientX: number) => {
    const box = svg.current?.getBoundingClientRect()
    if (!box || data.length < 2) return data.length ? 0 : null
    const index = Math.round(((clientX - box.left) / box.width * W - PAD.left) / innerW * (data.length - 1))
    return Math.max(0, Math.min(data.length - 1, index))
  }
  const point = active === null ? null : data[active]
  const slot = Math.max(4, innerW / Math.max(1, data.length))
  return <div className="admin-chart">
    <svg ref={svg} role="img" aria-label={label} viewBox={`0 0 ${W} ${height}`} onPointerMove={event => setActive(nearest(event.clientX))} onPointerLeave={() => setActive(null)}>
      {ticks.map(tick => <g key={tick}>
        <line className="admin-chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
        <text className="admin-chart-tick" textAnchor="end" x={PAD.left - 10} y={y(tick) + 4}>{formatNumber(tick)}</text>
      </g>)}
      {data.map((item, index) => index % every === 0 || index === data.length - 1 ?
        // Skip a regular label that would collide with the always-shown last one.
        index !== data.length - 1 && data.length - 1 - index < every / 2 ? null :
        <text key={item.day} className="admin-chart-tick" x={x(index)} y={height - 6}
          textAnchor={index === data.length - 1 ? 'end' : index === 0 ? 'start' : 'middle'}>{formatDay(item.day)}</text> : null)}
      <path className="admin-chart-area" d={area} />
      <path className="admin-chart-line" d={line} />
      {point && active !== null && <>
        <line className="admin-chart-cross" x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} />
        <circle className="admin-chart-dot" cx={x(active)} cy={y(point.value)} r={5} />
      </>}
      {/* Keyboard: each day can be focused and shows the same readout as hovering. */}
      {data.map((item, index) => <rect key={item.day} className="admin-chart-hit" tabIndex={0} x={x(index) - slot / 2} y={PAD.top} width={slot} height={innerH}
        aria-label={`${formatDay(item.day, true)}: ${formatNumber(item.value)} ${unit}${item.detail ? `, ${item.detail}` : ''}`}
        onFocus={() => setActive(index)} onBlur={() => setActive(null)} />)}
    </svg>
    {point && active !== null && <div className="admin-chart-tip" style={{ left: `${x(active) / W * 100}%`,
      transform: `translateX(${active > data.length / 2 ? 'calc(-100% - 12px)' : '12px'})` }}>
      <span>{formatDay(point.day, true)}</span>
      <strong><i aria-hidden="true" />{formatNumber(point.value)} <em>{unit}</em></strong>
      {point.detail && <small>{point.detail}</small>}
    </div>}
  </div>
}
