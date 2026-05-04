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
  return (
    <AnimatePresence>
      {open && (
        /* Backdrop — rgba(0,0,0,0.6) theo Popup.cs */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
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
              <div className="absolute -top-7 left-0 right-0 flex justify-center z-10 pointer-events-none">
                <div
                  className="relative flex items-center justify-center px-8"
                  style={{ height: 56 }}
                >
                  <img
                    src="/cartoon/ui/Headline-Flag.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-fill"
                    draggable={false}
                  />
                  <span className="relative font-display text-white text-lg drop-shadow-md whitespace-nowrap">
                    {title}
                  </span>
                </div>
              </div>
            )}

            {/* ── Panel chính — Rounded Rectangle 9-slice ── */}
            <div className="relative rounded-[1.75rem] overflow-hidden border-[3px] border-black bg-white">

              {/* Inner glow overlay (teal tint, top layer) */}
              <img
                src="/cartoon/ui/Inner-Glow-Rounded-Rectangle.png"
                alt=""
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10 opacity-20"
                draggable={false}
              />

              {/* Nội dung */}
              <div className={cn('relative z-20', title ? 'pt-10 pb-5 px-5' : 'p-5')}>
                {children}
              </div>
            </div>

            {/* ── Close Button — ngoài panel, góc trên phải ── */}
            {!hideClose && onClose && (
              <div className="absolute -top-3 -right-3 z-30">
                <CartoonCircleButton
                  color="red"
                  size="sm"
                  onClick={onClose}
                  aria-label="Đóng"
                >
                  <img
                    src="/cartoon/icons/X-Icon-Rounded.svg"
                    alt="close"
                    className="w-[55%] h-[55%] object-contain brightness-0 invert"
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
}
