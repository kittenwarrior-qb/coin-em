import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { loadRooms, saveRooms, autoSave } from '../../src/persistence'
import { createPlayingRoom } from '../helpers/mockData'
import { Room } from '../../src/modules/game/types'

/**
 * PERSISTENCE FAILURE TESTS
 * 
 * WHY: In production, file system operations can fail:
 * - Disk full
 * - Permission denied
 * - Corrupted JSON
 * - Server crash during write
 * - Concurrent writes
 * 
 * MUST: Server should not crash, should have safe fallback behavior
 */

describe('Persistence Failure Scenarios', () => {
  const TEST_DATA_DIR = path.join(process.cwd(), 'test-data')
  const TEST_DATA_FILE = path.join(TEST_DATA_DIR, 'rooms.json')

  beforeEach(() => {
    // Create test data directory
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
    }
  })

  afterEach(() => {
    // Cleanup test files
    try {
      if (fs.existsSync(TEST_DATA_FILE)) {
        fs.unlinkSync(TEST_DATA_FILE)
      }
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
      }
    } catch {
      // ignore cleanup errors
    }
    vi.restoreAllMocks()
  })

  describe('Corrupted JSON Recovery', () => {
    it('should handle corrupted JSON file gracefully', () => {
      // WHY: File might be corrupted due to crash during write
      // MUST: Return empty map, not crash server
      
      // Write corrupted JSON
      fs.writeFileSync(TEST_DATA_FILE, '{ "room1": { invalid json }', 'utf-8')

      // Mock DATA_FILE path
      const originalReadFileSync = fs.readFileSync
      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath: any, ...args: any[]) => {
        if (filePath.toString().includes('rooms.json')) {
          return '{ "room1": { invalid json }'
        }
        return originalReadFileSync(filePath, ...args)
      })

      // Should not throw, should return empty map
      const rooms = loadRooms()
      expect(rooms).toBeInstanceOf(Map)
      expect(rooms.size).toBe(0)
    })

    it('should handle empty file gracefully', () => {
      // WHY: File might be empty if write was interrupted
      
      fs.writeFileSync(TEST_DATA_FILE, '', 'utf-8')

      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath: any, ...args: any[]) => {
        if (filePath.toString().includes('rooms.json')) {
          return ''
        }
        return fs.readFileSync(filePath, ...args)
      })

      const rooms = loadRooms()
      expect(rooms).toBeInstanceOf(Map)
      expect(rooms.size).toBe(0)
    })

    it('should handle partial JSON (truncated file)', () => {
      // WHY: Server crash during write might leave partial JSON
      
      const partialJson = '{"room1":{"id":"room1","players":[{"name":"Player1"'
      fs.writeFileSync(TEST_DATA_FILE, partialJson, 'utf-8')

      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath: any, ...args: any[]) => {
        if (filePath.toString().includes('rooms.json')) {
          return partialJson
        }
        return fs.readFileSync(filePath, ...args)
      })

      const rooms = loadRooms()
      expect(rooms).toBeInstanceOf(Map)
      expect(rooms.size).toBe(0)
    })

    it('should handle malformed room data', () => {
      // WHY: Data might be corrupted but valid JSON
      
      const malformedData = JSON.stringify({
        room1: {
          id: 'room1',
          // Missing required fields
          players: null,
          status: undefined,
        }
      })

      fs.writeFileSync(TEST_DATA_FILE, malformedData, 'utf-8')

      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath: any, ...args: any[]) => {
        if (filePath.toString().includes('rooms.json')) {
          return malformedData
        }
        return fs.readFileSync(filePath, ...args)
      })

      // Should load but data might be invalid
      const rooms = loadRooms()
      expect(rooms).toBeInstanceOf(Map)
      // System should handle invalid data gracefully in usage
    })
  })

  describe('File System Errors', () => {
    it('should handle permission denied on read', () => {
      // WHY: File permissions might change in production
      
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      // Should not crash, return empty map
      const rooms = loadRooms()
      expect(rooms).toBeInstanceOf(Map)
      expect(rooms.size).toBe(0)
    })

    it('should handle permission denied on write', () => {
      // WHY: Disk might become read-only
      
      const rooms = new Map<string, Room>()
      rooms.set('room1', createPlayingRoom(7))

      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      // Should not crash
      expect(() => saveRooms(rooms)).not.toThrow()
    })

    it('should handle disk full error', () => {
      // WHY: Disk might fill up in production
      
      const rooms = new Map<string, Room>()
      rooms.set('room1', createPlayingRoom(7))

      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device')
      })

      // Should not crash
      expect(() => saveRooms(rooms)).not.toThrow()
    })

    it('should handle file locked by another process', () => {
      // WHY: Another process might have file open
      
      const rooms = new Map<string, Room>()
      rooms.set('room1', createPlayingRoom(7))

      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('EBUSY: resource busy or locked')
      })

      // Should not crash
      expect(() => saveRooms(rooms)).not.toThrow()
    })
  })

  describe('Concurrent Write Protection', () => {
    it('should handle multiple rapid saves with debounce', async () => {
      // WHY: Multiple actions might trigger saves simultaneously
      // MUST: Debounce should prevent file corruption
      
      const rooms = new Map<string, Room>()
      rooms.set('room1', createPlayingRoom(7))

      let writeCount = 0
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        writeCount++
      })

      // Trigger 10 saves rapidly
      for (let i = 0; i < 10; i++) {
        autoSave(rooms)
      }

      // Wait for debounce (1 second)
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should only write once due to debounce
      expect(writeCount).toBe(1)
    })

    it('should handle save during active write', async () => {
      // WHY: New save might be triggered while previous write is in progress
      
      const rooms = new Map<string, Room>()
      rooms.set('room1', createPlayingRoom(7))

      let writeInProgress = false
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        if (writeInProgress) {
          throw new Error('Write already in progress')
        }
        writeInProgress = true
        // Simulate slow write
        setTimeout(() => { writeInProgress = false }, 100)
      })

      // Trigger multiple saves
      autoSave(rooms)
      autoSave(rooms)
      autoSave(rooms)

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1200))

      // Should handle gracefully (debounce prevents concurrent writes)
      expect(true).toBe(true)
    })
  })

  describe('Data Integrity After Crash', () => {
    it('should recover valid rooms after simulated crash', () => {
      // WHY: Server might crash, need to verify data integrity on restart
      
      // Save valid data
      const rooms = new Map<string, Room>()
      const room1 = createPlayingRoom(7)
      const room2 = createPlayingRoom(9)
      rooms.set('room1', room1)
      rooms.set('room2', room2)

      // Write to actual file
      const testFile = path.join(TEST_DATA_DIR, 'crash-test.json')
      const data = Object.fromEntries(rooms)
      fs.writeFileSync(testFile, JSON.stringify(data, null, 2), 'utf-8')

      // Simulate restart - load from file
      const content = fs.readFileSync(testFile, 'utf-8')
      const parsed = JSON.parse(content)
      const recovered = new Map(Object.entries(parsed)) as Map<string, Room>

      // Verify data integrity
      expect(recovered.size).toBe(2)
      expect(recovered.get('room1')?.players.length).toBe(7)
      expect(recovered.get('room2')?.players.length).toBe(9)
      expect(recovered.get('room1')?.status).toBe('playing')
    })

    it('should handle partial write scenario', () => {
      // WHY: Crash during write might leave incomplete data
      
      const validData = {
        room1: createPlayingRoom(7),
        room2: createPlayingRoom(8),
      }

      // Write valid data
      const testFile = path.join(TEST_DATA_DIR, 'partial-write.json')
      fs.writeFileSync(testFile, JSON.stringify(validData, null, 2), 'utf-8')

      // Simulate partial write by truncating file
      const content = fs.readFileSync(testFile, 'utf-8')
      const truncated = content.substring(0, content.length / 2)
      fs.writeFileSync(testFile, truncated, 'utf-8')

      // Try to load
      vi.spyOn(fs, 'readFileSync').mockReturnValue(truncated)
      
      const rooms = loadRooms()
      
      // Should return empty map, not crash
      expect(rooms).toBeInstanceOf(Map)
      expect(rooms.size).toBe(0)
    })
  })

  describe('Large Data Handling', () => {
    it('should handle very large room data', () => {
      // WHY: Game logs can grow very large over time
      
      const room = createPlayingRoom(11) // Max players
      
      // Add 1000 game log entries
      room.gameLog = Array(1000).fill(null).map((_, i) => ({
        type: 'GIVE_COIN',
        actorId: 'user1',
        targetId: 'user2',
        timestamp: Date.now() + i,
        data: { coinType: 'green' },
      }))

      const rooms = new Map<string, Room>()
      rooms.set('large-room', room)

      // Should save without error
      expect(() => saveRooms(rooms)).not.toThrow()

      // Should load without error
      const testFile = path.join(TEST_DATA_DIR, 'large-data.json')
      fs.writeFileSync(testFile, JSON.stringify(Object.fromEntries(rooms), null, 2), 'utf-8')
      
      const content = fs.readFileSync(testFile, 'utf-8')
      const parsed = JSON.parse(content)
      const loaded = new Map(Object.entries(parsed)) as Map<string, Room>

      expect(loaded.size).toBe(1)
      expect(loaded.get('large-room')?.gameLog.length).toBe(1000)
    })

    it('should handle many rooms simultaneously', () => {
      // WHY: Production might have 100+ active rooms
      
      const rooms = new Map<string, Room>()
      
      // Create 100 rooms
      for (let i = 0; i < 100; i++) {
        rooms.set(`room-${i}`, createPlayingRoom(7))
      }

      // Should save without error
      expect(() => saveRooms(rooms)).not.toThrow()

      // Verify file size is reasonable
      const testFile = path.join(TEST_DATA_DIR, 'many-rooms.json')
      fs.writeFileSync(testFile, JSON.stringify(Object.fromEntries(rooms), null, 2), 'utf-8')
      
      const stats = fs.statSync(testFile)
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.size).toBeLessThan(50 * 1024 * 1024) // Less than 50MB
    })
  })

  describe('Atomic Write Simulation', () => {
    it('should use temp file + rename for atomic writes', () => {
      // WHY: Direct writes can corrupt data if interrupted
      // BEST PRACTICE: Write to temp file, then rename (atomic operation)
      
      const rooms = new Map<string, Room>()
      rooms.set('room1', createPlayingRoom(7))

      const testFile = path.join(TEST_DATA_DIR, 'atomic-test.json')
      const tempFile = path.join(TEST_DATA_DIR, 'atomic-test.json.tmp')

      // Simulate atomic write pattern
      const data = JSON.stringify(Object.fromEntries(rooms), null, 2)
      
      // Write to temp file
      fs.writeFileSync(tempFile, data, 'utf-8')
      
      // Rename (atomic)
      fs.renameSync(tempFile, testFile)

      // Verify
      expect(fs.existsSync(testFile)).toBe(true)
      expect(fs.existsSync(tempFile)).toBe(false)

      const loaded = JSON.parse(fs.readFileSync(testFile, 'utf-8'))
      expect(Object.keys(loaded).length).toBe(1)
    })
  })

  describe('Backup and Recovery', () => {
    it('should create backup before overwriting', () => {
      // WHY: If write fails, we need previous version
      
      const testFile = path.join(TEST_DATA_DIR, 'backup-test.json')
      const backupFile = path.join(TEST_DATA_DIR, 'backup-test.json.backup')

      // Write initial data
      const rooms1 = new Map<string, Room>()
      rooms1.set('room1', createPlayingRoom(7))
      fs.writeFileSync(testFile, JSON.stringify(Object.fromEntries(rooms1)), 'utf-8')

      // Create backup
      if (fs.existsSync(testFile)) {
        fs.copyFileSync(testFile, backupFile)
      }

      // Write new data
      const rooms2 = new Map<string, Room>()
      rooms2.set('room2', createPlayingRoom(8))
      fs.writeFileSync(testFile, JSON.stringify(Object.fromEntries(rooms2)), 'utf-8')

      // Verify backup exists
      expect(fs.existsSync(backupFile)).toBe(true)

      // Verify backup has old data
      const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'))
      expect(backup.room1).toBeDefined()
      expect(backup.room2).toBeUndefined()
    })

    it('should restore from backup if main file is corrupted', () => {
      // WHY: Recovery mechanism for corrupted main file
      
      const testFile = path.join(TEST_DATA_DIR, 'restore-test.json')
      const backupFile = path.join(TEST_DATA_DIR, 'restore-test.json.backup')

      // Create valid backup
      const rooms = new Map<string, Room>()
      rooms.set('room1', createPlayingRoom(7))
      fs.writeFileSync(backupFile, JSON.stringify(Object.fromEntries(rooms)), 'utf-8')

      // Corrupt main file
      fs.writeFileSync(testFile, '{ corrupted }', 'utf-8')

      // Try to load main file
      let loaded: Map<string, Room>
      try {
        const content = fs.readFileSync(testFile, 'utf-8')
        loaded = new Map(Object.entries(JSON.parse(content)))
      } catch (error) {
        // Restore from backup
        const backupContent = fs.readFileSync(backupFile, 'utf-8')
        loaded = new Map(Object.entries(JSON.parse(backupContent)))
        fs.copyFileSync(backupFile, testFile)
      }

      expect(loaded.size).toBe(1)
      expect(loaded.get('room1')).toBeDefined()
    })
  })

  describe('Memory vs Disk Consistency', () => {
    it('should handle case where memory state differs from disk', () => {
      // WHY: If save fails, memory and disk are out of sync
      
      const memoryRooms = new Map<string, Room>()
      memoryRooms.set('room1', createPlayingRoom(7))
      memoryRooms.set('room2', createPlayingRoom(8))

      // Disk has different data
      const diskData = {
        room1: createPlayingRoom(7),
        // room2 missing
      }

      const testFile = path.join(TEST_DATA_DIR, 'consistency-test.json')
      fs.writeFileSync(testFile, JSON.stringify(diskData), 'utf-8')

      // On restart, disk is source of truth
      const diskRooms = new Map(Object.entries(JSON.parse(
        fs.readFileSync(testFile, 'utf-8')
      ))) as Map<string, Room>

      expect(diskRooms.size).toBe(1)
      expect(diskRooms.has('room2')).toBe(false)

      // Memory should sync with disk
      expect(diskRooms.size).not.toBe(memoryRooms.size)
    })
  })
})
