import type { ReactNode } from 'react'
import { CartoonButton } from '@/components/cartoon'
import type { GamePhase } from '@/stores/types'
import type { PhaseView } from '@/components/game/types'

export interface BoardPhaseActionsProps {
  scope: string
  phase: GamePhase
  capabilities: PhaseView['capabilities']
  connected: boolean
  pending: boolean
  isNarrator: boolean
  isSender: boolean
  isSelfcareTurn: boolean
  finiteCoins: boolean
  rewardsConfirmed: boolean
  emotionSelected: boolean
  reflectionCount: number
  selfcareSelected: boolean
  previous: GamePhase | null
  next: GamePhase | null
  nextDisabled: boolean
  checkpointLocked: boolean
  onNavigate: (direction: 'prev' | 'next', target: GamePhase) => void
  onOpenInventory: (category: 'emotion' | 'reflection' | 'selfcare') => void
  onAdvance: () => void
  onOpenGiveCoin: () => void
  onOpenTargetedCoin: () => void
  onOpenLegacyRewards: () => void
}

type ActionContext = BoardPhaseActionsProps
const noActions = () => null

/** Presentation only. Phase, destinations and permissions are admitted by Board. */
export const PHASE_ACTION_RENDERERS: Record<GamePhase, (context: ActionContext) => ReactNode> = {
  'role-reveal': noActions,
  night: noActions,
  'healer-turn': noActions,
  'silencer-turn': noActions,
  'situation-card': noActions,
  'emotion-card': c => c.isSender ? (
    <CartoonButton color="pink" size="sm" className="w-full" disabled={!c.capabilities.selectEmotion}
      onClick={() => c.onOpenInventory('emotion')} data-testid="btn-select-emotion">
      {c.emotionSelected ? 'Đổi thẻ' : 'Cảm xúc'}
    </CartoonButton>
  ) : null,
  'story-telling': noActions,
  'group-response': c => <>
    {c.isSender && (
      <CartoonButton color={c.rewardsConfirmed ? 'orange' : 'yellow'} size="md" className="w-full"
        disabled={!c.finiteCoins && c.rewardsConfirmed}
        onClick={() => {
          if (c.finiteCoins) c.onOpenGiveCoin()
          else if (!c.rewardsConfirmed) c.onOpenLegacyRewards()
        }} data-testid="btn-open-ntg-reward-picker">
        {c.finiteCoins ? 'Trao Coin Đỏ' : c.rewardsConfirmed ? 'Đã chọn' : 'Tặng coin'}
      </CartoonButton>
    )}
    {!c.isSender && (c.finiteCoins || !c.isNarrator) && (
      <CartoonButton color="yellow" size="md" className="w-full" onClick={c.onOpenTargetedCoin}
        data-testid="btn-give-coin-to-ntg">
        {c.finiteCoins ? 'Trao Coin Xanh cho Người Trao Gửi' : 'Tặng coin cho NTG'}
      </CartoonButton>
    )}
  </>,
  'reflection-card': c => c.isSender ? <>
    {c.reflectionCount < 3 && (
      <CartoonButton color="teal" size="md" className="w-full" disabled={!c.capabilities.selectReflection}
        onClick={() => c.onOpenInventory('reflection')} data-testid="btn-select-reflection">
        {c.reflectionCount === 0 ? 'Chọn thẻ phản tư' : `Thêm thẻ (${c.reflectionCount}/3)`}
      </CartoonButton>
    )}
    {c.reflectionCount > 0 && (
      <CartoonButton color="green" size="md" className="w-full" disabled={!c.capabilities.advance}
        pending={c.pending} onClick={c.onAdvance} data-testid="btn-confirm-reflection">
        Xác nhận ({c.reflectionCount} thẻ)
      </CartoonButton>
    )}
  </> : null,
  'reflection-sharing': noActions,
  'selfcare-card': c => c.isSelfcareTurn ? (
    <CartoonButton color="teal" size="sm" className="w-full" onClick={() => c.onOpenInventory('selfcare')}
      data-testid="btn-select-selfcare">
      {c.selfcareSelected ? 'Đổi thẻ' : 'Chọn thẻ bí kíp ôm'}
    </CartoonButton>
  ) : null,
  'hug-action': noActions,
  'guess-silencer': noActions,
  'reveal-silencer': noActions,
  'give-coins': c => (
    <CartoonButton color="yellow" size="md" className="w-full" onClick={c.onOpenGiveCoin}
      data-testid="btn-open-give-coin-picker">Tặng coin</CartoonButton>
  ),
  reward: noActions,
  ended: noActions,
}
