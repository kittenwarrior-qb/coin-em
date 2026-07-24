import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { loadRooms, saveRoom, saveRooms, autoSaveRoom, deleteRoomFile } from '../../src/persistence'
import { createPlayingRoom } from '../helpers/mockData'
import { Room } from '../../src/modules/game/types'

/**
 * PERSISTENCE FAILURE TESTS
 *
 * Each room is stored as data/rooms/{roomId}.json
 * Tests verify graceful error handling and data integrity.
 */

describe('Persistence Failure Scenarios', () => {
  const TEST_DATA_DIR = path.join(process.cwd(), 'test-data', 'rooms')

  beforeEach(() => {
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
    }
  })

  afterEach(() => {
    try {
      const parent = path.dirname(TEST_DATA_DIR)
      if (fs.existsSync(parent)) {
        fs.rmSync(parent, { recursive: true, force: true })
      }
    } catch {
      // ignore cleanup errors
    }
    vi.restoreAllMocks()
  })

  describe('Corrupted JSON Recovery', () => {
    it('should skip corrupted room file and load others', () => {
      // Write one valid and one corrupted room file
      const validRoom = createPlayingRoom(7)
      validRoom.id = 'valid-room'

      vi.spyOn(fs, 'readdirSync').mockReturnValue(['valid-room.json', 'bad-room.json'] as any)
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath: any, ...args: any[]) => {
        if (filePath.toString().includes('bad-room.json')) return '{ invalid json }'
        if (filePath.toString().includes('valid-room.json')) return JSON.stringify(validRoom)
        return (fs.readFileSync as any).wrappedMethod?.(filePath, ...args) ?? ''
      })

      const rooms = loadRooms()
      expect(rooms).toBeInstanceOf(Map)
      // bad-room skipped, valid-room loaded
      expect(rooms.has('valid-room')).toBe(true)
      expect(rooms.has('bad-room')).toBe(false)
    })

    it('should handle empty room file gracefully', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['empty-room.json'] as any)
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('')

      const rooms = loadRooms()
      expect(rooms).toBeInstanceOf(Map)
      expect(rooms.size).toBe(0)
    })

    it('should handle partial JSON (truncated file)', () => {
      const partial = '{"id":"room1","players":[{"name":"Player1"'

      vi.spyOn(fs, 'readdirSync').mockReturnValue(['room1.json'] as any)
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue(partial)

      const rooms = loadRooms()
      expect(rooms).toBeInstanceOf(Map)
      expect(rooms.size).toBe(0)
    })
  })

  describe('File System Errors', () => {
    it('should handle permission denied on read', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['room1.json'] as any)
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      const rooms = loadRooms()
      expect(rooms).toBeInstanceOf(Map)
      expect(rooms.size).toBe(0)
    })

    it('should handle permission denied on write', () => {
      const room = createPlayingRoom(7)
      room.id = 'room1'

      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      expect(() => saveRoom(room)).not.toThrow()
    })

    it('should handle disk full error', () => {
      const room = createPlayingRoom(7)
      room.id = 'room1'

      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device')
      })

      expect(() => saveRoom(room)).not.toThrow()
    })

    it('should handle file locked by another process', () => {
      const room = createPlayingRoom(7)
      room.id = 'room1'

      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('EBUSY: resource busy or locked')
      })

      expect(() => saveRoom(room)).not.toThrow()
    })
  })

  describe('Concurrent Write Protection', () => {
    it('should debounce rapid saves for the same room', async () => {
      const room = createPlayingRoom(7)
      room.id = 'debounce-room'

      let writeCount = 0
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => { writeCount++ })
      vi.spyOn(fs, 'renameSync').mockImplementation(() => {})

      // Trigger 10 saves rapidly
      for (let i = 0; i < 10; i++) {
        autoSaveRoom(room)
      }

      // Wait for debounce (3s)
      await new Promise((resolve) => setTimeout(resolve, 3200))

      // Should only write once
      expect(writeCount).toBe(1)
    })
  })

  describe('Atomic Write', () => {
    it('should write to tmp file then rename', () => {
      const room = createPlayingRoom(7)
      room.id = 'atomic-room'

      const writtenPaths: string[] = []
      const renamedPaths: string[] = []

      vi.spyOn(fs, 'writeFileSync').mockImplementation((p: any) => { writtenPaths.push(p.toString()) })
      vi.spyOn(fs, 'renameSync').mockImplementation((src: any, dest: any) => {
        renamedPaths.push(`${src}->${dest}`)
      })

      saveRoom(room)

      expect(writtenPaths[0]).toContain('.tmp')
      expect(renamedPaths[0]).toContain('atomic-room.json')
    })
  })

  describe('Data Integrity After Crash', () => {
    it('should recover valid rooms after simulated crash', () => {
      const room1 = createPlayingRoom(7)
      room1.id = 'crash-room-1'
      const room2 = createPlayingRoom(9)
      room2.id = 'crash-room-2'

      // Write files directly
      const dir = path.join(process.cwd(), 'test-data', 'rooms')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'crash-room-1.json'), JSON.stringify(room1), 'utf-8')
      fs.writeFileSync(path.join(dir, 'crash-room-2.json'), JSON.stringify(room2), 'utf-8')

      // Simulate restart load
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
      const recovered = new Map<string, Room>()
      for (const file of files) {
        const r = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')) as Room
        recovered.set(r.id, r)
      }

      expect(recovered.size).toBe(2)
      expect(recovered.get('crash-room-1')?.players.length).toBe(7)
      expect(recovered.get('crash-room-2')?.players.length).toBe(9)
    })
  })

  describe('Large Data Handling', () => {
    it('should handle very large room data', () => {
      const room = createPlayingRoom(11)
      room.id = 'large-room'
      room.gameLog = Array(1000).fill(null).map((_, i) => ({
        type: 'GIVE_COIN',
        actorId: 'user1',
        targetId: 'user2',
        timestamp: Date.now() + i,
        data: { coinType: 'green' },
      }))

      expect(() => saveRoom(room)).not.toThrow()
    })

    it('should handle many rooms simultaneously', () => {
      const rooms = new Map<string, Room>()
      for (let i = 0; i < 100; i++) {
        const r = createPlayingRoom(7)
        r.id = `room-${i}`
        rooms.set(r.id, r)
      }

      expect(() => saveRooms(rooms)).not.toThrow()
    })
  })

  describe('deleteRoomFile', () => {
    it('should not throw if file does not exist', () => {
      expect(() => deleteRoomFile('nonexistent-room')).not.toThrow()
    })

    it('should delete existing room file', () => {
      const dir = path.join(process.cwd(), 'test-data', 'rooms')
      fs.mkdirSync(dir, { recursive: true })
      const filePath = path.join(dir, 'to-delete.json')
      fs.writeFileSync(filePath, '{}', 'utf-8')

      vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
        if (p.toString().includes('to-delete')) return true
        return false
      })
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {})

      deleteRoomFile('to-delete')
      expect(unlinkSpy).toHaveBeenCalled()
    })
  })
})
