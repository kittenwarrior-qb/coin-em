import { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CartoonScrollAreaProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  alwaysShowScrollbar?: boolean
  'data-testid'?: string
}

export function CartoonScrollArea({ children, className, style, alwaysShowScrollbar, 'data-testid': testId }: CartoonScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [thumbTop, setThumbTop] = useState(0)
  const [thumbHeight, setThumbHeight] = useState(0)
  const [hasOverflow, setHasOverflow] = useState(false)
  const isDragging = useRef(false)
  const [isThumbActive, setIsThumbActive] = useState(false)
  const dragStartY = useRef(0)
  const dragStartScrollTop = useRef(0)

  const TRACK_PADDING = 4

  const updateThumb = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= clientHeight + 1) {
      setHasOverflow(false)
      return
    }
    setHasOverflow(true)
    const trackH = clientHeight - TRACK_PADDING * 2
    const ratio = clientHeight / scrollHeight
    const h = Math.max(60, Math.min(trackH, trackH * ratio))
    const maxTop = trackH - h
    const scrollRatio = scrollHeight === clientHeight ? 0 : scrollTop / (scrollHeight - clientHeight)
    const top = TRACK_PADDING + scrollRatio * maxTop
    setThumbHeight(h)
    setThumbTop(top)
  }, [])

  useEffect(() => {
    updateThumb()
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(updateThumb)
    ro.observe(el)
    // also observe children size changes
    const mo = new MutationObserver(updateThumb)
    mo.observe(el, { childList: true, subtree: true })
    return () => { ro.disconnect(); mo.disconnect() }
  }, [updateThumb])

  const onThumbMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    isDragging.current = true
    setIsThumbActive(true)
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStartY.current = clientY
    dragStartScrollTop.current = viewportRef.current?.scrollTop ?? 0

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const el = viewportRef.current
      if (!el) return
      const y = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY
      const delta = y - dragStartY.current
      const { scrollHeight, clientHeight } = el
      const trackH = clientHeight - TRACK_PADDING * 2
      const thumbH = Math.max(60, Math.min(trackH, trackH * (clientHeight / scrollHeight)))
      const scrollRatio = (scrollHeight - clientHeight) / (trackH - thumbH)
      el.scrollTop = dragStartScrollTop.current + delta * scrollRatio
    }

    const onUp = () => {
      isDragging.current = false
      setIsThumbActive(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }, [])

  const SCROLLBAR_W = 17
  const SCROLLBAR_R = 8.5

  const showScrollbar = alwaysShowScrollbar || hasOverflow

  return (
    <div className={cn('relative overflow-hidden', className)} style={style}>
      {/* Scrollable viewport */}
      <div
        ref={viewportRef}
        onScroll={updateThumb}
        data-testid={testId}
        className="absolute inset-0 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`[data-scroll-hide]::-webkit-scrollbar{display:none}`}</style>
        <div data-scroll-hide="" style={{ paddingRight: SCROLLBAR_W + 16 + 4 }}>{children}</div>
      </div>

      {/* Scrollbar — always visible when overflow or alwaysShowScrollbar */}
      {showScrollbar && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ right: 16, width: SCROLLBAR_W, zIndex: 10 }}
        >
          {/* Track */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: TRACK_PADDING,
              bottom: TRACK_PADDING,
              width: SCROLLBAR_W,
              borderRadius: SCROLLBAR_R,
              background: '#d4f4ff',
            }}
          />

          {/* Thumb */}
          <div
            className="absolute left-1/2 pointer-events-auto cursor-grab active:cursor-grabbing overflow-hidden"
            style={{
              top: thumbTop,
              height: thumbHeight,
              width: SCROLLBAR_W,
              transform: 'translateX(-50%)',
              borderRadius: SCROLLBAR_R,
              opacity: isThumbActive ? 0.55 : 1,
              transition: 'opacity 100ms ease',
            }}
            onMouseDown={onThumbMouseDown}
            onTouchStart={onThumbMouseDown}
          >
            <img
              src="/cartoon/ui/Scrollbar.png"
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
