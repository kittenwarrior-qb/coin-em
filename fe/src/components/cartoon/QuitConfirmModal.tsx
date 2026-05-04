/**
 * QuitConfirmModal
 * Tái hiện Modal - Quit.prefab từ Cartoon GUI Pack
 *
 * Layout:
 *   CartoonModal (title="Quit?")
 *   ├── "Don't go!" speech bubble — trái, nhô ra ngoài panel
 *   ├── Body text
 *   ├── Emoji Fear + Heart Broken (decorative)
 *   └── 2 buttons: Quit (pink) + Play/Stay (teal)
 */

import { CartoonModal } from './CartoonModal'
import { CartoonButton } from './CartoonButton'

interface QuitConfirmModalProps {
  open: boolean
  /** Nhấn "Quit" — xác nhận rời */
  onConfirm: () => void
  /** Nhấn "Play" hoặc X — ở lại */
  onCancel: () => void
  /** Tuỳ chỉnh message, mặc định theo pack gốc */
  message?: string
  subMessage?: string
  /** Label nút xác nhận */
  confirmLabel?: string
  /** Label nút huỷ */
  cancelLabel?: string
}

export function QuitConfirmModal({
  open,
  onConfirm,
  onCancel,
  message = 'Do you really want to quit this level?',
  subMessage = 'You will lose a life!',
  confirmLabel = 'Quit',
  cancelLabel = 'Play',
}: QuitConfirmModalProps) {
  return (
    <CartoonModal open={open} onClose={onCancel} title="Quit?">

      {/* "Don't go!" speech bubble — nhô ra trái */}
      <div className="absolute -left-14 top-1/3 -translate-y-1/2 z-30 pointer-events-none">
        <div className="relative w-20">
          <img
            src="/cartoon/icons/Speech-Bubble-Left.svg"
            alt=""
            className="w-full"
            draggable={false}
          />
          <span className="absolute inset-0 flex items-center justify-center font-display text-[0.6rem] text-[var(--c-blue-dark)] text-center leading-tight px-2 pt-1">
            Don't<br />go!
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col items-center gap-4 text-center">

        {/* Message */}
        <p className="font-display text-[var(--c-blue-dark)] text-base leading-snug">
          {message}
        </p>

        {/* Decorative row: emoji + sub message + broken heart */}
        <div className="flex items-center justify-between w-full px-2">
          <img
            src="/cartoon/icons/Emoji-Fear.svg"
            alt=""
            className="w-12 h-12"
            draggable={false}
          />
          <p className="font-display text-[var(--c-teal)] text-sm">
            {subMessage}
          </p>
          <img
            src="/cartoon/icons/Heart-Broken.svg"
            alt=""
            className="w-10 h-10"
            draggable={false}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full pt-1">
          <CartoonButton
            color="pink"
            size="md"
            className="flex-1"
            onClick={onConfirm}
          >
            {confirmLabel}
          </CartoonButton>
          <CartoonButton
            color="teal"
            size="md"
            className="flex-1"
            onClick={onCancel}
          >
            {cancelLabel}
          </CartoonButton>
        </div>
      </div>

    </CartoonModal>
  )
}
