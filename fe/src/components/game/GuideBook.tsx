import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { useState } from 'react'

const SLIDES = [
  '/tutorial/1.png',
  '/tutorial/2.png',
  '/tutorial/3.png',
  '/tutorial/4.png',
  '/tutorial/5.png',
  '/tutorial/6.png',
  '/tutorial/7.png',
  '/tutorial/8.png',
  '/tutorial/9.png',
]
const SLIDE_COUNT = SLIDES.length

interface GuideBookProps {
  onClose: () => void
}


export function GuideBook({ onClose }: GuideBookProps) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, next))
    setDirection(clamped > current ? 1 : -1)
    setCurrent(clamped)
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 && current < SLIDE_COUNT - 1) goTo(current + 1)
    else if (info.offset.x > 60 && current > 0) goTo(current - 1)
  }

  const canPrev = current > 0
  const canNext = current < SLIDE_COUNT - 1

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="flex flex-col"
        style={{ width: '100%', maxWidth: 480, height: '100%', maxHeight: '100dvh' }}
        onClick={e => e.stopPropagation()}
      >

        {/* Top bar — same height as bottom bar for balance */}
        <div className="flex h-[52px] shrink-0 items-center justify-end px-3">
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/60 backdrop-blur-sm"
            style={{ fontFamily: 'system-ui', fontSize: 20, color: 'rgba(255,255,255,0.7)' }}
          >
            ×
          </button>
        </div>

        {/* Slide area */}
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={{
                enter:  (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit:   (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'pan-y' }}
            >
              <img
                src={SLIDES[current]}
                alt={`Hướng dẫn trang ${current + 1}`}
                className="h-full w-full select-none object-contain"
                draggable={false}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent && !parent.querySelector('.guide-placeholder')) {
                    const div = document.createElement('div')
                    div.className = 'guide-placeholder absolute inset-0 flex flex-col items-center justify-center text-white/40'
                    div.innerHTML = `<div style="font-size:64px">📖</div><div style="margin-top:12px;font-size:14px">Trang ${current + 1}</div><div style="font-size:12px;margin-top:4px">Ảnh sẽ được thêm sớm</div>`
                    parent.appendChild(div)
                  }
                }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Left arrow — same style as CoinCarousel */}
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={!canPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 disabled:opacity-20 transition-opacity"
            aria-label="Trang trước"
          >
            <img
              src="/cartoon/icons/Arrow---Right.svg"
              alt="prev"
              className="w-8 h-8"
              style={{ transform: 'scaleX(-1)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
              draggable={false}
            />
          </button>

          {/* Right arrow — same style as CoinCarousel */}
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={!canNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 disabled:opacity-20 transition-opacity"
            aria-label="Trang tiếp"
          >
            <img
              src="/cartoon/icons/Arrow---Right.svg"
              alt="next"
              className="w-8 h-8"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
              draggable={false}
            />
          </button>
        </div>

        {/* Bottom bar — same height as top bar */}
        <div className="flex h-[52px] shrink-0 flex-col items-center justify-center gap-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-white" style={{ fontSize: 22, lineHeight: 1 }}>
              {current + 1}
            </span>
            <span className="font-display text-white/40" style={{ fontSize: 14 }}>
              / {SLIDE_COUNT}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <motion.button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                animate={{
                  width: i === current ? 20 : 6,
                  background: i === current ? '#F97BB0' : 'rgba(255,255,255,0.28)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                style={{ height: 6, borderRadius: 99, cursor: 'pointer', border: 'none', padding: 0 }}
              />
            ))}
          </div>
        </div>

      </motion.div>
    </motion.div>
  )
}
