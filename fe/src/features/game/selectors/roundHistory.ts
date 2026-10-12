import type { GameLogEntry, RoomState } from '@/components/game/types'
import { PHASE_LABELS, type CardData } from '@/stores/types'

export interface HistoryItem { title: string; detail: string; card?: CardData }

function cardName(card?: CardData) {
  if (!card) return 'một thẻ'
  const match = card.id.match(/([A-Z]{1,3}\d+|\d+)$/i)
  if (card.category === 'situation') return `thẻ Tình huống ${match?.[1]?.toUpperCase() ?? ''}`.trim()
  if (card.category === 'emotion') return `thẻ Cảm xúc ${card.subType ? `nhóm ${card.subType}` : ''}`.trim()
  if (card.category === 'reflection') return `thẻ Phản tư ${match?.[1]?.toUpperCase() ?? ''}`.trim()
  if (card.category === 'selfcare') return `thẻ Bí kíp ôm ${match?.[1]?.toUpperCase() ?? ''}`.trim()
  return 'một thẻ'
}
function coinName(coinType?: string) {
  if (coinType === 'red') return 'coin đỏ'
  if (coinType === 'yellow') return 'coin vàng'
  if (coinType === 'green') return 'coin xanh'
  return 'coin'
}
function historyItem(entry: GameLogEntry, players: RoomState['players'], currentRound: number): HistoryItem | null {
  const name = (userId?: string) => players.find(player => player.userId === userId)?.name ||
    (userId === 'system' ? 'Hệ thống' : 'Người chơi')
  const phaseName = (phase?: string) => phase && (PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? phase)
  const actorName = name(entry.actorId), targetName = name(entry.targetId)
  const card = entry.data?.card
  const narratorTitle = `Quản trò đã cho lượt chơi tiếp tục (${actorName})`
  const senderTitle = `Người Trao Gửi (${actorName})`
  switch (entry.type) {
    case 'GAME_STARTED': return null
    case 'PHASE_CHANGED':
      if (entry.data?.direction === 'previous') return {
        title: `Quản trò đã cho quay về phase trước: ${phaseName(entry.data.phase) ?? 'giai đoạn trước'} (${actorName})`,
        detail: `Cả bàn quay lại: ${phaseName(entry.data.phase) ?? 'giai đoạn trước'}.`,
      }
      return { title: narratorTitle, detail: `Cả bàn chuyển sang: ${phaseName(entry.data?.phase) ?? 'giai đoạn tiếp theo'}.` }
    case 'SILENCE': return { title: 'Người Im Lặng đã chọn mục tiêu', detail: 'Một người chơi sẽ bị im lặng trong lượt này.' }
    case 'HEAL': return { title: 'Người Chữa Lành đã chọn mục tiêu', detail: 'Một người chơi được bảo vệ khỏi hiệu ứng im lặng.' }
    case 'SELECT_CARD': return { title: `${senderTitle} đã chọn thẻ tình huống`,
      detail: `Thẻ được chọn là ${cardName(card)}. Nhấn vào thẻ bên dưới để xem lại.`, card }
    case 'SELECT_SELFCARE_CARD': return { title: `${senderTitle} đã chọn thẻ Bí kíp ôm`,
      detail: `Thẻ được chọn là ${cardName(card)}. Nhấn vào thẻ bên dưới để xem lại.`, card }
    case 'SEND_RESPONSE': return { title: 'Một người chơi đã gửi phản hồi',
      detail: entry.data?.message ? `"${entry.data.message}"` : 'Người chơi đã gửi phản hồi cho câu chuyện.' }
    case 'NTG_VOTE': return { title: `${senderTitle} đã chọn phản hồi nổi bật`, detail: `${targetName} nhận thêm ${entry.data?.bonus ?? 5} coin vàng.` }
    case 'SHARE_REFLECTION': return { title: `${senderTitle} đã chia sẻ phần phản tư`, detail: `Người Trao Gửi nhận thêm ${entry.data?.bonus ?? 5} coin vàng.` }
    case 'ROLE_REWARD': return { title: `Quản trò đã xác nhận ${targetName} hoàn thành vai trò`, detail: `${targetName} nhận thêm ${entry.data?.bonus ?? 2} coin vàng.` }
    case 'GIVE_COIN': return { title: `Một người chơi đã tặng ${coinName(entry.data?.coinType)} cho ${targetName}`,
      detail: `${targetName} nhận ${entry.data?.receiverGainsGreen ?? entry.data?.amount ?? 1} ${coinName(entry.data?.receiverGainsGreen !== undefined ? 'green' : entry.data?.coinType)} từ lượt tặng này.` }
    case 'REWARDS_CALCULATED': return { title: 'Đã tổng kết phần thưởng cuối lượt',
      detail: entry.data?.silencerFound ? 'Cả nhóm đã tìm ra Người Im Lặng.' : 'Cả nhóm chưa tìm ra Người Im Lặng.' }
    case 'ROUND_STARTED': return { title: `Bắt đầu round ${entry.data?.round ?? currentRound}`, detail: 'Vai trò lượt mới và trạng thái người chơi đã được làm mới.' }
    default: return { title: entry.type,
      detail: targetName !== 'Người chơi' ? `${actorName} tương tác với ${targetName}.` : `${actorName} vừa thực hiện một hành động.` }
  }
}

/** Input is already recipient-projected. This does not reconstruct or fetch logs. */
export function roundHistory(players: RoomState['players'], logs: readonly GameLogEntry[] | undefined, currentRound: number) {
  const start = (logs ?? []).reduce((latest, entry, index) =>
    entry.type === 'ROUND_STARTED' && entry.data?.round === currentRound ? index : latest, -1)
  const roundLogs = (logs ?? []).slice(start >= 0 ? start : 0)
  const visibleRoundLogs = roundLogs.map(entry => ({ entry, item: historyItem(entry, players, currentRound) }))
    .filter((row): row is { entry: GameLogEntry; item: HistoryItem } => Boolean(row.item))
  return { roundLogs, visibleRoundLogs }
}
