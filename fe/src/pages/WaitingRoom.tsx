import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { useEffect, useRef, useState } from 'react'
import { usePendingNavigationGuard } from '@/features/overlays/usePopupLifecycle'
import { motion } from 'framer-motion'
import {
  CartoonAvatar,
  CartoonButton,
  CartoonCircleButton,
  CartoonDropdown,
  CartoonScreen,
  CartoonScrollArea,
  ProfileModal,
  QuitConfirmModal,
} from '@/components/cartoon'
import { ROLE_TO_IMAGE } from '@/constants/cardImages'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { themeBackdrop, themeLogo, isBrandTheme } from '@/components/cartoon/controlThemes'
import { KawaiiWaitingRoom } from '@/components/kawaii/KawaiiWaitingRoom'

interface Player {
  socketId: string
  userId?: string
  name: string
  avatarIndex?: number
  bgIndex?: number
  isFake?: boolean
  debugPreferredRole?: string
}

interface WaitingRoomProps {
  roundLimit?: number | null
  onUpdateRoundLimit?: (limit: number | null) => Promise<boolean>
  isConnected?: boolean
  startPending?: boolean
  roomId: string
  players: Player[]
  hostSocketId: string
  mySocketId: string
  myUserId?: string
  onStartGame: () => void
  onLeave: () => Promise<boolean> | void
  onAddFakePlayers?: () => void
  onUpdateProfile?: (name: string, avatarIndex: number, bgIndex: number) => Promise<boolean> | void
  onSetDebugRolePreference?: (targetUserId: string, role: string) => void
  debugRolePickerEnabled?: boolean
}

