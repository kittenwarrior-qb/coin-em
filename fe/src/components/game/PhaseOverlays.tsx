/**
 * All bottom-sheet overlays that appear during specific game phases.
 * Kept in one file since they share the same slide-up animation pattern.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CartoonButton, CartoonCard, CartoonBadge } from '@/components/cartoon'
import { AVATAR_BG_COLORS, AVATAR_ICONS } from '@/components/cartoon/avatarConfig'
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
          <div className="text-center">
            <div className="font-display text-base text-[var(--c-pink)]">{'Đoán Người Im Lặng'}</div>
            <div className="mt-1 font-body text-[11px] leading-snug text-black/55">
              {'Chọn người bạn nghĩ là Người Im Lặng trong lượt này.'}
            </div>
          </div>
          <div className="grid max-h-[58dvh] grid-cols-2 gap-2 overflow-x-hidden overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {players.filter(p => !p.isMe).map((player) => {
              const playerIndex = players.findIndex((p) => p.id === player.id)
              const avatarIndex = player.avatarIndex ?? playerIndex
              const bgIndex = player.bgIndex ?? playerIndex

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onVote(player.id)}
                  className="relative flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border-2 border-white bg-white p-2 text-left shadow-[0_2px_0_rgba(0,0,0,0.12)] transition-all active:translate-y-[1px]"
                  data-testid={`btn-vote-silencer-${player.name}`}
                >
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white shadow-[0_2px_0_rgba(0,0,0,0.18)]"
                    style={{ background: AVATAR_BG_COLORS[Math.abs(bgIndex) % AVATAR_BG_COLORS.length] }}
                  >
                    <img
                      src={AVATAR_ICONS[Math.abs(avatarIndex) % AVATAR_ICONS.length]}
                      alt=""
                      className="h-9 w-9 object-contain"
                      draggable={false}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-display text-xs text-[#2F76AC]">{player.name}</div>
                    <div className="truncate font-body text-[10px] text-black/50">{'Chạm để đoán'}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <motion.div
          initial={{ scale: 0.86, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 460, damping: 20 }}
          className="rounded-2xl bg-[var(--c-sky-mist)] px-4 py-4 text-center"
        >
          <img src="/cartoon/icons/Checkmark-Cartoon.svg" alt="" className="mx-auto mb-2 h-12 w-12 object-contain drop-shadow" draggable={false} />
          <div className="font-display text-sm text-[var(--c-pink)]">{'Đã ghi nhận bình chọn'}</div>
          <div className="mt-1 font-body text-[11px] leading-snug text-black/55">
            {'Chờ cả bàn hoàn tất bình chọn.'}
          </div>
        </motion.div>
      )}
    </BottomSheet>
  )
}

// Reveal silencer
const REVEAL_ROLE_META = {
  narrator: { label: 'Quản trò', color: '#FFB830', icon: '/cartoon/icons/Crown.svg' },
  sender: { label: 'Người trao gửi', color: '#FF6B9D', icon: '/cartoon/icons/Flower-Multicolor.svg' },
  healer: { label: 'Người chữa lành', color: '#62C76D', icon: '/cartoon/icons/Life-Bag.svg' },
  silencer: { label: 'Người im lặng', color: '#7D7F8C', icon: '/cartoon/icons/Lock-Gold.svg' },
  connector: { label: 'Người kết nối', color: '#3FA7F5', icon: '/cartoon/icons/Magic.svg' },
  opener: { label: 'Người gợi mở', color: '#A66CFF', icon: '/cartoon/icons/Gift-Pink-Border.svg' },
  guide: { label: 'Người dẫn lối', color: '#F59E42', icon: '/cartoon/icons/Key-Gold.svg' },
  unknown: { label: 'Vai trò', color: '#2F76AC', icon: '/cartoon/icons/Star-Yellow.svg' },
}

function getRevealRoleMeta(player: Player) {
  if (player.isNarrator) return REVEAL_ROLE_META.narrator
  if (player.isSender) return REVEAL_ROLE_META.sender

  const role = player.role ?? ''
  const normalized = role.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const compact = normalized.replace(/[^a-z?]+/g, '')

  if (normalized.includes('quan tro') || compact.includes('qu?ntro')) return REVEAL_ROLE_META.narrator
  if (normalized.includes('trao gui') || compact.includes('traog?i')) return REVEAL_ROLE_META.sender
  if (normalized.includes('chua lanh') || compact.includes('ch?al?nh')) return REVEAL_ROLE_META.healer
  if (normalized.includes('im lang') || compact.includes('iml?ng')) return REVEAL_ROLE_META.silencer
  if (normalized.includes('ket noi') || compact.includes('k?tnoi')) return REVEAL_ROLE_META.connector
  if (normalized.includes('goi mo') || compact.includes('g?im?')) return REVEAL_ROLE_META.opener
  if (normalized.includes('dan loi') || compact.includes('d?nl?i')) return REVEAL_ROLE_META.guide
  return REVEAL_ROLE_META.unknown
}


interface RevealSilencerProps {
  players: Player[]
  votes: Record<string, string>
  onCloseComplete?: () => void
}

export function RevealSilencerOverlay({ players, votes, onCloseComplete }: RevealSilencerProps) {
  const [closing, setClosing] = useState(false)
  const [hidden, setHidden] = useState(false)

  const voteCounts = Object.values(votes).reduce<Record<string, number>>((acc, targetId) => {
    acc[targetId] = (acc[targetId] ?? 0) + 1
    return acc
  }, {})

  const silencer = players.find(p => getRevealRoleMeta(p) === REVEAL_ROLE_META.silencer)
  const silencerVotes = silencer ? (voteCounts[silencer.userId ?? silencer.id] ?? 0) : 0
  const totalVoters = Object.keys(votes).length
  const others = players.filter(p => p.id !== silencer?.id)

  const close = () => setClosing(true)
  if (hidden) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]"
      onClick={close}
      onAnimationComplete={() => {
        if (closing && !hidden) { setHidden(true); onCloseComplete?.() }
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: closing ? 0.92 : 1, y: closing ? 16 : 0, opacity: closing ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className="relative w-full max-w-sm rounded-[28px] border-[3px] border-[var(--c-black)] bg-white p-5 shadow-[0_8px_0_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-2 z-20 font-display text-xl leading-none text-[var(--c-pink)]"
          onClick={close}
          aria-label="Đóng"
        >×</button>

        <div className="text-center mb-5">
          <div className="font-display text-base text-[var(--c-pink)]">🎭 Tiết lộ vai trò!</div>
        </div>

        {/* Silencer hero card */}
        {silencer && (() => {
          const idx = players.findIndex(p => p.id === silencer.id)
          const avatarIdx = silencer.avatarIndex ?? idx
          const bgIdx = silencer.bgIndex ?? idx
          const caught = silencerVotes > 0
          return (
            <div className="mb-5 rounded-3xl border-[3px] border-[#7D7F8C] bg-[#f4f4f6] px-4 py-4 text-center shadow-[0_4px_0_rgba(0,0,0,0.14)]">
              <img
                src="/cartoon/icons/Lock-Sliver.svg"
                alt=""
                className="mx-auto mb-2 h-10 w-10 object-contain drop-shadow"
                draggable={false}
              />
              <div
                className="mx-auto grid h-20 w-20 place-items-center rounded-full border-[3px] border-[#7D7F8C] shadow-[0_3px_0_rgba(0,0,0,0.18)]"
                style={{ background: AVATAR_BG_COLORS[Math.abs(bgIdx) % AVATAR_BG_COLORS.length] }}
              >
                <img
                  src={AVATAR_ICONS[Math.abs(avatarIdx) % AVATAR_ICONS.length]}
                  alt=""
                  className="h-14 w-14 object-contain"
                  draggable={false}
                />
              </div>
              <div className="mt-2 font-display text-base text-[#2F76AC]">
                {silencer.isMe ? 'Bạn' : silencer.name}
              </div>
              <div className="mt-1 inline-block rounded-full bg-[#7D7F8C] px-3 py-0.5 font-display text-[11px] text-white">
                Người Im Lặng
              </div>
              {totalVoters > 0 && (
                <div className={['mt-2 font-body text-[11px]', caught ? 'text-green-600' : 'text-black/40'].join(' ')}>
                  {caught ? `✓ ${silencerVotes}/${totalVoters} người đoán đúng!` : 'Không ai đoán ra 🫢'}
                </div>
              )}
            </div>
          )
        })()}

        {/* Other players — compact rows */}
        {others.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            {others.map((player) => {
              const idx = players.findIndex(p => p.id === player.id)
              const avatarIdx = player.avatarIndex ?? idx
              const bgIdx = player.bgIndex ?? idx
              const roleMeta = getRevealRoleMeta(player)
              return (
                <div key={player.id} className="flex flex-col items-center gap-1 rounded-2xl border-2 bg-white py-2.5 px-1 shadow-[0_2px_0_rgba(0,0,0,0.08)]" style={{ borderColor: `${roleMeta.color}66` }}>
                  <div
                    className="grid h-11 w-11 place-items-center rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.12)]"
                    style={{ background: AVATAR_BG_COLORS[Math.abs(bgIdx) % AVATAR_BG_COLORS.length], borderColor: roleMeta.color }}
                  >
                    <img src={AVATAR_ICONS[Math.abs(avatarIdx) % AVATAR_ICONS.length]} alt="" className="h-8 w-8 object-contain" draggable={false} />
                  </div>
                  <div className="w-full truncate px-0.5 text-center font-display text-[10px] text-[#2F76AC]">
                    {player.isMe ? 'Bạn' : player.name}
                  </div>
                  <div className="rounded-full px-1.5 py-0.5 font-display text-[8px]" style={{ backgroundColor: `${roleMeta.color}18`, color: roleMeta.color }}>
                    {roleMeta.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <CartoonButton color="green" size="md" className="w-full" onClick={close}>
          Đã xem
        </CartoonButton>
      </motion.div>
    </motion.div>
  )
}

interface RewardProps {
  players: Player[]
  currentRound: number
  totalRounds: number
  isNarrator: boolean
  onNext: () => void
}

export function RewardOverlay({ players, currentRound, totalRounds, isNarrator, onNext }: RewardProps) {
  const ownPlayer = players.find(p => p.isMe) ?? players[0]
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/40"
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

        {ownPlayer && (
          <div className="px-3 py-2 card-cartoon card-cartoon-sm">
            <div className="font-display text-sm text-[#2F76AC]">{'Điểm coin của bạn'}</div>
            <div className="mt-2 flex justify-center gap-4 font-display text-sm">
              <span>{'\u{1F49A}'} {ownPlayer.coins.green}</span>
              <span>{'\u{1F49B}'} {ownPlayer.coins.yellow}</span>
              <span>{'❤️'} {ownPlayer.coins.red}</span>
            </div>
          </div>
        )}

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
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--c-cream)] px-6 gap-5 overflow-y-auto scroll-cartoon"
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
