import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CartoonButton, CartoonCircleButton, CartoonModal, CartoonScreen } from '@/components/cartoon'
import { JoinRoomModal } from '@/components/lobby/JoinRoomModal'
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal'
import { GameMenuModal } from '@/components/lobby/GameMenuModal'
import { PopIn } from '@/components/PopIn'
import type { RoomListItem } from '@/components/lobby/RoomCard'
import type { ResumeCandidate } from '@/hooks/useSocket'
import { useConfirmedAction } from '@/features/game/controllers/useConfirmedAction'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { isBrandTheme, themeLogo } from '@/components/cartoon/controlThemes'
import { BrandHome } from '@/components/lobby/BrandHome'
import { GuideBook } from '@/components/game/GuideBook'

interface SplashRect { left: number; top: number; w: number; h: number }

function LogoFly({ splashLogoRect, ready, logoRef }: { splashLogoRect: SplashRect | null; ready: boolean; logoRef: React.RefObject<HTMLImageElement | null> }) {
  const theme = useControlTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [flyFrom, setFlyFrom] = useState<{ x: number; y: number; scale: number } | null>(null)
  const measured = useRef(false)

  useLayoutEffect(() => {
    if (measured.current || !ready || !splashLogoRect || !containerRef.current) return
    measured.current = true
    const el = containerRef.current
    const hr = el.getBoundingClientRect()
    const homeCX = hr.left + hr.width / 2
    const homeCY = hr.top + hr.height / 2
    const splashCX = splashLogoRect.left + splashLogoRect.w / 2
    const splashCY = splashLogoRect.top + splashLogoRect.h / 2
    const scaleFrom = splashLogoRect.h / hr.height
    setFlyFrom({ x: splashCX - homeCX, y: splashCY - homeCY, scale: scaleFrom })
  }, [ready, splashLogoRect])

  return (
    <div ref={containerRef} style={{ display: 'inline-block', visibility: flyFrom || !splashLogoRect ? 'visible' : 'hidden' }}>
      <motion.img
        ref={logoRef}
        id="home-logo"
        src={themeLogo(theme)}
        alt={isBrandTheme(theme) ? 'EmCoin — Đồng tiền tử tế' : 'EmCoin'}
        className="mx-auto"
        initial={flyFrom ? { x: flyFrom.x, y: flyFrom.y, scale: flyFrom.scale } : false}
        animate={{ x: 0, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.34, 1.2, 0.64, 1] }}
        style={{ height: 100, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))', display: 'block' }}
      />
    </div>
  )
}

interface LobbyProps {
  availableRooms: RoomListItem[]
  onJoinRoom: (roomId: string, userName: string) => Promise<boolean> | void
  onCreateRoom: (userName: string, cardDecks?: { situation: Record<string, boolean>; emotion: Record<string, boolean> }) => Promise<boolean> | void
  onRefreshRooms: () => void
  ready?: boolean
  splashLogoRect?: SplashRect | null
  bgDone?: boolean
  bgLoaded?: number
  bgTotal?: number
  resumeCandidates?: ResumeCandidate[]
  onResumeRoom?: (candidate: ResumeCandidate) => Promise<boolean> | void
  onDismissResume?: (roomId: string) => void
}

