import type { GamePhase } from '@/stores/types'
import type { PhaseView } from '@/components/game/types'

type Status = { title: string; description?: string }
export interface StatusContext {
  isSender: boolean
  isNarrator: boolean
  isHealer: boolean
  isSilencer: boolean
  healerDone: boolean
  silencerDone: boolean
  emotionSelected: boolean
  selfcareTurn: boolean
  selfcareChooser: string
  canGuess: boolean
  rewardsConfirmed: boolean
  finiteCoins: boolean
}
/** Exhaustive presentation registry. No transition or permission decisions. */
export const PHASE_UI: Record<GamePhase, (context: StatusContext) => Status> = {
  'role-reveal': () => ({ title: 'Nhận vai trò' }),
  night: () => ({ title: 'Đêm bắt đầu' }),
  'healer-turn': c => c.healerDone ? { title: 'Người Chữa Lành đã chọn xong' } : c.isHealer
    ? { title: 'Lượt của bạn', description: 'Chọn một người để bảo vệ' } : { title: 'Người Chữa Lành đang chọn' },
  'silencer-turn': c => c.silencerDone ? { title: 'Người Im Lặng đã chọn xong' } : c.isSilencer
    ? { title: 'Lượt của bạn', description: 'Chọn một người để làm im lặng' } : { title: 'Người Im Lặng đang chọn' },
  'situation-card': c => c.isSender ? { title: 'Chọn thẻ Tình huống', description: 'Chọn một thẻ phù hợp' } : { title: 'Người Trao Gửi đang chọn thẻ' },
  'emotion-card': c => c.isSender ? c.emotionSelected ? { title: 'Đã chọn thẻ Cảm xúc' }
    : { title: 'Chọn thẻ Cảm xúc', description: 'Bạn đang cảm thấy thế nào?' } : { title: 'Người Trao Gửi đang chọn thẻ' },
  'story-telling': c => ({ title: c.isSender ? 'Kể chuyện của bạn' : 'Người Trao Gửi đang kể chuyện' }),
  'group-response': c => ({ title: c.finiteCoins ? c.isSender ? 'Lắng nghe và trao Coin Đỏ' : 'Cả bàn cùng phản hồi'
    : c.isSender ? 'Chọn phản hồi hay nhất' : c.isNarrator && c.rewardsConfirmed ? 'Người Trao Gửi đã tặng coin xong' : 'Cả bàn cùng phản hồi' }),
  'reflection-card': c => c.isSender ? { title: 'Chọn tối đa 3 thẻ Phản tư', description: 'Chọn những thẻ phù hợp với suy nghĩ của bạn' } : { title: 'Người Trao Gửi đang chọn thẻ' },
  'reflection-sharing': c => c.isSender ? { title: 'Chia sẻ suy nghĩ', description: 'Hãy chia sẻ điều bạn cảm nhận được' } : { title: 'Người Trao Gửi đang chia sẻ' },
  'selfcare-card': c => c.selfcareTurn ? { title: 'Chọn Bí kíp ôm', description: 'Chọn một thẻ để cả nhóm cùng thực hiện' } : { title: `${c.selfcareChooser} đang chọn Bí kíp ôm` },
  'hug-action': () => ({ title: 'Cả nhóm cùng ôm nhau' }),
  'guess-silencer': c => c.canGuess ? { title: 'Ai là Người Im Lặng?', description: 'Nhìn xuống màn hình để bình chọn' } : { title: 'Cả bàn đang suy đoán' },
  'reveal-silencer': () => ({ title: 'Công bố vai trò' }),
  'give-coins': () => ({ title: 'Trao Coin theo cảm nhận', description: 'Không bắt buộc sử dụng hết Coin' }),
  reward: () => ({ title: 'Kết thúc lượt' }),
  ended: () => ({ title: 'Kết thúc' }),
}
export function isKnownPhase(value: unknown): value is GamePhase {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PHASE_UI, value)
}
export function availableCapabilities(view: PhaseView, connected: boolean): PhaseView['capabilities'] {
  if (connected) return view.capabilities
  return { advance: false, rollback: false, heal: false, silence: false,
    selectSituation: false, selectEmotion: false, selectReflection: false, selectSelfcare: false,
    guessSilencer: false, isHealer: view.capabilities.isHealer, isSilencer: view.capabilities.isSilencer }
}
const capabilityKeys = ['advance', 'rollback', 'heal', 'silence', 'selectSituation', 'selectEmotion', 'selectReflection', 'selectSelfcare', 'guessSilencer', 'isHealer', 'isSilencer'] as const
export function validPhaseView(value: unknown, phase: unknown): value is PhaseView {
  if (!value || typeof value !== 'object' || !isKnownPhase(phase)) return false
  const view = value as PhaseView
  return view.version === 'phase-view/v1' && view.phase === phase &&
    Number.isInteger(view.total) && view.total >= 1 && view.total <= 16 &&
    (phase === 'ended' ? view.position === null && view.next === null && view.previous === null &&
      capabilityKeys.filter(key => key !== 'isHealer' && key !== 'isSilencer').every(key => view.capabilities?.[key] === false)
      : Number.isInteger(view.position) && view.position !== null && view.position >= 1 && view.position <= view.total) &&
    (view.next === null || isKnownPhase(view.next)) && (view.previous === null || isKnownPhase(view.previous)) &&
    !!view.capabilities && capabilityKeys.every(key => typeof view.capabilities[key] === 'boolean')
}
