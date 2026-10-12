import { useRef, type ReactNode } from 'react'
import { motion, useIsPresent } from 'framer-motion'
import { X } from 'lucide-react'
import { usePopupLifecycle } from '@/features/overlays/usePopupLifecycle'

/** Shell only: the parent supplies already-authorized faces and navigation. */
export function BoardPreviewModal({ label, pending, onClose, testId, children }: {
  label: string
  pending?: boolean
  onClose: () => void
  testId?: string
  children: (locked: boolean) => ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const present = useIsPresent()
  const locked = Boolean(pending || !present)
  usePopupLifecycle(ref, present, { onClose, persistent: pending })
  return <motion.div
    ref={ref} role="dialog" data-ui-chrome="preview" aria-label={label} aria-busy={pending || undefined} tabIndex={-1}
    data-testid={testId}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onClick={locked ? undefined : onClose}
    onClickCapture={event => { if (locked) { event.preventDefault(); event.stopPropagation() } }}
    onPointerDownCapture={event => { if (locked) { event.preventDefault(); event.stopPropagation() } }}
  >
    <button type="button" aria-label="Đóng xem thẻ" disabled={locked}
      className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 font-display text-white focus-visible:outline-2 focus-visible:outline-white"
      onClick={event => { event.stopPropagation(); if (!locked) onClose() }}><X className="mx-auto h-5 w-5" aria-hidden="true" /></button>
    {children(locked)}
  </motion.div>
}
