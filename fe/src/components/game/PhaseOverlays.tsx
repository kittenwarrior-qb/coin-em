/**
 * All bottom-sheet overlays that appear during specific game phases.
 * Kept in one file since they share the same slide-up animation pattern.
 */
import { motion } from 'framer-motion'
import { CartoonButton, CartoonCard, CartoonBadge } from '@/components/cartoon'
import type { Player } from './types'

// ─── Shared slide-up sheet ────────────────────────────────────────────────────
function BottomSheet({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <motion.div
      data-testid={testId}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-40
                 bg-white border-t-[3px] border-[var(--c-black)] rounded-t-3xl p-4 flex flex-col gap-3"
    >
      {children}
    </motion.div>
  )
}

// ─── Group response ───────────────────────────────────────────────────────────
interface GroupResponseProps {
  players: Player[]
  myPlayer: Player | null
  responseText: string
  hasResponded: boolean
  hasNTGVoted: boolean
  onChangeResponse: (v: string) => void
  onSendResponse: () => void
  onNTGVote: (id: string) => void
}

export function GroupResponseOverlay({
  players, myPlayer, responseText, hasResponded, hasNTGVoted,
  onChangeResponse, onSendResponse, onNTGVote,
}: GroupResponseProps) {
  return (
    <BottomSheet>
      <div className="font-display text-sm">💬 Phản hồi nhóm</div>

      {!hasResponded ? (
        <div className="flex gap-2">
          <input
            data-testid="input-response"
            value={responseText}
            onChange={e => onChangeResponse(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSendResponse()}
            placeholder="Chia sẻ cảm nhận của bạn..."
            className="input-cartoon flex-1 py-2 text-sm"
          />
          <CartoonButton color="blue" size="sm" disabled={!responseText.trim()} onClick={onSendResponse} data-testid="btn-send-response">
            Gửi
          </CartoonButton>
        </div>
      ) : (
        <CartoonBadge color="green">✅ Đã gửi phản hồi</CartoonBadge>
      )}

      {myPlayer?.isSender && !hasNTGVoted && (
        <div>
          <div className="font-display text-xs text-[var(--c-gray)] mb-2">👑 Chọn người phản hồi hay nhất (+5 💛)</div>
          <div className="flex flex-wrap gap-2">
            {players.filter(p => !p.isMe).map(p => (
              <CartoonButton key={p.id} color="yellow" size="sm" data-testid={`btn-ntg-vote-${p.name}`} onClick={() => onNTGVote(p.id)}>
                {p.name}
              </CartoonButton>
            ))}
          </div>
        </div>
      )}
      {myPlayer?.isSender && hasNTGVoted && (
        <CartoonBadge color="green">✅ Đã vote người phản hồi hay nhất</CartoonBadge>
      )}
    </BottomSheet>
  )
}

// ─── Reflection sharing ───────────────────────────────────────────────────────
interface ReflectionShareProps {
  text: string
  hasShared: boolean
  onChange: (v: string) => void
  onShare: () => void
}

export function ReflectionSharingOverlay({ text, hasShared, onChange, onShare }: ReflectionShareProps) {
  return (
    <BottomSheet>
      <div className="font-display text-sm">🤔 Chia sẻ Phản tư (+5 💛)</div>
      {!hasShared ? (
        <div className="flex gap-2">
          <input
            data-testid="input-reflection-share"
            value={text}
            onChange={e => onChange(e.target.value)}
            placeholder="Chia sẻ suy nghĩ về thẻ phản tư..."
            className="input-cartoon flex-1 py-2 text-sm"
          />
          <CartoonButton color="blue" size="sm" onClick={onShare} data-testid="btn-share-reflection">Chia sẻ</CartoonButton>
        </div>
      ) : (
        <CartoonBadge color="green">✅ Đã chia sẻ phản tư</CartoonBadge>
      )}
    </BottomSheet>
  )
}

// ─── Guess silencer ───────────────────────────────────────────────────────────
interface GuessSilencerProps {
  players: Player[]
  hasVoted: boolean
  onVote: (id: string) => void
}

export function GuessSilencerOverlay({ players, hasVoted, onVote }: GuessSilencerProps) {
  return (
    <BottomSheet>
      {!hasVoted ? (
        <>
          <div className="font-display text-sm">🕵️ Đoán Người Im Lặng</div>
          <div className="flex flex-wrap gap-2">
            {players.filter(p => !p.isMe).map(p => (
              <CartoonButton key={p.id} color="red" size="sm" data-testid={`btn-vote-silencer-${p.name}`} onClick={() => onVote(p.id)}>
                {p.name}
              </CartoonButton>
            ))}
          </div>
        </>
      ) : (
        <CartoonBadge color="green">✅ Đã vote — chờ kết quả...</CartoonBadge>
      )}
    </BottomSheet>
  )
}

// ─── Reveal silencer ──────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  'Người Im Lặng':  'red',
  'Người Quản trò': 'purple',
  'Người Trao Gửi': 'yellow',
  'Người Chữa Lành':'green',
}

