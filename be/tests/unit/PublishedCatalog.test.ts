import { afterEach, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { CatalogStore } from '../../src/catalog/CatalogStore'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'
import { configureRuntimeCatalog, LEGACY_CATALOG_VERSION, runtimeCatalog } from '../../src/catalog/runtimeCatalog'
import { RoomService } from '../../src/modules/room/services/RoomService'
import { createMockRoom, createMockPlayer } from '../helpers/mockData'
import { resolveWebCard } from '../../src/modules/game/services/CardCatalog'
import { roomView } from '../../src/modules/game/services/RoomView'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { Role, type Room } from '../../src/modules/game/types'

let store: CatalogStore | undefined
afterEach(() => { configureRuntimeCatalog(); store?.close(); store = undefined })
function prepare() {
  store = new CatalogStore(':memory:')
  // Real transcribed PDF content; reviewed fixture only, no production draft mutation.
  store.seed(pdfCatalogDraft().map(card => ({ ...card, reviewed: true })))
  const version = store.snapshot(1, randomUUID()).version
  configureRuntimeCatalog(store)
  return version
}
it('pins new rooms, retains old versions across edits/activation/rollback, and never trusts client faces', () => {
  const version = prepare(), service = new RoomService()
  const legacy = service.createRoom('legacy-pinned', createMockPlayer(), false)
  expect(legacy.catalogVersion).toBe(LEGACY_CATALOG_VERSION)
  expect(store!.readPublished(version)).toBeNull()
  store!.activate(version, 2, randomUUID())
  const room = service.createRoom('pdf-pinned', createMockPlayer(), false)
  expect(room.catalogVersion).toBe(version)
  const source = store!.draft().cards.find(card => card.category === 'situation')!
  const oldCard = resolveWebCard({ id: source.id, frontImage: 'https://attacker.invalid/x', name: 'Forgery' }, room)!
  expect(oldCard.frontImage).toBe(source.frontImageUrl)
  expect(resolveWebCard(source.id, legacy)).toBeNull()
  expect(resolveWebCard('TH1', room)).toBeNull()
  store!.save({ ...source, name: 'Edited new version', frontImageUrl: '/cards/version2.webp' }, store!.draft().revision, randomUUID())
  const next = store!.snapshot(store!.draft().revision, randomUUID()).version
  store!.activate(next, store!.draft().revision, randomUUID())
  expect(service.createRoom('next-pinned', createMockPlayer(), false).catalogVersion).toBe(next)
  expect(resolveWebCard(source.id, room)).toEqual(oldCard)
  store!.activate(null, store!.draft().revision, randomUUID())
  expect(service.createRoom('rollback-new', createMockPlayer(), false).catalogVersion).toBe(LEGACY_CATALOG_VERSION)
  expect(runtimeCatalog(version)).toHaveLength(100)
  expect(store!.readPublished(next)).toHaveLength(100)
  expect(resolveWebCard('TH1', { catalogVersion: `catalog-${'f'.repeat(64)}` })).toBeNull()
  expect(new GameEngine().startGame({ ...createMockRoom(5), catalogVersion: `catalog-${'f'.repeat(64)}` }).error).toBe('CATALOG_UNAVAILABLE')
})
it('deduplicates activation receipts and blocks invalid role/group bindings without publication', () => {
  const version = prepare(), requestId = randomUUID()
  expect(store!.activate(version, 2, requestId)).toMatchObject({ revision: 3, scope: 'new-rooms-only' })
  expect(store!.activate(version, 2, requestId)).toMatchObject({ revision: 3, replayed: true })
  expect(() => store!.activate(null, 2, requestId)).toThrow('CATALOG_REQUEST_CONFLICT')
  const role = store!.draft().cards.find(card => card.category === 'role')!
  store!.save({ ...role, roleKey: 'sender' }, 3, randomUUID())
  const bad = store!.snapshot(4, randomUUID()).version
  expect(() => store!.activate(bad, 5, randomUUID())).toThrow('CATALOG_RUNTIME_BINDING_REQUIRED')
  expect(store!.activeVersion()).toBe(version)
  expect(store!.readPublished(bad)).toBeNull()
  expect(store!.draft().revision).toBe(5)
})
it('keeps both combined emotion definitions and seven semantic roles independent of display titles', () => {
  const cards = pdfCatalogDraft()
  expect(cards).toHaveLength(100)
  expect(cards.every(card => !!(card.definition || card.prompt).trim())).toBe(true)
  expect(cards.filter(card => card.category === 'emotion').every(card => card.faceText?.front && card.faceText.back)).toBe(true)
  const love = cards.find(card => card.name === 'Yêu mến')!
  expect(love.faceText?.front).toContain('phức hợp')
  expect(love.faceText?.back).toContain('gắn bó')
  expect(new Set(cards.filter(card => card.category === 'role').map(card => card.roleKey)).size).toBe(7)
})
it.each([[5,1],[5,5],[10,1],[10,10]])('plays the pinned PDF deck through all %s-seat/%s-round phases with three-color receipts', (seats, rounds) => {
  const version = prepare(); store!.activate(version, 2, randomUUID())
  const engine = new GameEngine()
  let room: Room = engine.startGame({ ...createMockRoom(seats), roundLimit: rounds, catalogVersion: version,
    settings: { situationGroups: ['light', 'medium', 'sensitive'], emotionGroups: ['basic', 'light', 'strong', 'advanced'] } }).room!
  expect(room).toBeDefined()
  const visited = new Set<string>(), senders = new Set<string>()
  let iterations = 0
  while (room.status !== 'ended' && iterations++ < 200) {
    visited.add(room.phase); senders.add(room.currentNTG!)
    const category = ({ 'situation-card': 'situation', 'emotion-card': 'emotion', 'reflection-card': 'reflection', 'selfcare-card': 'selfcare' } as Record<string,string>)[room.phase]
    if (category) {
      const selectionActor = category === 'selfcare' ? room.players.find(p => p.originalRole === Role.GUIDE && !p.isFake)?.userId ?? room.currentNTG! : room.currentNTG!
      const capability = ({ situation: 'selectSituation', emotion: 'selectEmotion', reflection: 'selectReflection', selfcare: 'selectSelfcare' } as const)[category as 'situation' | 'emotion' | 'reflection' | 'selfcare']
      expect(roomView(room, selectionActor).phaseView?.capabilities[capability]).toBe(true)
      const cards = runtimeCatalog(version)!.filter(card => card.category === category).slice(0, category === 'reflection' ? 3 : 1)
      for (const card of cards) {
        const actorId = category === 'selfcare' ? room.players.find(p => p.originalRole === Role.GUIDE && !p.isFake)?.userId ?? room.currentNTG! : room.currentNTG!
        const selected = engine.executeAction(room, { type: category === 'selfcare' ? 'SELECT_SELFCARE_CARD' : 'SELECT_CARD', actorId, data: { card: { id: card.id } } })
        expect(selected.success, `${room.phase}: ${selected.error}`).toBe(true)
        room = selected.room!
        expect(roomView(room, actorId).selectedCard?.frontImage).toBe(card.frontImageUrl)
      }
    }
    if (room.phase === 'give-coins') {
      const sender = room.currentNTG!, others = room.players.filter(p => p.userId !== sender)
      for (const [actorId, targetId, coinType] of [[sender, others[0].userId, 'red'], [others[0].userId, sender, 'green'], [others[0].userId, others[1].userId, 'yellow']] as const) {
        const result = engine.executeAction(room, { type: 'GIVE_COIN', actorId, targetId, data: { amount: 1, coinType, requestId: randomUUID(), round: room.currentRound } })
        expect(result.success, result.error).toBe(true); room = result.room!
      }
    }
    const advanced = engine.advanceTurn(room, room.currentNarrator!)
    expect(advanced.success, `${room.phase}: ${advanced.error}`).toBe(true); room = advanced.room!
    expect(room.catalogVersion).toBe(version)
  }
  expect(room.status).toBe('ended')
  expect(senders.size).toBe(rounds)
  expect(room.coinCycle!.history).toHaveLength(rounds)
  expect([...visited]).toEqual(expect.arrayContaining(['role-reveal', 'night', 'situation-card', 'emotion-card', 'reflection-card', 'selfcare-card', 'hug-action', 'give-coins', 'reward']))
  expect(room.coinCycle!.history.reduce((sum, round) => sum + Object.values(round.received).reduce((n, coins) => n + coins.red + coins.green + coins.yellow, 0), 0)).toBe(rounds * 3)
  expect(roomView(JSON.parse(JSON.stringify(room))).catalogVersion).toBe(version)
})
