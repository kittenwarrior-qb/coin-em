import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CartoonButton } from '@/components/cartoon'
import { AVATAR_BG_COLORS, AVATAR_ICONS } from '@/components/cartoon/avatarConfig'
import { PHASE_LABELS, type GamePhase } from '@/stores/types'
import type { Player } from './types'

// ─── Muted notice ─────────────────────────────────────────────────────────────
interface MutedNoticeProps {
  notice: { name: string; isMe: boolean; avatarIndex?: number; bgIndex?: number; nonce: number } | null
  onDismiss: () => void
}

export function MutedNoticeModal({ notice, onDismiss }: MutedNoticeProps) {
  if (!notice) return null
  return (
    <motion.div
      key={notice.nonce}
      className="absolute inset-0 z-[71] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
    >
      <motion.div
        className="relative w-full max-w-[330px] rounded-[30px] border-[3px] border-[var(--c-black)] bg-white px-5 pb-5 pt-6 text-center shadow-[0_8px_0_rgba(0,0,0,0.24)]"
        initial={{ scale: 0.84, y: 24, rotate: -1.5 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0.9, y: 18, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src="/cartoon/icons/Lock-Sliver.svg"
          alt=""
          className="absolute -right-3 -top-4 h-14 w-14 rotate-12 object-contain drop-shadow"
          draggable={false}
        />
        <div
          className="mx-auto grid h-24 w-24 place-items-center rounded-full border-[4px] border-[#7D7F8C] shadow-[0_4px_0_rgba(0,0,0,0.18)]"
          style={{ background: AVATAR_BG_COLORS[Math.abs(notice.bgIndex ?? 0) % AVATAR_BG_COLORS.length] }}
        >
          <img
            src={AVATAR_ICONS[Math.abs(notice.avatarIndex ?? 0) % AVATAR_ICONS.length]}
            alt=""
            className="h-16 w-16 object-contain"
            draggable={false}
          />
        </div>
        <div className="mt-4 font-display text-lg leading-tight text-[var(--c-pink)]">
          {notice.isMe ? 'Bạn đã bị im lặng vòng này' : notice.name}
        </div>
        {!notice.isMe && (
          <div className="mt-2 font-body text-sm leading-snug text-[#2F76AC]">
            đã bị im lặng ở vòng này
          </div>
        )}
        <CartoonButton color="purple" size="md" className="mt-5 w-full" onClick={onDismiss}>
          Đã hiểu
        </CartoonButton>
      </motion.div>
    </motion.div>
  )
}

// ─── Night action confirm ──────────────────────────────────────────────────────
interface NightActionConfirmProps {
  action: { type: 'heal' | 'silence'; targetId: string; targetName: string; iconSrc: string } | null
  myPlayerId?: string
  onCancel: () => void
  onConfirmHeal: (id: string) => void
  onConfirmSilence: (id: string) => void
}

export function NightActionConfirmModal({ action, myPlayerId, onCancel, onConfirmHeal, onConfirmSilence }: NightActionConfirmProps) {
  if (!action) return null
  return (
    <motion.div
      className="absolute inset-0 z-[72] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-[320px] rounded-[28px] border-[3px] border-[var(--c-black)] bg-white px-4 py-5 text-center shadow-[0_8px_0_rgba(0,0,0,0.24)]"
        initial={{ scale: 0.86, y: 26 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.86, y: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={action.iconSrc} alt="" className="mx-auto mb-2 h-12 w-12 object-contain" draggable={false} />
        <div className="font-display text-base text-[var(--c-black)]">
          {action.type === 'heal' ? 'Xác nhận bảo vệ' : 'Xác nhận làm im lặng'}
        </div>
        <div className="mt-1 font-body text-sm leading-snug text-black/65">
          {action.type === 'heal'
            ? action.targetId === myPlayerId
              ? 'Người Chữa Lành sẽ bảo vệ bản thân.'
              : `Người Chữa Lành sẽ bảo vệ ${action.targetName}.`
            : `Người Im Lặng sẽ chọn ${action.targetName}.`}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <CartoonButton color="orange" size="sm" onClick={onCancel}>Hủy</CartoonButton>
          <CartoonButton
            color={action.type === 'heal' ? 'green' : 'purple'}
            size="sm"
            onClick={() => action.type === 'heal' ? onConfirmHeal(action.targetId) : onConfirmSilence(action.targetId)}
          >
            Xác nhận
          </CartoonButton>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Phase nav confirm ─────────────────────────────────────────────────────────
interface PhaseNavConfirmProps {
  navigation: { direction: 'next' | 'prev'; targetPhase: GamePhase } | null
  activePhase: string
  onCancel: () => void
  onConfirm: (direction: 'next' | 'prev') => void
}

export function PhaseNavConfirmModal({ navigation, activePhase, onCancel, onConfirm }: PhaseNavConfirmProps) {
  if (!navigation) return null
  return (
    <motion.div
      className="absolute inset-0 z-[72] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-[320px] rounded-[28px] border-[3px] border-[var(--c-black)] bg-white px-4 py-5 text-center shadow-[0_8px_0_rgba(0,0,0,0.24)]"
        initial={{ scale: 0.86, y: 26 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.86, y: 26 }}
        onClick={(e) => e.stopPropagation()}
        data-testid="phase-nav-confirm-popup"
      >
        <img
          src={navigation.direction === 'next' ? '/cartoon/icons/Arrow---Right.svg' : '/cartoon/icons/Arrow---Left.svg'}
          alt=""
          className="mx-auto mb-2 h-10 w-10 object-contain"
          draggable={false}
        />
        <div className="font-display text-base text-[var(--c-black)]">
          {navigation.direction === 'next' ? 'Chuyển sang phase tiếp theo?' : 'Quay lại phase trước?'}
        </div>
        <div className="mt-1 font-body text-sm leading-snug text-black/65">
          {navigation.direction === 'next'
            ? <><strong>{PHASE_LABELS[activePhase as GamePhase] ?? activePhase}</strong> → <strong>{PHASE_LABELS[navigation.targetPhase] ?? navigation.targetPhase}</strong></>
            : <>Quay lại <strong>{PHASE_LABELS[navigation.targetPhase] ?? navigation.targetPhase}</strong> để người chơi chọn lại</>}
        </div>
        {navigation.direction === 'prev' && (
          <div className="mt-2 rounded-xl bg-amber-50 px-3 py-1.5 font-body text-[11px] text-amber-700 leading-snug">
            ⚠️ Các hành động ở phase hiện tại có thể bị reset
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <CartoonButton color="orange" size="sm" onClick={onCancel}>Hủy</CartoonButton>
          <CartoonButton
            color={navigation.direction === 'next' ? 'green' : 'blue'}
            size="sm"
            onClick={() => onConfirm(navigation.direction)}
          >
            {navigation.direction === 'next' ? 'Tiếp tục' : 'Quay lại'}
          </CartoonButton>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── NTG reward success popup ──────────────────────────────────────────────────
interface NtgRewardSuccessProps {
  names: string[] | null
  onClose: () => void
}

export function NtgRewardSuccessPopup({ names, onClose }: NtgRewardSuccessProps) {
  useEffect(() => {
    if (!names) return
    const t = window.setTimeout(onClose, 3000)
    return () => window.clearTimeout(t)
  }, [names, onClose])

  if (!names) return null
  return (
    <motion.div
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[80] w-full max-w-[320px] px-4 pointer-events-none"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-[#1e6b2e] px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
        <img src="/cartoon/icons/Checkmark.svg" alt="" className="h-8 w-8 shrink-0" draggable={false} />
        <div>
          <div className="font-display text-sm text-white">Tặng coin thành công</div>
          <div className="font-body text-[11px] text-white/75 leading-snug">
            Đã tặng cho {names.join(', ')}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Reflection-sharing reward confirm (Narrator only) ────────────────────────
interface ReflectionRewardConfirmProps {
  players: Player[]
  onSkip: () => void
  onConfirm: () => void
}

export function ReflectionRewardConfirmModal({ players, onSkip, onConfirm }: ReflectionRewardConfirmProps) {
  const hasEligiblePlayers = players.some(
    (p) => p.role === 'Người Kết Nối' || p.role === 'Người Gợi Mở' || p.role === 'Người Dẫn Lối',
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-[320px] rounded-3xl bg-white px-6 py-5 shadow-[0_8px_0_rgba(0,0,0,0.12)] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="font-display text-lg text-[var(--c-pink)] mb-2">Xác nhận phần thưởng</div>
          <div className="font-body text-sm text-black/65 leading-relaxed">
            Người Trao Gửi đã chia sẻ đầy đủ cảm xúc và phản tư. Bạn có muốn trao thưởng +5 coin vàng không?
          </div>
        </div>
        <div className="flex gap-2">
          <CartoonButton color="orange" size="md" className="flex-1" onClick={() => onSkip()}>
            Bỏ qua
          </CartoonButton>
          <CartoonButton color="green" size="md" className="flex-1" onClick={() => onConfirm()}>
            Xác nhận
          </CartoonButton>
        </div>
        {hasEligiblePlayers && (
          <div className="mt-2 font-body text-[11px] text-black/45 text-center">
            Tiếp theo: xác nhận vai trò hoàn thành
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