export default function Lobby({
  availableRooms,
  onJoinRoom,
  onCreateRoom,
  onRefreshRooms,
  ready = true,
  splashLogoRect,
  bgDone = true,
  bgLoaded = 0,
  bgTotal = 0,
  resumeCandidates = [],
  onResumeRoom,
  onDismissResume,
}: LobbyProps) {
  const theme = useControlTheme()
  const branded = isBrandTheme(theme)
  const [guideOpen, setGuideOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const homeLogoRef = useRef<HTMLImageElement>(null)
  const autoOpenedResumeRef = useRef(false)
  const latestResume = resumeCandidates[0]
  const { pending: resumePending, run: confirmResume, error: resumeError } = useConfirmedAction('resume', resumeOpen)
  const [resumeConfirmationError, setResumeConfirmationError] = useState<string | null>(null)

  useEffect(() => {
    if (!joinOpen) return
    onRefreshRooms()
    const id = setInterval(onRefreshRooms, 3000)
    return () => clearInterval(id)
  }, [joinOpen, onRefreshRooms])

  useEffect(() => {
    if (autoOpenedResumeRef.current || resumeCandidates.length === 0) return
    autoOpenedResumeRef.current = true
    setResumeOpen(true)
  }, [resumeCandidates.length])

  return (
    <CartoonScreen data-testid="lobby" data-ui-screen="home" purpleBg>
      {branded ? <BrandHome
        logo={<LogoFly splashLogoRect={splashLogoRect ?? null} ready={ready} logoRef={homeLogoRef} />}
        onJoin={() => setJoinOpen(true)} onCreate={() => setCreateOpen(true)}
        onMenu={() => setMenuOpen(true)} onGuide={() => setGuideOpen(true)}
        onResume={() => setResumeOpen(true)} resumeCount={resumeCandidates.length}
      /> : <div
        className="flex-1 flex flex-col justify-center p-8 gap-4 relative"
        data-testid="lobby-menu"
      >
        {/* About button — top left */}
        <div className="absolute top-4 left-4 z-10">
          <PopIn delay={0.16}>
            <CartoonCircleButton
              color="blue"
              size="sm"
              iconSrc="/emcoin/icons/orbit/help.svg"
              iconAlt="Về dự án"
              iconSize="42%"
              aria-label="Về dự án"
              style={{ height: 45, width: 45 }}
              onClick={() => window.open('/about', '_blank')}
            />
          </PopIn>
        </div>

        <div className="absolute top-4 right-4 z-10">
          {ready ? (
            <PopIn delay={0.16}>
              <CartoonCircleButton
                color="purple"
                size="sm"
                iconSrc="/emcoin/icons/orbit/settings.svg"
                iconAlt="Cài đặt"
                iconSize="40%"
                aria-label="Cài đặt"
                style={{ height: 45, width: 45 }}
                onClick={() => setMenuOpen(true)}
              />
            </PopIn>
          ) : (
            <CartoonCircleButton
              color="purple"
              size="sm"
              iconSrc="/emcoin/icons/orbit/settings.svg"
              iconAlt="Cài đặt"
              iconSize="40%"
              aria-label="Cài đặt"
              style={{ height: 45, width: 45 }}
              onClick={() => setMenuOpen(true)}
            />
          )}
        </div>

        <div className="absolute top-[66px] right-4 z-10">
          <PopIn delay={0.22}>
            <CartoonCircleButton
              color="violet"
              size="sm"
              iconSrc="/emcoin/icons/orbit/play.svg"
              iconAlt="Tiếp tục phòng"
              iconSize="35%"
              aria-label="Tiếp tục phòng"
              style={{ height: 45, width: 45 }}
              onClick={() => setResumeOpen(true)}
              badge={latestResume ? resumeCandidates.length : undefined}
            />
          </PopIn>
        </div>

        <div data-ui-chrome="home-logo" className="text-center" style={{ marginBottom: 32, marginTop: -40 }}>
          <LogoFly splashLogoRect={splashLogoRect ?? null} ready={ready} logoRef={homeLogoRef} />
        </div>

        {ready ? (
          <PopIn delay={0}>
            <CartoonButton color="blue" size="lg" className="w-full" onClick={() => setJoinOpen(true)} data-testid="btn-join-room">
              Tìm phòng
            </CartoonButton>
          </PopIn>
        ) : (
          <CartoonButton color="blue" size="lg" className="w-full" onClick={() => setJoinOpen(true)} data-testid="btn-join-room">
            Tìm phòng
          </CartoonButton>
        )}

        {ready ? (
          <PopIn delay={0.08}>
            <CartoonButton color="pink" size="lg" className="w-full" onClick={() => setCreateOpen(true)} data-testid="btn-create-room">
              Tạo phòng
            </CartoonButton>
          </PopIn>
        ) : (
          <CartoonButton color="pink" size="lg" className="w-full" onClick={() => setCreateOpen(true)} data-testid="btn-create-room">
            Tạo phòng
          </CartoonButton>
        )}
      </div>}

      {!bgDone && (
        <div className="flex items-center justify-center pb-4 gap-2">
          <EmcoinImage src="/emcoin/icons/orbit/spinner.svg" alt="" className="w-4 h-4 spin-cartoon opacity-60" />
          <span className="font-body text-xs" style={{ color: 'var(--c-gray)' }}>
            Downloading... {bgLoaded}/{bgTotal}
          </span>
        </div>
      )}

      <JoinRoomModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        availableRooms={availableRooms}
        onJoin={onJoinRoom}
        onRefresh={onRefreshRooms}
      />
      {guideOpen && <GuideBook onClose={() => setGuideOpen(false)} />}

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreateRoom}
      />

      <GameMenuModal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSettings={() => { setMenuOpen(false) }}
      />

      <CartoonModal open={resumeOpen} onClose={resumePending ? undefined : () => setResumeOpen(false)} persistent={resumePending} hideClose={resumePending} title="Tiếp tục">
        <fieldset disabled={resumePending} className="flex min-w-0 flex-col gap-3 border-0 py-2">
          <div className="text-center font-body text-xs text-black/55">
            Phòng còn dữ liệu khôi phục trong 2 giờ nếu bị ngắt.
          </div>

          {resumeCandidates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="rounded-2xl bg-[var(--c-sky-mist)] px-4 py-5 text-center font-display text-sm text-[var(--c-gray)]">
                Không có phòng nào để chơi tiếp
              </div>
              <CartoonButton
                color="purple"
                size="sm"
                className="mx-auto"
                onClick={() => setResumeOpen(false)}
              >
                Bỏ qua
              </CartoonButton>
            </div>
          ) : (
            <div className="flex max-h-[52dvh] flex-col gap-2 overflow-y-auto pr-1">
              {resumeCandidates.map((candidate) => (
                <div key={candidate.roomId} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl bg-[var(--c-sky-mist)] px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-display text-sm text-[var(--c-black)]">{candidate.userName}</div>
                    <div className="font-body text-[11px] leading-snug text-black/60">
                      Phòng {candidate.roomId} · {candidate.role || 'Chưa rõ vai'}
                    </div>
                    <div className="font-body text-[11px] leading-snug text-black/60">
                      Round {candidate.round ?? 0}/{candidate.totalRounds ?? '?'} · {candidate.phase || candidate.status || 'waiting'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={resumePending}
                      className="shrink-0 flex items-center justify-center h-9 w-9 rounded-full bg-[var(--c-red)]/15 border-2 border-[var(--c-red)]/40 transition-all active:scale-95"
                      onClick={() => onDismissResume?.(candidate.roomId)}
                      aria-label={`Xóa phòng ${candidate.roomId}`}
                      data-testid={`btn-dismiss-resume-${candidate.roomId}`}
                      data-ui-chrome="circle"
                    >
                      <EmcoinImage
                        src="/emcoin/icons/orbit/close.svg"
                        alt=""
                        className="h-4 w-4 object-contain opacity-70"
                        draggable={false}
                      />
                    </button>
                    <CartoonButton
                      color="green"
                      size="sm"
                      className="shrink-0"
                      pending={resumePending}
                      onClick={async () => {
                        if (await confirmResume(async isCurrent => {
                          setResumeConfirmationError(null)
                          const result = onResumeRoom?.(candidate)
                          const confirmed = result === undefined ? true : await result
                          if (!confirmed && isCurrent()) setResumeConfirmationError('Chưa xác nhận khôi phục phòng. Phiên vẫn được giữ trên thiết bị.')
                          return confirmed
                        })) setResumeOpen(false)
                      }}
                    >
                      Tham gia lại
                    </CartoonButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </fieldset>
        {(resumeError || resumeConfirmationError) && <p role="alert" className="font-body text-sm">{resumeError || resumeConfirmationError}</p>}
      </CartoonModal>
    </CartoonScreen>
  )
}
