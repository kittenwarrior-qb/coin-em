import { afterEach, expect, it } from 'vitest'
import { io, type Socket } from 'socket.io-client'
import { randomUUID } from 'node:crypto'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { roomRepository } from '../../src/modules/room'
import { loadRooms } from '../../src/persistence'
let server: Awaited<ReturnType<typeof createIsolatedServer>>
const clients: Socket[] = []
afterEach(async () => { clients.forEach(client => client.disconnect()); clients.length = 0; await server?.close(); roomRepository.clear() })
const action = (client: Socket, event: string, body: object) => new Promise<any>(resolve => client.emit(event, body, resolve))
it('real socket queue commits/replays count, rejects guests/stale start and persists a one-round start', async () => {
  server = await createIsolatedServer()
  for (let index = 0; index < 5; index++) {
    const client = io(server.url, { transports: ['websocket'], reconnection: false }); clients.push(client)
    await new Promise<void>(resolve => client.once('connect', resolve))
    expect((await action(client, 'join_room', { roomId: 'round-integration', userId: `round-u${index}`, name: `QA${index}`, createIfMissing: index === 0 })).success).toBe(true)
  }
  const room = roomRepository.findById('round-integration')!
  const command = { roomId: room.id, limit: 1, expectedRevision: room.revision, requestId: randomUUID() }
  expect((await action(clients[1], 'set_round_limit', command)).error).toBe('NOT_HOST')
  const saved = await action(clients[0], 'set_round_limit', command)
  expect(saved.success).toBe(true)
  expect(saved.data.roundLimit).toBe(1)
  expect(saved.data).not.toHaveProperty('roundLimitReceipts')
  expect((await action(clients[0], 'set_round_limit', command)).data.revision).toBe(saved.data.revision)
  expect(loadRooms().get(room.id)?.roundLimit).toBe(1)
  const staleStart = await action(clients[0], 'start_game', { roomId: room.id, expectedRevision: command.expectedRevision })
  expect(staleStart.error).toBe('ROUND_REVISION_CONFLICT')
  expect(staleStart.data).toMatchObject({ status: 'waiting', roundLimit: 1, revision: saved.data.revision })
  expect(staleStart.data).not.toHaveProperty('roundLimitReceipts')
  const started = await action(clients[0], 'start_game', { roomId: room.id, expectedRevision: saved.data.revision })
  expect(started.success).toBe(true)
  expect(started.data.totalRounds).toBe(1)
  expect(loadRooms().get(room.id)?.totalRounds).toBe(1)
  expect((await action(clients[0], 'set_round_limit', { ...command, expectedRevision: started.data.revision, limit: 2, requestId: randomUUID() })).error).toBe('GAME_ALREADY_STARTED')
})
