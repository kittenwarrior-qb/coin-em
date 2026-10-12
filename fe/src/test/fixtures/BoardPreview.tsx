import { createRoot } from 'react-dom/client'
import GameBoard from '@/pages/GameBoard'
import type { RoomState, PhaseView } from '@/components/game/types'
import { isKnownPhase } from '@/features/game/phases/registry'
import { GAME_ROLES, PHASE_LABELS } from '@/stores/types'
import '@/index.css'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { previewControlTheme } from '@/components/cartoon/controlThemes'

// Dev-only synthetic render fixture: no socket, storage, token or real identity.
const params = new URLSearchParams(window.location.search)
const requested = params.get('phase')
const phase = isKnownPhase(requested) ? requested : 'give-coins'
const count = Math.min(10, Math.max(5, Number(params.get('count')) || 10))
const round = Math.min(10, Math.max(1, Number(params.get('round')) || 1))
const viewer = params.get('viewer') ?? 'narrator'
const narrator = viewer === 'narrator'
const connected = params.get('offline') !== '1'
const current = ({ narrator: 0, sender: 1, healer: 2, silencer: 4 } as Record<string, number>)[viewer] ?? 0
const roles = ['Người Quản trò', 'Người Trao Gửi', GAME_ROLES.healer, GAME_ROLES.guide, GAME_ROLES.silencer, 'Người Kết Nối', 'Người Gợi Mở']
const players: RoomState['players'] = Array.from({ length: count }, (_, index) => ({
  userId: `qa-seat-${index}`, socketId: `qa-socket-${index}`, name: `QA người ${index + 1}`,
  role: roles[index % roles.length], isNarrator: index === 0, isSender: index === 1,
  avatarIndex: index, bgIndex: index, coins: { red: index === 1 ? 20 : 0, green: index === 1 ? 0 : 2, yellow: index === 1 ? 0 : 2 },
}))
const order = Object.keys(PHASE_LABELS).filter(key => key !== 'ended') as PhaseView['phase'][]
const phaseView: PhaseView = {
  version: 'phase-view/v1', phase, position: phase === 'ended' ? null : order.indexOf(phase) + 1,
  total: 16, next: phase === 'ended' ? null : order[order.indexOf(phase) + 1] ?? 'ended',
  previous: phase === 'ended' || phase === 'role-reveal' ? null : order[order.indexOf(phase) - 1],
  capabilities: { advance: narrator && phase !== 'ended', rollback: narrator && phase !== 'ended' && phase !== 'role-reveal',
    heal: current === 2 && phase === 'healer-turn', silence: current === 4 && phase === 'silencer-turn', selectSituation: current === 1 && phase === 'situation-card', selectEmotion: current === 1 && phase === 'emotion-card',
    selectReflection: current === 1 && phase === 'reflection-card', selectSelfcare: false, guessSilencer: current !== 0 && phase === 'guess-silencer', isHealer: current === 2, isSilencer: current === 4 },
}
const room: RoomState = { id: 'local-qa-only', host: 'qa-seat-0', players, status: phase === 'ended' ? 'ended' : 'playing',
  phase, phaseView, currentRound: round, totalRounds: 10, currentNarrator: 'qa-seat-0', currentNTG: 'qa-seat-1',
  gameLog: [], selectedCard: null, nightActions: { healed: false, silenced: false, cardSelected: false },
  coinCycle: { version: 'coin-cycle-60/v1', closed: false, received: {}, history: [] } }
const noAction = () => {} // This page cannot send a gameplay command.
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<ControlThemeProvider root theme={previewControlTheme(window.location.search)}>
  <div data-testid="qa-fixture" className="fixed top-0 right-0 z-[100] rounded-bl-lg bg-white/90 px-2 font-body text-[10px]">QA local · Dữ liệu giả lập</div>
  <GameBoard roomId={room.id} roomState={room} myUserId={`qa-seat-${current}`} mySocketId={`qa-socket-${current}`} isConnected={connected}
    onLeave={noAction} nextTurn={noAction} prevTurn={noAction} nightAction={noAction} emitSelectCard={noAction}
    sendResponse={noAction} ntgVote={noAction} confirmRoleRewards={noAction} shareReflection={noAction}
    emitCardPreview={noAction} emitSituationFanState={noAction} situationPreviewCard={null} situationFanState={null}
    submitVote={noAction} giveCoin={async () => false} />
</ControlThemeProvider>)
