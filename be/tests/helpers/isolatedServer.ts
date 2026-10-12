import { createServer } from 'http'
import { AddressInfo } from 'net'
import { Server } from 'socket.io'
import { registerSocketHandlers } from '../../src/socket/handlers'
import { cancelPendingRoomSaves } from '../../src/persistence'
import { roomRepository } from '../../src/modules/room/repository/RoomRepository'
import express from 'express'
import cors from 'cors'
import type { CatalogStore } from '../../src/catalog/CatalogStore'
import { registerPublicCatalogApi } from '../../src/catalog/publicCatalogApi'

/** Real production handler registration, loopback-only random port, explicit teardown. */
export async function createIsolatedServer(options: { pingInterval?: number; pingTimeout?: number; catalog?: CatalogStore } = {}) {
  if (process.env.NODE_ENV !== 'test' || !process.env.ROOM_DATA_DIR || !process.env.ROOM_REDIS_NAMESPACE) {
    throw new Error('The isolated server requires the test storage context')
  }
  const app = express(); app.use(cors())
  registerPublicCatalogApi(app, () => options.catalog)
  const httpServer = createServer(app)
  const { catalog: _catalog, ...socketOptions } = options
  const io = new Server(httpServer, { cors: { origin: '*' }, ...socketOptions })
  const disposeHandlers = registerSocketHandlers(io)
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(0, '127.0.0.1', resolve)
  })
  const url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`
  return {
    io, httpServer, app, url,
    async close() {
      await new Promise<void>((resolve) => io.close(() => resolve()))
      await disposeHandlers()
      await roomRepository.drainWrites()
      cancelPendingRoomSaves()
    },
  }
}
