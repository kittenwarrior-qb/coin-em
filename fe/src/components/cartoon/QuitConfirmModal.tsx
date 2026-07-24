/**
 * QuitConfirmModal — tái hiện Modal - Quit.prefab
 *
 * Cấu trúc:
 *   CartoonModal (title="Quit?", close=blue-teal X)
 *   ├── Speech Bubble Left PNG  ← "Don't go!", nhô ra trái ngoài panel
 *   ├── Body text (pink, font-display)
 *   ├── Row: Emoji Fear  |  sub message (teal)  |  Heart Broken
 *   └── Buttons: Quit (pink pill) + Play (teal pill)
 */

import { CartoonModal } from './CartoonModal'
import { CartoonButton } from './CartoonButton'

interface QuitConfirmModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  message?: string
  subMessage?: string
  confirmLabel?: string
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

      {/* Body */}
      <div className="flex flex-col items-center gap-4 text-center">

        {/* Main message */}
        <p className="font-display text-[var(--c-pink)] text-base leading-snug">
          {message}
        </p>

        {/* Emoji + sub message + broken heart */}
        <div className="flex items-center justify-between w-full px-1">
          <img
            src="/cartoon/icons/Fear-Cartoon.svg"
            alt=""
            className="w-14 h-14 flex-shrink-0"
            style={{
              transform: 'rotate(-12deg)',
              filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.18))',
            }}
            draggable={false}
          />
          <p className="font-display text-[var(--c-teal)] text-sm flex-1 text-center px-2">
            {subMessage}
          </p>
          <img
            src="/cartoon/icons/Heart-Broken.svg"
            alt=""
            className="w-10 h-10 flex-shrink-0"
            draggable={false}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full pt-1">
          <CartoonButton color="pink" size="md" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </CartoonButton>
          <CartoonButton color="teal" size="md" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </CartoonButton>
        </div>

      </div>
    </CartoonModal>
  )
}
