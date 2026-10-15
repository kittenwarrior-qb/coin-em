import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import Lobby from '@/pages/Lobby'
import WaitingRoom from '@/pages/WaitingRoom'
import { AssetPreloaderScreen } from '@/components/AssetPreloaderScreen'
import { HistoryModal } from '@/features/game/components/HistoryModal'
import { ThemePreferenceProvider } from '@/features/theme/ThemePreference'
import '@/styles/themeChooser.css'
import { RoleRewardPicker } from '@/components/game/RoleRewardPicker'
import { NtgRewardPicker } from '@/components/game/NtgRewardPicker'
import { GuessSilencerOverlay } from '@/components/game/PhaseOverlays'
import { MutedNoticeModal, NightActionConfirmModal, PhaseNavConfirmModal, ReflectionRewardConfirmModal, NtgRewardSuccessPopup } from '@/components/game/GameModals'
import { SelectedCardPreview } from '@/features/game/components/SelectedCardPreview'
import { CARD_DATA } from '@/constants/cardCatalog'
import { GiveCoinPicker } from '@/components/game/GiveCoinPicker'
import type { CardPreviewEntry } from '@/features/game/selectors/previewNavigation'
import '@/index.css'

// Local, dev-only presentation fixture. No socket, storage, real identities or commands.
const screen = new URLSearchParams(location.search).get('screen') ?? 'lobby'
const noAction = () => {}
const players = Array.from({ length: 10 }, (_, index) => ({ socketId: `qa-socket-${index}`, userId: `qa-seat-${index}`, name: `QA người ${index + 1}`, avatarIndex: index, bgIndex: index }))
const stress = new URLSearchParams(location.search).has('stress')
const pending = new URLSearchParams(location.search).has('pending')
const longName = 'QA tên người chơi rất dài để kiểm tra xuống dòng và vùng cuộn an toàn'
// This dev-only entry point intentionally mounts its fixture instead of exporting it.
// eslint-disable-next-line react-refresh/only-export-components
function CardPreviewFixture() {
  const selected = { reflections: CARD_DATA.reflection.slice(0, 3) }
  const [preview, setPreview] = useState<CardPreviewEntry>({ card: selected.reflections[1], revealed: true })
  return <SelectedCardPreview preview={preview} selected={selected} phase="reflection-card" scope="qa-only" pending={pending} onChange={setPreview} onClose={noAction} />
}
const logs = stress ? Array.from({ length: 40 }, (_, index) => ({ entry: { timestamp: index, type: 'qa' }, item: { title: `QA sự kiện ${index + 1}`, detail: 'Dữ liệu giả lập để kiểm tra vùng cuộn nhật ký trên màn hình thấp.' } })) : []
const rooms = Array.from({ length: stress ? 30 : 1 }, (_, index) => ({ id: `QA-${index + 1}`, playerCount: 3, hostName: 'QA host' }))
const gamePlayers = players.map((player, index) => ({ ...player, id: player.userId, isMe: index === 0, role: ['Người Kết Nối', 'Người Gợi Mở', 'Người Dẫn Lối'][index % 3], coins: { red: 0, green: 2, yellow: 2 } }))
const picker = screen === 'role-reward' ? <RoleRewardPicker players={gamePlayers} ntgPlayer={gamePlayers[0]} ntgVotedIds={new Set()} onConfirm={noAction} onClose={noAction} />
  : screen === 'ntg-reward' ? <NtgRewardPicker players={gamePlayers} rewardedIds={new Set()} pendingIds={new Set()} onTogglePending={noAction} onConfirm={noAction} onClose={noAction} />
  : screen === 'guess-picker' ? <GuessSilencerOverlay players={gamePlayers} hasVoted={false} onVote={noAction} />
  : screen === 'night-confirm' ? <NightActionConfirmModal action={{ type: 'heal', targetId: 'qa-seat-1', targetName: longName, iconSrc: '/emcoin/icons/orbit/lock.svg' }} pending={pending} onCancel={noAction} onConfirmHeal={noAction} onConfirmSilence={noAction} />
  : screen === 'phase-confirm' ? <PhaseNavConfirmModal navigation={{ direction: 'prev', targetPhase: 'emotion-card' }} activePhase="give-coins" pending={pending} onCancel={noAction} onConfirm={noAction} />
  : screen === 'muted' ? <MutedNoticeModal notice={{ name: longName, isMe: false, nonce: 1 }} onDismiss={noAction} />
  : screen === 'reflection-confirm' ? <ReflectionRewardConfirmModal players={gamePlayers} onSkip={noAction} onConfirm={noAction} />
  : screen === 'success-toast' ? <NtgRewardSuccessPopup names={[longName]} onClose={noAction} />
  : screen === 'card-preview' ? <CardPreviewFixture />
  : screen === 'give-picker' ? <GiveCoinPicker players={gamePlayers.map((p, i) => ({ ...p, isSender: i === 1 }))} myPlayer={gamePlayers[0]} finiteCycle onGiveCoin={async () => false} onClose={noAction} /> : null
const content = screen === 'loading' ? <AssetPreloaderScreen state={{ loaded: 5, total: 10, progress: 50, done: false, currentFile: 'QA local', bgLoaded: 0, bgTotal: 0, bgDone: false }} />
  : picker ? <div className="relative mx-auto h-dvh max-w-[430px]">{picker}</div>
  : screen === 'waiting' ? <WaitingRoom roomId="QA-only" players={players} mySocketId="qa-socket-0" myUserId="qa-seat-0" hostSocketId="qa-seat-0" onStartGame={noAction} onLeave={noAction} />
  : screen === 'history' ? <div className="relative mx-auto h-dvh max-w-[430px] bg-[var(--brand-mint-soft)]"><HistoryModal currentRound={1} logs={logs} onClose={noAction} onPreview={noAction} /></div>
  : <Lobby ready bgDone availableRooms={rooms} onJoinRoom={noAction} onCreateRoom={noAction} onRefreshRooms={noAction} />
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<ThemePreferenceProvider>
  {content}<div data-testid="screen-qa-fixture" className="fixed right-0 top-0 z-[10000] bg-white/90 px-2 font-body text-[10px]">QA local · Dữ liệu giả lập</div>
</ThemePreferenceProvider>)
