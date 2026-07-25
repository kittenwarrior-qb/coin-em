import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * AboutFlowPath — a squiggly "flowing path" that lives in the background of the
 * About page (behind the content) and draws itself as the reader scrolls, in the
 * spirit of lusion.co. Adapted from a hand-drawn squiggle.
 *
 * Drop it as the first child of an element with class `about-flow-zone`; the
 * sibling `.about-flow-content` (the real sections) paints on top.
 */

// Squiggle authored in a 1000×2000 design space.
const BASE_W = 1000
const BASE_H = 2000
const RAW_D =
  'M-24.5 101C285 315 5.86278 448.291 144.223 631.238C239.404 757.091 559.515 782.846 608.808 617.456C658.101 452.067 497.627 367.073 406.298 426.797C314.968 486.521 263.347 612.858 322.909 865.537C384.086 1125.06 79.3992 1007.94 100 1261.99C144.222 1807.35 819 1325 513 1142.5C152.717 927.625 -45 1916.5 1191.5 1852'

// Flat (x, y) point list parsed out of the M/C path above.
const BASE_POINTS: Array<[number, number]> = (() => {
  const nums = RAW_D.match(/-?\d*\.?\d+/g)!.map(Number)
  const pts: Array<[number, number]> = []
  for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]])
  return pts
})()

function buildPath(sx: number, sy: number): string {
  const pts = BASE_POINTS.map(([x, y]) => [x * sx, y * sy] as [number, number])
  const [start, ...rest] = pts
  let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`
  for (let i = 0; i + 2 < rest.length; i += 3) {
    const [c1, c2, p] = [rest[i], rest[i + 1], rest[i + 2]]
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p[0].toFixed(1)} ${p[1].toFixed(1)}`
  }
  return d
}

export default function AboutFlowPath() {
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [box, setBox] = useState({ w: BASE_W, h: BASE_H })

  // Measure the real pixel size of the zone before paint, and keep it in sync
  // (section height changes once the lazy-loaded photo finishes loading).
  useLayoutEffect(() => {
    const svg = svgRef.current
    const zone = svg?.closest('.about-flow-zone') as HTMLElement | null
    if (!zone) return
    const measure = () => {
      const w = zone.clientWidth
      const h = zone.clientHeight
      if (w > 0 && h > 0) setBox({ w, h })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(zone)
    return () => ro.disconnect()
  }, [])

  const d = buildPath(box.w / BASE_W, box.h / BASE_H)

  useEffect(() => {
    const path = pathRef.current
    const svg = svgRef.current
    if (!path || !svg) return
    const zone = svg.closest('.about-flow-zone') as HTMLElement | null
    if (!zone) return

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`

    const draw = (progress: number) => {
      const p = Math.max(0, Math.min(1, progress))
      path.style.strokeDashoffset = `${length * (1 - p)}`
    }
    draw(0)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(1)
      return
    }

    const st = ScrollTrigger.create({
      trigger: zone,
      start: 'top 82%',
      end: 'bottom 58%',
      scrub: 1,
      onUpdate: (self) => draw(self.progress),
    })

    return () => { st.kill() }
    // Re-wire whenever `d` changes size (resize/orientation change), since the
    // path's total length changes with it.
  }, [d])

  return (
    <svg
      ref={svgRef}
      className="about-flow-svg"
      viewBox={`0 0 ${box.w} ${box.h}`}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="about-flow-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f15f8d" />
          <stop offset="52%" stopColor="#ff8a32" />
          <stop offset="100%" stopColor="#76c8b7" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        d={d}
        stroke="url(#about-flow-grad)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <style>{`
        /* Both axes, not just overflow-x: mixing overflow-x:hidden with the
           default overflow-y:visible forces the engine to compute overflow-y
           as 'auto' per spec — an extra scroll-container edge case this
           sidesteps entirely. The zone's own height is plain content flow
           (nothing here relies on vertical overflow), so clipping both is safe. */
        .about-flow-zone { position: relative; overflow: hidden; }
        .about-flow-content { position: relative; z-index: 1; }
        .about-flow-svg {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          z-index: 0; pointer-events: none;
          opacity: 0.5;
          filter: drop-shadow(0 0 8px rgba(241, 95, 141, 0.25));
          /* Explicit, not relying on the UA default (svg:not(:root){overflow:hidden}) —
             belt-and-suspenders so the path's out-of-box coordinates (it's an
             organic squiggle, not neatly bounded to its own viewBox) can never
             leak into the page's scrollable area regardless of the filter above. */
          overflow: hidden;
        }
        .about-flow-svg path { stroke-width: 15px; }
        @media (max-width: 720px) {
          .about-flow-svg { opacity: 0.42; filter: none; }
          .about-flow-svg path { stroke-width: 9.5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .about-flow-svg { opacity: 0.38; }
        }
      `}</style>
    </svg>
  )
}
