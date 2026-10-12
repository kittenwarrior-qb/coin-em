import { describe, expect, it } from 'vitest'
import { createRequire } from 'module'
import baseline from '../../src/constants/webCardBaseline.json'
import { SITUATION_CARDS, EMOTION_CARDS, SELFCARE_CARDS, REFLECTION_CARDS } from '../../src/constants/cards'
import { resolveWebCard, validateCardSelection } from '../../src/modules/game/services/CardCatalog'
import { SelectCardCommand } from '../../src/modules/game/commands/SelectCardCommand'
import { SelectSelfcareCardCommand } from '../../src/modules/game/commands/SelectSelfcareCardCommand'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { Role } from '../../src/modules/game/types'
import { roomView } from '../../src/modules/game/services/RoomView'
import { createMockRoom } from '../helpers/mockData'
import { ROOM_INACTIVITY_MS } from '../../src/retention'

const { readWebCardBaseline } = createRequire(import.meta.url)('../../scripts/read-web-card-baseline.cjs')
const playing = () => new GameEngine().startGame(createMockRoom(7, { settings: {
  situationGroups: ['light', 'medium', 'sensitive'], emotionGroups: ['basic', 'light', 'strong', 'advanced'],
} })).room!
describe('frozen current-web baseline (not a physical catalog migration)', () => {
  it('matches all 100 exact current runtime IDs/categories/front-back pairs and CDN transformations', () => {
    const current = readWebCardBaseline()
    expect(current.cards).toEqual(baseline.cards)
    expect(current.sourceHashes['fe/src/constants/cardImages.ts']).toBe(baseline.sourceHashes['fe/src/constants/cardImages.ts'])
    expect(current.sourceHashes['fe/src/utils/cdnUrl.ts']).toBe(baseline.sourceHashes['fe/src/utils/cdnUrl.ts'])
    expect(new Set(baseline.cards.map(card => card.id)).size).toBe(100)
    expect(baseline.cards.filter(card => card.category === 'situation')).toHaveLength(Object.values(SITUATION_CARDS).flat().length)
    expect(baseline.cards.filter(card => card.category === 'emotion')).toHaveLength(Object.values(EMOTION_CARDS).flat().length)
    expect(baseline.cards.filter(card => card.category === 'reflection')).toHaveLength(REFLECTION_CARDS.length)
    expect(baseline.cards.filter(card => card.category === 'selfcare')).toHaveLength(SELFCARE_CARDS.length)
  })
  it('resolves known syntax aliases only, strips untrusted fields and returns detached copies', () => {
    const input = { id: 'TH1', category: 'situation', frontImage: 'https://attacker.invalid/front', secret: 'synthetic-secret' }
    const card = resolveWebCard(input)!
    expect(card).toEqual(resolveWebCard('situation-TH1'))
    expect(JSON.stringify(card)).not.toMatch(/attacker|secret/)
    card.frontImage = 'modified-copy'
    expect(resolveWebCard('TH1')!.frontImage).not.toBe('modified-copy')
    expect(input.frontImage).toContain('attacker')
  })
  it.each([null, [], { id: 'TH1', category: 'emotion' }, { id: 'sit-1' }, { id: 'reflection-1' },
    { id: 'emotion-vui' }, { id: '__proto__' }, { id: '../TH1' }, Object.create({ id: 'TH1' })].map(input => [input]))('rejects unknown/mismatched/prototype inputs', input => {
    expect(resolveWebCard(input)).toBeNull()
  })
})
describe('server selection boundaries', () => {
  it.each([
    ['emotion-card', 'story-telling', 'emotion-basic-vui'],
    ['reflection-card', 'reflection-sharing', 'PT1'],
    ['situation-card', 'emotion-card', 'TH1'],
  ] as const)('allows reselection after actual finite-cycle rollback to %s without altering coin/audit history', (phase, next, id) => {
    const engine = new GameEngine()
    let room = { ...playing(), phase }
    const action = { type: 'SELECT_CARD' as const, actorId: room.currentNTG!, data: { card: { id } } }
    room = engine.executeAction(room, action).room! as typeof room
    const historyLength = room.gameLog.length
    const coinBefore = JSON.stringify(room.coinCycle)
    const result = engine.previousTurn({ ...room, phase: next }, room.currentNarrator!)
    expect(result.success).toBe(true)
    expect(result.room!.phase).toBe(phase)
    expect(result.room!.gameLog.length).toBeGreaterThan(historyLength)
    expect(JSON.stringify(result.room!.coinCycle)).toBe(coinBefore)
    expect(engine.executeAction(result.room!, action).success).toBe(true)
  })
  it.each([
    ['situation-card', 'TH1'], ['emotion-card', 'emotion-basic-vui'], ['reflection-card', 'PT1'],
  ] as const)('selects canonical cards in %s and persists only server data', (phase, id) => {
    const room = { ...playing(), phase }
    const before = JSON.stringify(room)
    const result = new SelectCardCommand().execute(room, { type: 'SELECT_CARD', actorId: room.currentNTG!,
      data: { card: { id, frontImage: 'https://attacker.invalid/', token: 'synthetic-token' }, extra: 'synthetic-extra' } })
    expect(result.success).toBe(true)
    expect(result.room!.selectedCard).toEqual(resolveWebCard(id))
    expect(result.room!.gameLog.at(-1)!.data).toEqual({ card: resolveWebCard(id), round: room.currentRound })
    expect(JSON.stringify(room)).toBe(before)
    expect(JSON.stringify(result.room)).not.toMatch(/attacker|synthetic-token|synthetic-extra/)
  })
  it.each([
    ['night', 'TH1', 'NOT_CARD_PHASE'], ['situation-card', 'PT1', 'WRONG_CARD_CATEGORY'],
    ['emotion-card', 'BK1', 'WRONG_CARD_CATEGORY'], ['situation-card', 'unknown', 'UNKNOWN_OR_MISMATCHED_CARD'],
  ] as const)('rejects wrong phase/category/ID without changing room', (phase, id, error) => {
    const room = { ...playing(), phase }
    const before = JSON.stringify(room)
    const result = new SelectCardCommand().execute(room, { type: 'SELECT_CARD', actorId: room.currentNTG!, data: { card: { id } } })
    expect(result).toMatchObject({ success: false, error })
    expect(JSON.stringify(room)).toBe(before)
  })
  it('rejects outsiders, non-Sender, terminal and disabled groups', () => {
    const room = { ...playing(), phase: 'situation-card' as const }
    const action = { type: 'SELECT_CARD' as const, actorId: room.currentNTG!, data: { card: { id: 'TH25' } } }
    expect(validateCardSelection(room, { ...action, actorId: 'outsider' }).valid).toBe(false)
    expect(validateCardSelection(room, { ...action, actorId: room.currentNarrator! }).error).toBe('Not a sender')
    expect(validateCardSelection({ ...room, status: 'ended' }, action).error).toBe('GAME_NOT_PLAYING')
    expect(validateCardSelection({ ...room, settings: { ...room.settings, situationGroups: ['light'] } }, action).error).toBe('CARD_GROUP_DISABLED')
    expect(validateCardSelection({ ...room, phase: 'emotion-card', settings: { ...room.settings, emotionGroups: ['basic'] } },
      { ...action, data: { card: { id: 'emotion-advanced-1' } } }).error).toBe('CARD_GROUP_DISABLED')
  })
  it('enforces unique/max-three reflection selection in the current round only', () => {
    const command = new SelectCardCommand()
    let room = { ...playing(), phase: 'reflection-card' as const }
    for (const id of ['PT1', 'PT2', 'PT3']) {
      room = command.execute(room, { type: 'SELECT_CARD', actorId: room.currentNTG!, data: { card: { id } } }).room! as typeof room
    }
    expect(command.execute(room, { type: 'SELECT_CARD', actorId: room.currentNTG!, data: { card: { id: 'PT1' } } }).error).toBe('CARD_ALREADY_SELECTED')
    expect(command.execute(room, { type: 'SELECT_CARD', actorId: room.currentNTG!, data: { card: { id: 'PT4' } } }).error).toBe('REFLECTION_LIMIT_REACHED')
    room.gameLog.push({ type: 'ROUND_STARTED', actorId: 'system', timestamp: Date.now(), data: { round: room.currentRound + 1 } })
    room.currentRound++
    expect(command.execute(room, { type: 'SELECT_CARD', actorId: room.currentNTG!, data: { card: { id: 'PT1' } } }).success).toBe(true)
  })
  it('preserves Guide/selfcare fallback and rejects duplicate action/incorrect category', () => {
    const room = { ...playing(), phase: 'selfcare-card' as const }
    const command = new SelectSelfcareCardCommand()
    const guide = room.players.find(player => player.originalRole === Role.GUIDE)!
    const action = { type: 'SELECT_SELFCARE_CARD' as const, actorId: guide.userId, data: { card: { id: 'BK1' } } }
    expect(command.execute(room, { ...action, actorId: room.currentNTG! }).success).toBe(false)
    expect(command.execute(room, { ...action, data: { card: { id: 'PT1' } } }).error).toBe('WRONG_CARD_CATEGORY')
    const result = command.execute(room, action)
    expect(result.success).toBe(true)
    expect(command.execute(result.room!, action).error).toBe('ACTION_ALREADY_DONE')
    const noGuide = { ...room, players: room.players.map(player => player.userId === guide.userId ? { ...player, isFake: true } : player) }
    expect(command.execute(noGuide, { ...action, actorId: room.currentNTG! }).success).toBe(true)
  })
  it('sanitizes old card projections without rewriting persisted data, and limits resume to one-hour room expiry', () => {
    const room = playing()
    room.selectedCard = { id: 'TH1', frontImage: 'https://attacker.invalid/', secret: 'synthetic-secret' }
    room.gameLog.push({ type: 'SELECT_CARD', actorId: room.currentNTG!, timestamp: Date.now(), data: { card: { id: 'unknown', frontImage: 'https://attacker.invalid/' }, token: 'synthetic-token' } })
    room.players = room.players.map(player => ({ ...player, isDisconnected: true, disconnectedAt: Date.now() }))
    const before = JSON.stringify(room)
    const projection = roomView(room)
    expect(projection.selectedCard).toEqual(resolveWebCard('TH1'))
    expect(projection.gameLog.at(-1)!.data.card).toBeNull()
    expect(projection.resumeExpiresAt).toBe(room.lastActivity + ROOM_INACTIVITY_MS)
    expect(JSON.stringify(projection)).not.toMatch(/attacker|synthetic-secret|synthetic-token/)
    expect(JSON.stringify(room)).toBe(before)
  })
})
