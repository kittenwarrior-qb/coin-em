import { describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { DATA_DIR, autoSaveRoom, cancelPendingRoomSaves, loadRooms, saveRoom } from '../../src/persistence'
import { createMockRoom } from '../helpers/mockData'
import { ROOM_PREFIX, ROOM_INDEX } from '../../src/storageKeys'

describe('test storage isolation', () => {
  it('writes and recovers a room through actual persistence only inside the temporary root', () => {
    const relative = path.relative(os.tmpdir(), DATA_DIR)
    expect(relative.startsWith('..')).toBe(false)
    expect(path.isAbsolute(relative)).toBe(false)
    expect(DATA_DIR).not.toBe(path.resolve('data/rooms'))
    const namespace = `${path.basename(path.dirname(DATA_DIR))}:`
    expect(ROOM_PREFIX).toBe(`${namespace}room:`)
    expect(ROOM_INDEX).toBe(`${namespace}rooms:index`)
    const room = createMockRoom(5, { id: 'isolated-room' })
    saveRoom(room)
    expect(JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'isolated-room.json'), 'utf8'))).toEqual(room)
    expect(loadRooms().get(room.id)).toEqual(room)
  })

  it('cancels debounced writes before fixture cleanup', () => {
    vi.useFakeTimers()
    const room = createMockRoom(5, { id: 'cancelled-room' })
    autoSaveRoom(room)
    cancelPendingRoomSaves()
    vi.advanceTimersByTime(4000)
    expect(fs.existsSync(path.join(DATA_DIR, 'cancelled-room.json'))).toBe(false)
    vi.useRealTimers()
  })
})
