import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
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

import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CartoonCircleButton } from './CartoonButton'
import { cn } from '@/lib/utils'
import { usePopupLifecycle } from '@/features/overlays/usePopupLifecycle'
import { useControlTheme } from './controlThemeContext'
import { themePanel, isBrandTheme } from './controlThemes'
import { BrandIcon } from './BrandIcon'
import { X } from 'lucide-react'

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
  /** Explicit shell override; no game or player state is owned by this modal. */
  container?: Element
  /** Opt-in menu hierarchy; other dialogs keep their existing shell. */
  appearance?: 'default' | 'menu'
  initialFocus?: 'panel'
}

export function CartoonModal({
  open,
  onClose,
  title,
  children,
  className,
  persistent,
  hideClose,
  container,
  appearance = 'default',
  initialFocus,
}: CartoonModalProps) {
  const theme = useControlTheme()
  const reduced=useReducedMotion()
  const kawaii=theme==='candy-clouds'
  const themed = theme !== 'legacy'
  const menu = themed && appearance === 'menu'
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  usePopupLifecycle(dialogRef, open && !!portalTarget, { onClose, persistent, initialFocus }, portalTarget)

  useLayoutEffect(() => {
    // Prefer game-panel (in-game), fallback to screen-panel, then body
    setPortalTarget(container ??
      document.getElementById('game-panel') ??
      document.querySelector('.screen-panel') ??
      document.body)
  }, [container, open])

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`${portalTarget === document.body ? 'fixed' : 'absolute'} inset-0 z-50 flex items-center justify-center px-4`}
          data-testid="cartoon-modal-overlay"
          style={{ background: 'rgba(0,0,0,0.35)', willChange: 'opacity', paddingTop: kawaii?'max(12px, env(safe-area-inset-top))':'max(48px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          onClick={persistent ? undefined : onClose}
        >
          {/* Wrapper — scale only (no opacity change here, backdrop handles fade) */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : 'Hộp thoại'}
            tabIndex={-1}
            initial={{ scale: kawaii?reduced?1:.985:.85 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92, transition: { duration: 0.12, ease: 'easeIn' } }}
            transition={kawaii?{duration:reduced?0:.23,ease:'easeOut'}:{ type: 'spring', stiffness: 340, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className={cn('relative w-full max-h-full min-h-0 flex flex-col', menu && 'theme-a-menu', kawaii&&'kawaii-modal', className)}
            style={{ maxWidth: '23rem', transformOrigin: 'center', willChange: 'transform' }}
          >

            {/* ── Headline Flag — nhô lên trên panel, căn giữa ── */}
            {title && (
              <div className={cn('absolute -top-10 left-0 right-0 flex justify-center z-10 pointer-events-none', menu && 'theme-a-menu-heading',kawaii&&'kawaii-modal-title')}>
                <div className={cn('relative flex items-center justify-center', themed && 'theme-a-headline')} style={{ height: 80 }}>
                  {!themed && <EmcoinImage
                    src="/cartoon/ui/Headline-Flag.png"
                    alt=""
                    className="h-full w-auto"
                    draggable={false}
                  />}
                  <span id={titleId} className={cn('font-display text-2xl whitespace-nowrap', themed ? 'text-[var(--brand-ink)] px-8' : 'absolute text-white drop-shadow-md')}>
                    {title}
                  </span>
                </div>
              </div>
            )}

            {/* ── Panel-Teal.png 9-slice ── */}
            <div
              className={cn('min-h-0 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain', menu && 'theme-a-menu-panel')}
              data-ui-surface="modal"
              style={{
                borderImage: menu ? undefined : themePanel(theme),
              }}
            >
              <div data-ui-modal-content className={cn(title ? 'pt-13 pb-5 px-5' : 'p-5', menu && 'theme-a-menu-content')}>
                {children}
              </div>
            </div>

            {/* ── Close Button — blue-teal, ngoài panel góc trên phải ── */}
            {!hideClose && onClose && (
              <div className={cn('absolute -top-[1px] -right-[1px] z-30', menu && 'theme-a-menu-close',kawaii&&'kawaii-modal-close')}>
                <CartoonCircleButton
                  color="blue-teal"
                  size="sm"
                  onClick={onClose}
                  aria-label="Đóng"
                  className={menu ? '!h-11 !w-11' : '!h-8 !w-8'}
                >
                  {theme === 'emotion-orbit' && menu ? <X size={24} strokeWidth={2} aria-hidden="true" /> : isBrandTheme(theme) ? <BrandIcon name="close" className="h-[48%] w-[48%]" /> : themed ? <X size={16} aria-hidden="true" /> : <EmcoinImage
                    src="/emcoin/icons/orbit/close.svg"
                    alt="close"
                    className="w-[33%] h-[33%] object-contain brightness-0 invert"
                    draggable={false}
                  />}
                </CartoonCircleButton>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (!portalTarget) return null
  return createPortal(content, portalTarget)
}
