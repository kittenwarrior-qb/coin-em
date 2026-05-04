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
    const mo = new MutationObserver(updateThumb)
    mo.observe(el, { childList: true, subtree: true })
    return () => { ro.disconnect(); mo.disconnect() }
  }, [updateThumb])

  useEffect(() => {
    const thumb = thumbRef.current
    if (!thumb) return
    thumb.addEventListener('mousedown', onThumbMouseDown)
    thumb.addEventListener('touchstart', onThumbTouchStart, { passive: false })
    return () => {
      thumb.removeEventListener('mousedown', onThumbMouseDown)
      thumb.removeEventListener('touchstart', onThumbTouchStart)
    }
  })

  const thumbRef = useRef<HTMLDivElement>(null)

  const onThumbMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    setIsThumbActive(true)
    dragStartY.current = e.clientY
    dragStartScrollTop.current = viewportRef.current?.scrollTop ?? 0

    const onMove = (ev: MouseEvent) => {
      const el = viewportRef.current
      if (!el) return
      const delta = ev.clientY - dragStartY.current
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
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const onThumbTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault()
    isDragging.current = true
    setIsThumbActive(true)
    dragStartY.current = e.touches[0].clientY
    dragStartScrollTop.current = viewportRef.current?.scrollTop ?? 0

    const onMove = (ev: TouchEvent) => {
      const el = viewportRef.current
      if (!el) return
      const delta = ev.touches[0].clientY - dragStartY.current
      const { scrollHeight, clientHeight } = el
      const trackH = clientHeight - TRACK_PADDING * 2
      const thumbH = Math.max(60, Math.min(trackH, trackH * (clientHeight / scrollHeight)))
      const scrollRatio = (scrollHeight - clientHeight) / (trackH - thumbH)
      el.scrollTop = dragStartScrollTop.current + delta * scrollRatio
    }

    const onUp = () => {
      isDragging.current = false
      setIsThumbActive(false)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }

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
        <div data-scroll-hide="" style={{ paddingRight: SCROLLBAR_W + 4 }}>{children}</div>
      </div>

      {/* Scrollbar — always visible when overflow or alwaysShowScrollbar */}
      {showScrollbar && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ right: 0, width: SCROLLBAR_W, zIndex: 10 }}
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
            ref={thumbRef}
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
