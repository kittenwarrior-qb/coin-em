import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { io as connect, Socket } from 'socket.io-client'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { createMockRoom } from '../helpers/mockData'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { roomRepository } from '../../src/modules/room'
import { resolveWebCard } from '../../src/modules/game/services/CardCatalog'
import { redisClient } from '../../src/redis'
import { loadRooms } from '../../src/persistence'
import { CatalogStore } from '../../src/catalog/CatalogStore'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'
import { configureRuntimeCatalog } from '../../src/catalog/runtimeCatalog'
import { randomUUID } from 'node:crypto'

describe('actual production card selection and preview socket boundary', () => {
  let server: Awaited<ReturnType<typeof createIsolatedServer>>
  let sender: Socket, spectator: Socket, roomId: string
  let publishedStore: CatalogStore | undefined
  beforeEach(async () => {
    server = await createIsolatedServer()
    const clients = await Promise.all([0, 1].map(async () => {
      const socket = connect(server.url, { transports: ['websocket'], reconnection: false })
      await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject) })
      return socket
    }))
    ;[sender, spectator] = clients
    const initial = new GameEngine().startGame(createMockRoom(5)).room!
    roomId = initial.id
    const viewer = initial.players.find(player => !player.isSender && !player.isNarrator)!
    const room = { ...initial, phase: 'situation-card' as const, settings: { ...initial.settings, situationGroups: ['light'] as const },
      players: initial.players.map(player => player.isSender ? { ...player, socketId: sender.id! }
        : player.userId === viewer.userId ? { ...player, socketId: spectator.id! } : player) }
    roomRepository.getRawMap().set(room.id, { ...room, settings: { ...room.settings, situationGroups: ['light'] } })
    await server.io.sockets.sockets.get(sender.id!)!.join(room.id)
    await server.io.sockets.sockets.get(spectator.id!)!.join(room.id)
  })
  afterEach(async () => {
    sender?.disconnect(); spectator?.disconnect()
    await server?.close()
    roomRepository.clear()
    configureRuntimeCatalog(); publishedStore?.close(); publishedStore = undefined
  })
  const action = (payload: object): Promise<any> => new Promise((resolve, reject) =>
    sender.timeout(2000).emit('select_card', { roomId, ...payload }, (error: Error | null, result: any) => error ? reject(error) : resolve(result)))
  it('previews/selects/persists the pinned published PDF card and rejects legacy aliases even after active rollback', async () => {
    publishedStore = new CatalogStore(':memory:'); publishedStore.seed(pdfCatalogDraft().map(card => ({ ...card, reviewed: true })))
    const version = publishedStore.snapshot(1, randomUUID()).version
    publishedStore.activate(version, 2, randomUUID()); configureRuntimeCatalog(publishedStore)
    roomRepository.getRawMap().set(roomId, { ...roomRepository.findById(roomId)!, catalogVersion: version })
    expect((await action({ card: { id: 'TH1' } })).success).toBe(false)
    expect((await action({ card: { id: 'pdf-v1-situation-25' } })).success).toBe(false)
    const preview = new Promise<any>(resolve => spectator.once('card_preview', resolve))
    sender.emit('card_preview', { roomId, card: { id: 'pdf-v1-situation-1', frontImage: 'https://attacker.invalid/x' } })
    expect((await preview).card.frontImage).toBe('/emcoin/decks/pdf-v1/page-019.webp')
    const event = new Promise<any>(resolve => spectator.once('card_selected', resolve))
    expect((await action({ card: { id: 'pdf-v1-situation-1', frontImage: 'https://attacker.invalid/x' } })).success).toBe(true)
    const delivered = await event
    expect(delivered.room.catalogVersion).toBe(version)
    expect(delivered.room.selectedCard.frontImage).toBe('/emcoin/decks/pdf-v1/page-019.webp')
    expect(JSON.stringify(delivered)).not.toContain('attacker')
    publishedStore.activate(null, 3, randomUUID())
    const hydrate = new Promise<any>(resolve => spectator.once('room_state', resolve))
    spectator.emit('get_room_state', { roomId })
    expect((await hydrate).selectedCard).toEqual(delivered.room.selectedCard)
    expect(loadRooms().get(roomId)!.catalogVersion).toBe(version)
  })

  it('commits/broadcasts/hydrates exact server card data, never client image URLs/extra fields', async () => {
    const event = new Promise<any>(resolve => spectator.once('card_selected', resolve))
    const result = await action({ card: { id: 'TH1', category: 'situation', frontImage: 'https://attacker.invalid/face', token: 'synthetic-private' } })
    expect(result.success).toBe(true)
    const delivered = await event
    expect(delivered.card).toEqual(resolveWebCard('TH1'))
    expect(delivered.room.selectedCard).toEqual(resolveWebCard('TH1'))
    expect(delivered.room.phaseView).toMatchObject({ version: 'phase-view/v1', phase: 'situation-card' })
    expect(delivered.room.phaseView.capabilities.selectSituation).toBe(false)
    expect(JSON.stringify(delivered)).not.toMatch(/attacker|synthetic-private/)
    expect(loadRooms().get(roomId)!.selectedCard).toEqual(resolveWebCard('TH1'))
  })
  it('accepts minimal canonical ID-only selection and restores exact server faces in broadcast and persisted projection', async () => {
    const card = resolveWebCard('TH1')!
    const event = new Promise<any>(resolve => spectator.once('card_selected', resolve))
    const result = await action({ card: { id: card.id }, type: 'SELECT_CARD' })
    expect(result.success).toBe(true)
    const delivered = await event
    expect(delivered.card).toEqual(card)
    expect(delivered.room.selectedCard).toEqual(card)
    expect(loadRooms().get(roomId)!.selectedCard).toEqual(card)
    expect(delivered.room.phaseView.capabilities.selectSituation).toBe(false)
  })
  it('rejects unknown/category/group/action errors without commit, broadcast or scheduled advance', async () => {
    const before = JSON.stringify(roomRepository.findById(roomId))
    const delivered = vi.fn()
    spectator.on('card_selected', delivered)
    const writes = vi.mocked(redisClient.eval).mock.calls.length
    for (const payload of [{ card: { id: 'unknown' } }, { card: { id: 'PT1' } }, { card: { id: 'TH25' } }, { card: { id: 'TH1' }, type: 'INVALID' }]) {
      expect((await action(payload)).success).toBe(false)
    }
    expect(JSON.stringify(roomRepository.findById(roomId))).toBe(before)
    expect(vi.mocked(redisClient.eval).mock.calls.length).toBe(writes)
    expect(delivered).not.toHaveBeenCalled()
  })
  it('does not publish a selected card when primary commit fails', async () => {
    const before = JSON.stringify(roomRepository.findById(roomId))
    const delivered = vi.fn()
    spectator.on('card_selected', delivered)
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture unavailable'))
    expect((await action({ card: { id: 'TH1' } })).success).toBe(false)
    expect(JSON.stringify(roomRepository.findById(roomId))).toBe(before)
    expect(delivered).not.toHaveBeenCalled()
  })
  it('canonicalizes preview/fan relays and drops unknown, disabled and duplicate cards', async () => {
    const preview = new Promise<any>(resolve => spectator.once('card_preview', resolve))
    sender.emit('card_preview', { roomId, card: { id: 'TH1', frontImage: 'https://attacker.invalid/' } })
    expect((await preview).card).toEqual(resolveWebCard('TH1'))
    const fan = new Promise<any>(resolve => spectator.once('situation_fan_state', resolve))
    sender.emit('situation_fan_state', { roomId, cards: [{ id: 'TH1' }, { id: 'TH2' }], activePosition: 1 })
    expect((await fan).cards).toEqual([resolveWebCard('TH1'), resolveWebCard('TH2')])
    const invalid = vi.fn()
    spectator.on('card_preview', invalid)
    spectator.on('situation_fan_state', invalid)
    sender.emit('card_preview', { roomId, card: { id: 'TH25' } })
    sender.emit('card_preview', { roomId, card: { id: 'unknown' } })
    sender.emit('situation_fan_state', { roomId, cards: [{ id: 'TH1' }, { id: 'TH1' }], activePosition: 0 })
    await action({ card: { id: 'unknown' } }) // same-room queue barrier
    expect(invalid).not.toHaveBeenCalled()
  })
})
