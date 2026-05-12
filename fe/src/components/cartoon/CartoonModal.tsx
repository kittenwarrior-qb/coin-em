/**
 * CartoonModal
 *
 * Tái hiện đúng cấu trúc Unity prefab:
 *
 *   Popup - Basic.prefab (800×770)
 *   ├── Popup - Basic          ← Rounded Rectangle - 256px.png (9-slice, white panel)
 *   │   └── Inner Glow         ← Inner Glow - Rounded Rectangle.png (overlay)
 *   ├── Close Button.prefab    ← CartoonCircleButton red, góc trên phải, ngoài panel
 *   └── Headline.prefab        ← Headline - Flag.png, neo vào top, nhô ra ngoài panel
 *
 * Animation: scale 0→1 spring (Popup.controller Enter anim)
 * Backdrop:  rgba(0,0,0,0.6)  (Popup.cs backgroundColor)
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CartoonCircleButton } from './CartoonButton'
import { cn } from '@/lib/utils'

interface CartoonModalProps {
  open: boolean
  onClose?: () => void
  /** Tiêu đề hiển thị trên Headline Flag banner */
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Không cho đóng khi click backdrop */
  persistent?: boolean
  /** Ẩn close button */
  hideClose?: boolean
}

export function CartoonModal({
  open,
  onClose,
  title,
  children,
  className,
  persistent,
  hideClose,
}: CartoonModalProps) {
  const portalRef = useRef<Element | null>(null)

  useEffect(() => {
    // Prefer game-panel (in-game), fallback to screen-panel, then body
    portalRef.current =
      document.getElementById('game-panel') ??
      document.querySelector('.screen-panel') ??
      document.body
  }, [open])

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={persistent ? undefined : onClose}
        >
          {/* Wrapper — chứa cả headline nhô ra ngoài + close button */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className={cn('relative w-full', className)}
            style={{ maxWidth: '23rem' }}
          >

            {/* ── Headline Flag — nhô lên trên panel, căn giữa ── */}
            {title && (
              <div className="absolute -top-10 left-0 right-0 flex justify-center z-10 pointer-events-none">
                <div className="relative flex items-center justify-center" style={{ height: 80 }}>
                  <img
                    src="/cartoon/ui/Headline-Flag.png"
                    alt=""
                    className="h-full w-auto"
                    draggable={false}
                  />
                  <span className="absolute font-display text-white text-2xl drop-shadow-md whitespace-nowrap">
                    {title}
                  </span>
                </div>
              </div>
            )}

            {/* ── Panel-Teal.png 9-slice ── */}
            <div
              style={{
                borderImage: 'url(/cartoon/ui/Panel-Teal.png) 120 fill / 40px / 0px stretch',
              }}
            >
              <div className={cn(title ? 'pt-13 pb-5 px-5' : 'p-5')}>
                {children}
              </div>
            </div>

            {/* ── Close Button — blue-teal, ngoài panel góc trên phải ── */}
            {!hideClose && onClose && (
              <div className="absolute -top-[1px] -right-[1px] z-30">
                <CartoonCircleButton
                  color="blue-teal"
                  size="sm"
                  onClick={onClose}
                  aria-label="Đóng"
                  className="!h-8 !w-8"
                >
                  <img
                    src="/cartoon/icons/X-Icon-Rounded.svg"
                    alt="close"
                    className="w-[33%] h-[33%] object-contain brightness-0 invert"
                    draggable={false}
                  />
                </CartoonCircleButton>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (!portalRef.current) return content
  return createPortal(content, portalRef.current)
}
