import { useLayoutEffect, useRef } from 'react'
import { motion, useIsPresent } from 'framer-motion'
import { CartoonButton } from '@/components/cartoon'
import { FlipCard } from '@/components/game/FlipCard'
import { usePopupLifecycle } from '@/features/overlays/usePopupLifecycle'

/** Presentation of the parent's already-authorized own role only. */
export function OwnRoleRevealModal({ role, backImage, roleImage, pending = false, onClose }: {
  role: string
  backImage: string
  roleImage: string
  pending?: boolean
  onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const present = useIsPresent()
  const locked = pending || !present
  const lockedRef = useRef(locked)
  useLayoutEffect(() => {
    lockedRef.current = locked
    return () => { lockedRef.current = true }
  }, [locked])
  const close = () => { if (!lockedRef.current) onClose() }
  usePopupLifecycle(panel, present, { onClose: close, persistent: pending })
  return <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    data-testid="role-reveal-all-overlay"
    className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    onClick={event => event.stopPropagation()}
    onClickCapture={event => { if (lockedRef.current) { event.preventDefault(); event.stopPropagation() } }}
    onPointerDownCapture={event => { if (lockedRef.current) { event.preventDefault(); event.stopPropagation() } }}
  >
    <motion.div ref={panel} role="dialog" data-ui-panel="a1" aria-label="Vai trò của bạn" aria-busy={pending || undefined} tabIndex={-1}
      initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
      className="own-role-panel w-full max-w-[430px] max-h-[92dvh] flex flex-col gap-3 overflow-y-auto overscroll-contain [&>*]:shrink-0"
      onClick={event => event.stopPropagation()}
    >
      <div data-ui-chrome="header" className="text-center">
        <div className="font-display text-2xl text-white">Chia vai trò</div>
        <div className="font-body text-xs text-white/70">Đây là vai trò của bạn trong lượt này</div>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 px-2 py-4">
        <FlipCard frontImage={backImage} backImage={roleImage} altText={role} size="large" autoFlipDelayMs={450} />
        <div data-ui-chrome="role-label" className="font-display text-lg text-white text-center leading-tight max-w-[280px]">{role}</div>
      </div>
      <CartoonButton color="green" size="lg" className="w-full" data-testid="btn-close-role-reveal"
        disabled={locked} onClick={close}>Đã xem vai trò</CartoonButton>
    </motion.div>
  </motion.div>
}
