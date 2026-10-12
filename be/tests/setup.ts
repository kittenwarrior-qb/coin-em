import { afterAll, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

// Each isolated test file gets a unique root before persistence is imported.
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'emcoin-test-'))
process.env.ROOM_DATA_DIR = path.join(testRoot, 'rooms')
process.env.ROOM_REDIS_NAMESPACE = `${path.basename(testRoot)}:`

afterAll(async () => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  const { cancelPendingRoomSaves } = await import('../src/persistence')
  const { roomRepository } = await import('../src/modules/room/repository/RoomRepository')
  await roomRepository.drainWrites()
  cancelPendingRoomSaves()
  const relative = path.relative(os.tmpdir(), testRoot)
  if (relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(testRoot).startsWith('emcoin-test-')) {
    throw new Error('Refusing cleanup outside the allocated test root')
  }
  fs.rmSync(testRoot, { recursive: true, force: true })
})

// Mock Redis so all tests run without a real Redis connection.
// Path must match exactly how source files import it.
vi.mock('../src/redis')
