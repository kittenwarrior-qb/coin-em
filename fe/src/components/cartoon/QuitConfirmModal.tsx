import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
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
import { useConfirmedAction } from '@/features/game/controllers/useConfirmedAction'
import { useControlTheme } from './controlThemeContext'
import { HeartCrack, TriangleAlert } from 'lucide-react'

interface QuitConfirmModalProps {
  open: boolean
  onConfirm: () => Promise<boolean> | void
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
  const themed = useControlTheme() !== 'legacy'
  const { pending, run, error } = useConfirmedAction('quit', open)
  const confirm = () => run(async () => { const result = onConfirm(); return result === undefined ? true : await result })
  return (
    <CartoonModal open={open} onClose={pending ? undefined : onCancel} persistent={pending} hideClose={pending} title={themed ? 'Xác nhận thoát' : 'Quit?'}>

      {/* Body */}
      <div className="flex flex-col items-center gap-4 text-center">

        {/* Main message */}
        <p className="font-display text-[var(--c-pink)] text-base leading-snug">
          {message}
        </p>

        {/* Emoji + sub message + broken heart */}
        <div className="flex items-center justify-between w-full px-1">
          {themed ? <TriangleAlert className="w-14 h-14 shrink-0 text-[var(--brand-focus)]" aria-hidden="true" /> : <EmcoinImage
            src="/emcoin/icons/orbit/surprised.svg"
            alt=""
            className="w-14 h-14 flex-shrink-0"
            style={{
              transform: 'rotate(-12deg)',
              filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.18))',
            }}
            draggable={false}
          />}
          <p className="font-display text-[var(--c-teal)] text-sm flex-1 text-center px-2">
            {subMessage}
          </p>
          {themed ? <HeartCrack className="w-10 h-10 shrink-0 text-[#A15C75]" aria-hidden="true" /> : <EmcoinImage
            src="/emcoin/icons/orbit/brokenHeart.svg"
            alt=""
            className="w-10 h-10 flex-shrink-0"
            draggable={false}
          />}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full pt-1">
          <CartoonButton color="pink" size="md" className="flex-1" pending={pending} disabled={!open} onClick={confirm}>
            {confirmLabel}
          </CartoonButton>
          <CartoonButton color="teal" size="md" className="flex-1" disabled={pending || !open} onClick={onCancel}>
            {cancelLabel}
          </CartoonButton>
        </div>
        {error && <p role="alert" className="font-body text-sm">{error}</p>}

      </div>
    </CartoonModal>
  )
}
