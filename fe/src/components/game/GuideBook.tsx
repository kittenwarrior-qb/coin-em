import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { useState } from 'react'

const SLIDE_COUNT = 14
const SLIDES = Array.from({ length: SLIDE_COUNT }, (_, i) =>
  `/guide/slide-${String(i + 1).padStart(2, '0')}.png`,
)

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

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Inner container — max-width so slides don't stretch on wide screens */}
      <motion.div
        className="relative flex flex-col bg-black"
        style={{ width: '100%', maxWidth: 480, height: '100%', maxHeight: '100dvh' }}
        onClick={e => e.stopPropagation()}
      >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white text-xl font-bold backdrop-blur-sm"
        style={{ fontFamily: 'system-ui' }}
      >
        ×
      </button>

      {/* Counter */}
      <div className="absolute left-4 top-5 z-10 rounded-full bg-black/50 px-3 py-1 font-display text-xs text-white/80 backdrop-blur-sm">
        {current + 1} / {SLIDE_COUNT}
      </div>

      {/* Slide */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
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
                // placeholder nếu ảnh chưa có
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

        {/* Tap zones */}
        {current > 0 && (
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            className="absolute left-0 top-0 h-full w-1/5 opacity-0"
          />
        )}
        {current < SLIDE_COUNT - 1 && (
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            className="absolute right-0 top-0 h-full w-1/5 opacity-0"
          />
        )}
      </div>

      {/* Dots + nav */}
      <div className="flex items-center justify-center gap-2 py-4">
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="grid h-8 w-8 place-items-center rounded-full text-white/60 disabled:opacity-20"
          style={{ fontSize: 20 }}
        >
          ‹
        </button>

        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className="rounded-full transition-all"
              style={{
                width: i === current ? 20 : 7,
                height: 7,
                background: i === current ? '#F97BB0' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(current + 1)}
          disabled={current === SLIDE_COUNT - 1}
          className="grid h-8 w-8 place-items-center rounded-full text-white/60 disabled:opacity-20"
          style={{ fontSize: 20 }}
        >
          ›
        </button>
      </div>
      </motion.div>
    </motion.div>
  )
}
