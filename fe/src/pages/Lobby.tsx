import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CartoonButton, CartoonCircleButton, CartoonModal, CartoonScreen } from '@/components/cartoon'
import { JoinRoomModal } from '@/components/lobby/JoinRoomModal'
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal'
import { GameMenuModal } from '@/components/lobby/GameMenuModal'
import { PopIn } from '@/components/PopIn'
import type { RoomListItem } from '@/components/lobby/RoomCard'
import type { ResumeCandidate } from '@/hooks/useSocket'

interface SplashRect { left: number; top: number; w: number; h: number }

function LogoFly({ splashLogoRect, ready, logoRef }: { splashLogoRect: SplashRect | null; ready: boolean; logoRef: React.RefObject<HTMLImageElement | null> }) {
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
        src="/emcoin_logo.png"
        alt="EmCoin"
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
  onJoinRoom: (roomId: string, userName: string) => void
  onCreateRoom: (userName: string, cardDecks?: { situation: Record<string, boolean>; emotion: Record<string, boolean> }) => void
  onRefreshRooms: () => void
  ready?: boolean
  splashLogoRect?: SplashRect | null
  bgDone?: boolean
  bgLoaded?: number
  bgTotal?: number
  resumeCandidates?: ResumeCandidate[]
  onResumeRoom?: (candidate: ResumeCandidate) => void
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
}: LobbyProps) {
  const [joinOpen, setJoinOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const homeLogoRef = useRef<HTMLImageElement>(null)
  const autoOpenedResumeRef = useRef(false)
  const latestResume = resumeCandidates[0]

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
    <CartoonScreen data-testid="lobby" purpleBg>
      <div
        className="flex-1 flex flex-col justify-center p-8 gap-4 relative"
        data-testid="lobby-menu"
      >
        <div className="absolute top-4 right-4">
          {ready ? (
            <PopIn delay={0.16}>
              <CartoonCircleButton
                color="purple"
                size="sm"
                iconSrc="/cartoon/icons/Settings.svg"
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
              iconSrc="/cartoon/icons/Settings.svg"
              iconAlt="Cài đặt"
              iconSize="40%"
              aria-label="Cài đặt"
              style={{ height: 45, width: 45 }}
              onClick={() => setMenuOpen(true)}
            />
          )}
        </div>

        <div className="absolute top-[66px] right-4">
          <PopIn delay={0.22}>
            <CartoonCircleButton
              color="violet"
              size="sm"
              iconSrc="/cartoon/icons/Arrow-Simple-Right.svg"
              iconAlt="Tiếp tục phòng"
              iconSize="35%"
              aria-label="Tiếp tục phòng"
              style={{ height: 45, width: 45 }}
              onClick={() => setResumeOpen(true)}
              badge={latestResume ? resumeCandidates.length : undefined}
            />
          </PopIn>
        </div>

        <div className="text-center" style={{ marginBottom: 32, marginTop: -40 }}>
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
      </div>

      {!bgDone && (
        <div className="flex items-center justify-center pb-4 gap-2">
          <img src="/cartoon/icons/Loading-Spinner.svg" alt="" className="w-4 h-4 spin-cartoon opacity-60" />
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

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreateRoom}
      />

      <GameMenuModal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onGuide={() => { setMenuOpen(false) }}
        onSettings={() => { setMenuOpen(false) }}
      />

      <CartoonModal open={resumeOpen} onClose={() => setResumeOpen(false)} title="Tiếp tục">
        <div className="flex flex-col gap-3 py-2">
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
                  <CartoonButton
                    color="green"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setResumeOpen(false)
                      onResumeRoom?.(candidate)
                    }}
                  >
                    Tham gia lại
                  </CartoonButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </CartoonModal>
    </CartoonScreen>
  )
}
