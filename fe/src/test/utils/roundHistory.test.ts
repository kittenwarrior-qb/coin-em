import { expect, it } from 'vitest'
import { roundHistory } from '@/features/game/selectors/roundHistory'
import { CARD_DATA } from '@/constants/cardCatalog'
import type { GameLogEntry } from '@/components/game/types'

const players = [{ userId: 'sender', socketId: 'sender-socket', name: 'Sender' },
  { userId: 'receiver', socketId: 'receiver-socket', name: 'Receiver' }]
const entry = (type: string, data?: GameLogEntry['data']): GameLogEntry => ({ type,
  actorId: 'sender', targetId: 'receiver', timestamp: 1, ...(data ? { data } : {}) })

it('starts at the latest matching round marker, preserving admitted entry/card identity and input bytes', () => {
  const card = CARD_DATA.situation[0]
  const logs = [entry('ROUND_STARTED', { round: 1 }), entry('SEND_RESPONSE', { message: 'Old fixture' }),
    entry('ROUND_STARTED', { round: 2 }), entry('SEND_RESPONSE', { message: 'Replaced fixture' }),
    entry('ROUND_STARTED', { round: 2 }), entry('SELECT_CARD', { card })]
  const before = JSON.stringify(logs)
  const result = roundHistory(players, logs, 2)
  expect(result.roundLogs).toEqual(logs.slice(4))
  expect(result.roundLogs[1]).toBe(logs[5]); expect(result.visibleRoundLogs[1].item.card).toBe(card)
  expect(result.visibleRoundLogs[1].item.detail).toContain('thẻ Tình huống TH1')
  expect(JSON.stringify(logs)).toBe(before)
})

it('retains legacy no-marker behavior, omits GAME_STARTED only from rows and never invents absent history', () => {
  const logs = [entry('GAME_STARTED'), entry('SEND_RESPONSE', { message: 'Exact fixture response' })]
  const result = roundHistory(players, logs, 3)
  expect(result.roundLogs).toEqual(logs)
  expect(result.visibleRoundLogs).toHaveLength(1)
  expect(result.visibleRoundLogs[0].item.detail).toBe('"Exact fixture response"')
  expect(roundHistory(players, undefined, 3)).toEqual({ roundLogs: [], visibleRoundLogs: [] })
})

it.each([
  ['red', undefined, 'coin đỏ'], ['yellow', undefined, 'coin vàng'], ['green', undefined, 'coin xanh'],
  ['red', 0, 'coin xanh'], ['unknown', undefined, 'coin'],
] as const)('preserves committed %s and explicit legacy conversion %s wording', (coinType, receiverGainsGreen, color) => {
  const result = roundHistory(players, [entry('GIVE_COIN', { coinType, amount: 2,
    ...(receiverGainsGreen !== undefined ? { receiverGainsGreen } : {}) })], 1)
  expect(result.visibleRoundLogs[0].item.detail).toBe(`Receiver nhận ${receiverGainsGreen ?? 2} ${color} từ lượt tặng này.`)
})

it('keeps rollback and forward phase labels distinct and preserves unknown-event name fallbacks', () => {
  const result = roundHistory(players, [entry('PHASE_CHANGED', { phase: 'emotion-card', direction: 'previous' }),
    entry('PHASE_CHANGED', { phase: 'night', direction: 'next' }),
    { ...entry('UNRECOGNIZED'), actorId: 'system', targetId: 'absent' }], 1)
  expect(result.visibleRoundLogs[0].item.title).toContain('quay về phase trước')
  expect(result.visibleRoundLogs[1].item.title).toBe('Quản trò đã cho lượt chơi tiếp tục (Sender)')
  expect(result.visibleRoundLogs[2].item).toEqual({ title: 'UNRECOGNIZED', detail: 'Hệ thống vừa thực hiện một hành động.' })
})