export function RevealSilencerOverlay({ players }: { players: Player[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="w-full max-w-sm bg-white border-t-[3px] border-[var(--c-black)] rounded-t-3xl p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto scroll-cartoon"
      >
        <div className="font-display text-sm">🎭 Tiết lộ vai trò</div>
        {players.map(p => (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 card-cartoon card-cartoon-sm">
            <span className="font-display text-sm">{p.name}{p.isMe ? ' (Bạn)' : ''}</span>
            <CartoonBadge color={(ROLE_COLORS[p.role] ?? 'blue') as never}>{p.role}</CartoonBadge>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ─── Reward ───────────────────────────────────────────────────────────────────
interface RewardProps {
  players: Player[]
  currentRound: number
  totalRounds: number
  isNarrator: boolean
  onNext: () => void
}

export function RewardOverlay({ players, currentRound, totalRounds, isNarrator, onNext }: RewardProps) {
  const realPlayers = players.filter(p => !p.role?.includes('Bot'))
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="w-full max-w-sm bg-white border-t-[3px] border-[var(--c-black)] rounded-t-3xl p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto scroll-cartoon"
      >
        <div className="font-display text-sm">🌀 Tổng kết lượt {currentRound}/{totalRounds}</div>

        <CartoonCard pastel="yellow" variant="sm" className="p-3">
          <p className="font-body text-[11px] text-[var(--c-gray-dark)] leading-relaxed">
            💚 Xu Xanh = lời ôm bạn nhận được &nbsp;·&nbsp;
            💛 Xu Vàng = lời ôm bạn trao đi &nbsp;·&nbsp;
            ❤️ Xu Đỏ = lòng tốt trong tim bạn
          </p>
        </CartoonCard>

        <div className="flex flex-col gap-2">
          {realPlayers.map(p => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 card-cartoon card-cartoon-sm">
              <span className="font-display text-sm">{p.name}{p.isMe ? ' (Bạn)' : ''}</span>
              <div className="flex gap-3 font-display text-xs">
                <span>💚 {p.coins.green}</span>
                <span>💛 {p.coins.yellow}</span>
                <span>❤️ {p.coins.red}</span>
              </div>
            </div>
          ))}
        </div>

        {isNarrator && (
          <CartoonButton color="green" size="lg" className="w-full" onClick={onNext} data-testid="btn-next-round">
            {currentRound >= totalRounds ? '🎉 Kết thúc game' : '▶ Lượt tiếp theo'}
          </CartoonButton>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Ended ────────────────────────────────────────────────────────────────────
interface EndedProps {
  players: Player[]
  onLeave: () => void
}

export function EndedOverlay({ players, onLeave }: EndedProps) {
  const realPlayers = players.filter(p => !p.role?.includes('Bot'))
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--c-cream)] px-6 gap-5 overflow-y-auto scroll-cartoon"
    >
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} className="text-center">
        <div className="text-5xl mb-2">🫂</div>
        <h2 className="font-display text-2xl">Hành trình kết thúc</h2>
        <p className="font-body text-xs text-[var(--c-gray)] mt-1">Cảm ơn mọi người đã chia sẻ và lắng nghe</p>
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="w-full max-w-sm">
        <CartoonCard className="p-4 flex flex-col gap-2">
          <div className="font-display text-xs text-[var(--c-gray)] mb-1">Những lời ôm của bạn</div>
          {realPlayers.map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="font-display text-sm">{p.name}{p.isMe ? ' (Bạn)' : ''}</span>
              <div className="flex gap-3 font-display text-sm">
                <span title="Lời ôm nhận được">💚 {p.coins.green}</span>
                <span title="Lời ôm trao đi">💛 {p.coins.yellow}</span>
                <span title="Lòng tốt">❤️ {p.coins.red}</span>
              </div>
            </div>
          ))}
        </CartoonCard>
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="w-full max-w-sm">
        <CartoonCard pastel="green" className="p-4">
          <div className="font-display text-xs text-[var(--c-gray-dark)] mb-2">Ý nghĩa đồng xu</div>
          <div className="font-body text-xs text-[var(--c-gray-dark)] leading-relaxed">
            💚 <b>Xu Xanh</b> — lời ôm bạn nhận được<br />
            💛 <b>Xu Vàng</b> — lời ôm bạn trao đi<br />
            ❤️ <b>Xu Đỏ</b> — lòng tốt vô tận trong tim bạn
          </div>
        </CartoonCard>
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="w-full max-w-sm">
        <CartoonCard pastel="blue" className="p-4">
          <div className="font-display text-xs text-[var(--c-gray-dark)] mb-2">Cùng nhau trả lời</div>
          <div className="font-body text-xs text-[var(--c-gray-dark)] leading-relaxed flex flex-col gap-1">
            <div>🌿 Hôm nay gọi tên rõ nhất cảm xúc nào?</div>
            <div>🔍 Học được gì về bản thân?</div>
            <div>💌 Muốn gửi lời cảm ơn đến ai?</div>
          </div>
        </CartoonCard>
      </motion.div>

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.0 }} className="w-full max-w-sm">
        <CartoonCard pastel="pink" className="p-4 text-center border-[3px]">
          <div className="font-display text-xs text-[var(--c-gray-dark)] mb-2">Nghi thức kết thúc</div>
          <div className="font-body text-xs text-[var(--c-gray-dark)] mb-3">
            Cả nhóm đứng thành vòng tròn, nắm tay và đồng thanh:
          </div>
          <div className="font-display text-sm text-[var(--c-pink-dark)] leading-relaxed">
            "CẢM ƠN MÌNH,<br />CẢM ƠN BẠN<br />đã chia sẻ và lắng nghe cảm xúc!"
          </div>
        </CartoonCard>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="w-full max-w-sm pb-8">
        <CartoonButton color="white" className="w-full" onClick={onLeave}>Rời phòng</CartoonButton>
      </motion.div>
    </motion.div>
  )
}