export default function WaitingRoom({
  roundLimit = null,
  onUpdateRoundLimit,
  isConnected = true,
  startPending = false,
  roomId,
  players,
  hostSocketId,
  myUserId,
  onStartGame,
  onLeave,
  onAddFakePlayers,
  onUpdateProfile,
  onSetDebugRolePreference,
  debugRolePickerEnabled: serverDebugRolePickerEnabled,
}: WaitingRoomProps) {
  const theme = useControlTheme()
  const [showQuit, setShowQuit] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [roundChoice, setRoundChoice] = useState(roundLimit === null ? 'auto' : String(roundLimit))
  const [roundPending, setRoundPending] = useState(false)
  const [roundMessage, setRoundMessage] = useState('')
  const roundBusy = useRef(false)
  useEffect(() => { setRoundChoice(roundLimit === null ? 'auto' : String(roundLimit)) }, [roundLimit, roomId])
  usePendingNavigationGuard(roundPending)
  const desiredRounds = roundChoice === 'auto' ? null : Number(roundChoice)
  const roundDirty = desiredRounds !== roundLimit
  const roundValid = desiredRounds === null || (Number.isInteger(desiredRounds) && desiredRounds >= 1 && desiredRounds <= Math.min(players.length, 10))
  const confirmedValid = roundLimit === null || (Number.isInteger(roundLimit) && roundLimit >= 1 && roundLimit <= Math.min(players.length, 10))
  async function saveRounds() {
    if (!onUpdateRoundLimit || roundBusy.current || !roundValid) return
    roundBusy.current = true; setRoundPending(true); setRoundMessage('')
    try { setRoundMessage(await onUpdateRoundLimit(desiredRounds) ? 'Đã lưu số lượt.' : 'Chưa xác nhận được số lượt. Kiểm tra cấu hình phòng rồi thử lại.') }
    catch { setRoundMessage('Chưa xác nhận được số lượt. Thử lại đúng lựa chọn này.') }
    finally { roundBusy.current = false; setRoundPending(false) }
  }

  const myPlayer = players.find(p => p.userId === myUserId)
  const myDisplayName = myPlayer?.name ?? ''
  const myAvatarIndex = myPlayer?.avatarIndex ?? 0
  const myBgIndex = myPlayer?.bgIndex ?? 0

  const hostUserId = hostSocketId
  const isHost = myUserId === hostUserId
  const canStart = players.length >= 5 && players.length <= 10
  const MAX_PLAYERS = 10
  const canHostPickRoles = serverDebugRolePickerEnabled === true && isHost

  const [
    ROLE_NARRATOR,
    ROLE_SENDER,
    ROLE_HEALER,
    ROLE_GUIDE,
    ROLE_OPENER,
    ROLE_SILENCER,
    ROLE_CONNECTOR,
  ] = Object.keys(ROLE_TO_IMAGE)

  const getRoleDeck = (count: number) => {
    if (count >= 10) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_CONNECTOR, ROLE_OPENER, ROLE_OPENER, ROLE_GUIDE, ROLE_HEALER]
    if (count === 9) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_CONNECTOR, ROLE_OPENER, ROLE_GUIDE, ROLE_HEALER]
    if (count === 8) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_OPENER, ROLE_GUIDE, ROLE_HEALER]
    if (count === 7) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_OPENER, ROLE_GUIDE, ROLE_HEALER]
    if (count === 6) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_OPENER, ROLE_GUIDE]
    return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_OPENER]
  }

  const countRoles = (roles: string[]) =>
    roles.reduce<Record<string, number>>((acc, role) => {
      acc[role] = (acc[role] ?? 0) + 1
      return acc
    }, {})

  const roleDeck = getRoleDeck(players.length)
  const roleCapacity = countRoles(roleDeck)
  const selectedRoleCounts = countRoles([
    ROLE_NARRATOR,
    ...(players
      .filter(p => p.userId !== hostUserId)
      .map(p => p.debugPreferredRole)
      .filter(Boolean) as string[]),
  ])

  const getRoleOptionsForPlayer = (player: Player) =>
    roleDeck
      .filter(role => role !== ROLE_NARRATOR)
      .filter((role, index, arr) => arr.indexOf(role) === index)
      .filter(role => role === player.debugPreferredRole || (selectedRoleCounts[role] ?? 0) < (roleCapacity[role] ?? 0))
      .map(role => ({ value: role, label: role }))

  const assignDebugRole = (player: Player, role: string) => {
    if (!player.userId || !roleDeck.includes(role)) return
    onSetDebugRolePreference?.(player.userId, role)
  }

  const slots = [
    ...players,
    ...Array(Math.max(0, MAX_PLAYERS - players.length)).fill(null),
  ]

  return (
    <CartoonScreen data-testid="waiting-room" data-ui-screen="waiting" panel={false}>
      {theme==='candy-clouds'?<KawaiiWaitingRoom roomId={roomId} players={players} myUserId={myUserId} hostId={hostUserId}
        onProfile={()=>setShowProfile(true)} onLeave={()=>setShowQuit(true)} isHost={isHost} startPending={startPending}
        startDisabled={!canStart||!isConnected||roundPending||roundDirty||!confirmedValid} onStart={onStartGame}
        roundChoice={roundChoice} onRoundChoice={value=>{setRoundChoice(value);setRoundMessage('')}}
        roundDisabled={!isHost||!onUpdateRoundLimit||roundPending||startPending||!isConnected} roundValid={roundValid} confirmedValid={confirmedValid}
        roundDirty={roundDirty} roundPending={roundPending} roundMessage={roundMessage} saveRounds={()=>void saveRounds()} onAddFakePlayers={isHost?onAddFakePlayers:undefined}
        renderDebugRole={canHostPickRoles?player=>player.userId!==hostUserId?<CartoonDropdown options={getRoleOptionsForPlayer(player)} value={players.find(item=>item.socketId===player.socketId)?.debugPreferredRole} placeholder="Chọn role" disabled={!canStart} onChange={role=>assignDebugRole(player,role)}/>:null:undefined}
      />:<div
        className="screen-panel flex flex-col items-center overflow-y-auto pt-[88px] pb-6"
        style={{
          height: '100%',
          backgroundImage: themeBackdrop(theme, 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(/capybara_wallpaper.jpg)'),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          <EmcoinImage data-ui-chrome="waiting-logo" src={themeLogo(theme)} alt="EmCoin" style={{ height: isBrandTheme(theme) ? 72 : 52, width: isBrandTheme(theme) ? 190 : undefined, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }} />
        </div>

        <div
          data-ui-chrome="waiting-panel"
          className="w-[calc(100%-32px)] my-auto shrink-0 rounded-3xl flex flex-col gap-3 px-4 py-5"
          style={{
            maxWidth: '22rem',
            background: theme !== 'legacy' ? 'rgba(247,252,255,.94)' : 'rgba(220, 252, 231, 0.82)',
            backdropFilter: theme !== 'legacy' ? 'blur(12px)' : 'blur(100px)',
          }}
        >
          <div className="flex justify-center">
            <div className="inline-flex flex-col items-center gap-1 px-5 py-2 rounded-2xl bg-white/80">
              <h2 className="font-display text-2xl leading-tight" style={{ color: theme !== 'legacy' ? '#A15C75' : '#ff6993' }}>Phòng chờ</h2>
              <div className="inline-flex items-center gap-1.5">
                <span className="font-body text-xs text-[var(--c-gray)]">Mã phòng:</span>
                <span data-testid="room-id" className="font-display text-xs tracking-wider">{roomId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="font-body text-xs text-[var(--c-gray)]">Người chơi</span>
            <span data-testid="player-count" className="font-display text-xs">{players.length} / {MAX_PLAYERS}</span>
          </div>

          {canHostPickRoles && !canStart && (
            <div data-testid="role-pick-hint" className="text-center font-body text-[11px] text-black/50 px-1">
              Cần đủ 5 người mới chọn role được
            </div>
          )}

          <CartoonScrollArea
            className="flex-shrink-0"
            style={{ height: canHostPickRoles ? 260 : isBrandTheme(theme) ? `clamp(120px, calc(100dvh - ${roundDirty || !confirmedValid || (desiredRounds !== null && desiredRounds < players.length) ? 540 : 440}px), 450px)` : 220 }}
            alwaysShowScrollbar
            data-testid="player-list"
          >
            <div className="grid grid-cols-1 gap-2 pb-2 pt-1">
              {slots.map((player, idx) => {
                if (!player) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-dashed border-black/15 bg-white/30"
                    >
                      <div className="w-9 h-9 rounded-full bg-black/8 flex items-center justify-center flex-shrink-0">
                        <span className="text-black/25 text-lg">+</span>
                      </div>
                      <span className="font-body text-xs text-black/30">Đang chờ người chơi...</span>
                    </div>
                  )
                }

                const isMe = player.userId === myUserId
                const isPlayerHost = player.userId === hostUserId
                const displayName = isMe && myDisplayName ? myDisplayName : player.name

                return (
                  <motion.div
                    key={player.socketId}
                    data-testid={`waiting-player-${player.name}`}
                    data-ui-chrome="waiting-player"
                    role={isMe ? 'button' : undefined}
                    tabIndex={isMe ? 0 : undefined}
                    aria-label={isMe ? `Chỉnh hồ sơ của ${displayName}` : undefined}
                    onKeyDown={isMe ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setShowProfile(true) } } : undefined}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl border border-black/8 cursor-pointer"
                    style={{ background: theme !== 'legacy' ? (isMe ? 'var(--brand-blush-soft)' : 'var(--brand-ivory)') : isMe ? 'rgba(254,240,138,0.85)' : 'rgba(255,255,255,0.7)' }}
                    onClick={isMe ? () => setShowProfile(true) : undefined}
                  >
                    <div className="relative flex-shrink-0">
                      <CartoonAvatar
                        name={player.name}
                        avatarIndex={isMe ? myAvatarIndex : (player.avatarIndex ?? idx)}
                        bgIndex={isMe ? myBgIndex : (player.bgIndex ?? idx)}
                        size={isBrandTheme(theme) ? 'sm' : 'lg'}
                      />
                      {isMe && (
                        <div className="absolute pointer-events-none" style={{ bottom: isBrandTheme(theme) ? -4 : -24, right: -8 }}>
                          <CartoonCircleButton
                            color="purple"
                            iconSrc="/emcoin/icons/orbit/photo.svg"
                            iconSize="50%"
                            style={{ height: 24, width: 24 }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-display text-base break-words leading-tight">{displayName}</div>
                      {!canHostPickRoles && isBrandTheme(theme) && (isMe || isPlayerHost) && <div className="font-body text-xs mt-1">{[isMe ? 'Bạn' : '', isPlayerHost ? 'Chủ phòng' : ''].filter(Boolean).join(' · ')}</div>}
                      {canHostPickRoles && (
                        <div className="font-body text-[10px] text-black/45 truncate">
                          {isPlayerHost ? ROLE_NARRATOR : (player.debugPreferredRole ?? 'Chưa chọn role')}
                        </div>
                      )}
                    </div>

                    {!canHostPickRoles && !isBrandTheme(theme) && isMe && (
                      <span data-ui-ink="accent" className="font-display text-sm" style={{ color: '#f59e0b' }}>Bạn</span>
                    )}

                    {!canHostPickRoles && !isBrandTheme(theme) && isPlayerHost && (
                      <div data-ui-pill="cream" className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300">
                        <EmcoinImage src="/emcoin/icons/orbit/facilitator.svg" alt="" className="w-4 h-4" />
                        <span className="font-display text-sm text-amber-700">Host</span>
                      </div>
                    )}

                    {canHostPickRoles && (
                      <div className="w-32 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {isPlayerHost ? (
                          <div data-ui-pill="cream" className="flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-amber-100 border border-amber-300">
                            <EmcoinImage src="/emcoin/icons/orbit/facilitator.svg" alt="" className="w-4 h-4" />
                            <span className="font-display text-[10px] text-amber-700 truncate">Quản trò</span>
                          </div>
                        ) : (
                          <CartoonDropdown
                            options={getRoleOptionsForPlayer(player)}
                            value={player.debugPreferredRole}
                            placeholder="Chọn role"
                            disabled={roleDeck.length === 0 || !canStart}
                            onChange={(role) => assignDebugRole(player, role)}
                          />
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </CartoonScrollArea>

          <div className="flex flex-col gap-2">
            <section className="rounded-2xl border border-[var(--brand-edge)] bg-[var(--brand-ivory)] p-3 font-body text-sm text-[var(--brand-ink)]" aria-label="Số lượt chơi">
              <label className="flex items-center justify-between gap-3">Số lượt
                <select aria-label="Số lượt chơi" value={roundChoice} onChange={event => { setRoundChoice(event.target.value); setRoundMessage('') }}
                  disabled={!isHost || !onUpdateRoundLimit || roundPending || startPending || !isConnected}
                  className="min-h-11 min-w-0 rounded-xl border border-[var(--brand-edge)] bg-white px-2">
                  <option value="auto">Mỗi người một lượt ({players.length})</option>
                  {Array.from({ length: Math.min(players.length, 10) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} lượt</option>)}
                  {!roundValid && <option value={roundChoice}>{roundChoice} lượt (cần chọn lại)</option>}
                </select>
              </label>
              {!confirmedValid && <p role="alert" className="mt-2">Số lượt vượt số người hiện có. Quản trò cần chọn lại trước khi bắt đầu.</p>}
              {desiredRounds !== null && desiredRounds < players.length && <p className="mt-2">Ván ngắn: không phải tất cả người chơi đều có lượt làm Người Trao Gửi.</p>}
              {isHost && roundDirty && <CartoonButton className="mt-2 w-full" size="sm" pending={roundPending} disabled={!roundValid || !isConnected || startPending} onClick={() => void saveRounds()}>Lưu số lượt</CartoonButton>}
              {roundMessage && <p role="status" className="mt-2">{roundMessage}</p>}
            </section>
            {isHost ? (
              <>
                <CartoonButton
                  color={canStart ? 'green' : 'gray'}
                  size="lg"
                  className="w-full"
                  pending={startPending}
                  disabled={!canStart || !isConnected || roundPending || roundDirty || !confirmedValid}
                  onClick={onStartGame}
                  data-testid="btn-start-game"
                >
                  {canStart ? 'Bắt đầu' : `Bắt đầu (${players.length}/5)`}
                </CartoonButton>
                {onAddFakePlayers && players.length < MAX_PLAYERS && (
                  <CartoonButton color="orange" className="w-full" onClick={onAddFakePlayers} data-testid="btn-add-bots">
                    Thêm Bot
                  </CartoonButton>
                )}
              </>
            ) : (
              <div className="text-center py-2 font-display text-sm" data-testid="waiting-for-host">
                Đang chờ host bắt đầu...
              </div>
            )}
            <CartoonButton color="white" className="w-full" disabled={roundPending} onClick={() => setShowQuit(true)} data-testid="btn-leave-room">
              Rời phòng
            </CartoonButton>
          </div>
        </div>
      </div>}

      <QuitConfirmModal
        open={showQuit}
        onConfirm={async () => { if (await onLeave() === true) { setShowQuit(false); return true } return false }}
        onCancel={() => setShowQuit(false)}
        message="Bạn có muốn rời phòng không?"
        subMessage="Bạn sẽ mất chỗ trong phòng!"
        confirmLabel="Rời"
        cancelLabel="Ở lại"
      />

      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        currentName={myDisplayName || (players.find(p => p.userId === myUserId)?.name ?? '')}
        currentAvatarIndex={myAvatarIndex}
        currentBgIndex={myBgIndex}
        onSave={async (name, avatarIdx, bgIdx) => {
          if (await onUpdateProfile?.(name, avatarIdx, bgIdx) !== true) return false
          return true
        }}
      />
    </CartoonScreen>
  )
}
