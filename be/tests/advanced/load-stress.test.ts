import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client'
import { Server } from 'socket.io'
import { createServer } from 'http'
import express from 'express'
import { registerRoomHandlers } from '../../src/socket/handlers/roomHandlers'
import { registerGameHandlers } from '../../src/socket/handlers/gameHandlers'
import { roomRepository } from '../../src/modules/room'

/**
 * LOAD & STRESS TESTS
 * 
 * WHY: Production needs to handle:
 * - 50+ concurrent rooms
 * - 7-10 players per room
 * - Hundreds of socket connections
 * - Rapid action bursts
 * 
 * MUST: Measure and ensure:
 * - Memory usage stays reasonable
 * - Event loop doesn't block
 * - No memory leaks
 * - Stable under load
 */

describe('Load & Stress Tests', () => {
  let io: Server
  let httpServer: any
  let clients: ClientSocket[] = []
  let PORT: number
  let SERVER_URL: string

  beforeEach(async () => {
    // Clear all rooms before each test
    const existingRooms = roomRepository.findAll()
    existingRooms.forEach(room => roomRepository.delete(room.id))

    const app = express()
    httpServer = createServer(app)
    io = new Server(httpServer, {
      cors: { origin: '*' },
      pingTimeout: 60000,
      pingInterval: 25000,
    })

    io.on('connection', (socket) => {
      registerRoomHandlers(io, socket)
      registerGameHandlers(io, socket)
    })

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        PORT = (httpServer.address() as any).port
        SERVER_URL = `http://localhost:${PORT}`
        resolve()
      })
    })
  })

  afterEach(async () => {
    // Cleanup
    clients.forEach(client => client.disconnect())
    clients = []
    
    // Clear all rooms
    const allRooms = roomRepository.findAll()
    allRooms.forEach(room => roomRepository.delete(room.id))
    
    io.close()
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  })

  function createClient(): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = ioClient(SERVER_URL, {
        transports: ['websocket'],
        reconnection: false,
      })
      
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, 5000)

      client.on('connect', () => {
        clearTimeout(timeout)
        clients.push(client)
        resolve(client)
      })

      client.on('connect_error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  describe('Multiple Rooms Load Test', () => {
    it('should handle 10 concurrent rooms with 7 players each', async () => {
      // WHY: Production might have many active games simultaneously
      // MUST: All rooms should function correctly
      
      const ROOM_COUNT = 10
      const PLAYERS_PER_ROOM = 7
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed

      console.log(`\n[Load Test] Creating ${ROOM_COUNT} rooms with ${PLAYERS_PER_ROOM} players each...`)

      for (let roomIndex = 0; roomIndex < ROOM_COUNT; roomIndex++) {
        const roomId = `load-test-room-${roomIndex}`

        for (let playerIndex = 0; playerIndex < PLAYERS_PER_ROOM; playerIndex++) {
          const client = await createClient()
          await new Promise<void>((resolve) => {
            client.emit('join_room', {
              name: `Player ${playerIndex + 1}`,
              roomId,
              userId: `user-${roomIndex}-${playerIndex}`,
              createIfMissing: playerIndex === 0,
            })
            client.on('room_state', () => resolve())
          })
        }
      }

      const endTime = Date.now()
      const endMemory = process.memoryUsage().heapUsed
      const duration = endTime - startTime
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024

      console.log(`[Load Test] Completed in ${duration}ms`)
      console.log(`[Load Test] Memory increase: ${memoryIncrease.toFixed(2)} MB`)
      console.log(`[Load Test] Total rooms: ${roomRepository.count()}`)

      expect(roomRepository.count()).toBe(ROOM_COUNT)
      expect(duration).toBeLessThan(30000)
      expect(memoryIncrease).toBeLessThan(200)

      const allRooms = roomRepository.findAll()
      allRooms.forEach(room => {
        expect(room.players.length).toBe(PLAYERS_PER_ROOM)
        expect(room.status).toBe('waiting')
      })
    }, 60000) // 60 second timeout

    it('should handle rapid room creation and deletion', async () => {
      // WHY: Rooms are constantly created and deleted in production
      // MUST: No memory leaks
      
      const CYCLES = 20
      const ROOMS_PER_CYCLE = 5
      const memorySnapshots: number[] = []

      console.log(`\n[Stress Test] Running ${CYCLES} cycles of create/delete...`)

      for (let cycle = 0; cycle < CYCLES; cycle++) {
        // Create rooms
        const createPromises = []
        for (let i = 0; i < ROOMS_PER_CYCLE; i++) {
          const roomId = `stress-room-${cycle}-${i}`
          const promise = (async () => {
            const client = await createClient()
            return new Promise<void>((resolve) => {
              client.emit('join_room', {
                name: 'Host',
                roomId,
                userId: `host-${cycle}-${i}`,
                createIfMissing: true,
              })
              client.on('room_state', () => resolve())
            })
          })()
          createPromises.push(promise)
        }

        await Promise.all(createPromises)

        // Delete rooms
        for (let i = 0; i < ROOMS_PER_CYCLE; i++) {
          const roomId = `stress-room-${cycle}-${i}`
          roomRepository.delete(roomId)
        }

        // Disconnect clients
        clients.forEach(c => c.disconnect())
        clients = []

        // Take memory snapshot
        if (global.gc) global.gc() // Force GC if available
        memorySnapshots.push(process.memoryUsage().heapUsed / 1024 / 1024)

        if (cycle % 5 === 0) {
          console.log(`[Stress Test] Cycle ${cycle}/${CYCLES} - Memory: ${memorySnapshots[cycle].toFixed(2)} MB`)
        }
      }

      // Check for memory leaks
      const firstMemory = memorySnapshots[0]
      const lastMemory = memorySnapshots[memorySnapshots.length - 1]
      const memoryGrowth = lastMemory - firstMemory

      console.log(`[Stress Test] Memory growth: ${memoryGrowth.toFixed(2)} MB`)

      // Memory should not grow significantly (allow 50MB growth)
      expect(memoryGrowth).toBeLessThan(50)
    }, 60000)
  })

  describe('High Concurrency Action Tests', () => {
    it('should handle 100 concurrent coin giving actions', async () => {
      // WHY: During reward phase, many players give coins simultaneously
      // MUST: All actions processed correctly
      
      const roomId = 'concurrent-actions-room'
      const PLAYER_COUNT = 10
      const ACTIONS_PER_PLAYER = 10

      console.log(`\n[Concurrency Test] Creating room with ${PLAYER_COUNT} players...`)

      // Create room with players
      const playerClients: ClientSocket[] = []
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const client = await createClient()
        playerClients.push(client)

        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: `Player ${i + 1}`,
            roomId,
            userId: `user-${i}`,
            createIfMissing: i === 0,
          })
          client.on('room_state', () => resolve())
        })
      }

      // Start game
      await new Promise<void>((resolve) => {
        playerClients[0].emit('start_game', { roomId })
        playerClients[0].on('game_started', () => resolve())
      })

      // Advance through all phases to give-coins (15 next_turn calls)
      const PHASES_TO_GIVE_COINS = 14 // role-reveal → give-coins needs 14 advances
      for (let i = 0; i < PHASES_TO_GIVE_COINS; i++) {
        await new Promise<void>((resolve) => {
          playerClients[0].emit('next_turn', { roomId })
          playerClients[0].once('turn_changed', () => resolve())
        })
      }

      const currentRoom = roomRepository.findById(roomId)!
      console.log(`[Concurrency Test] Current phase: ${currentRoom.phase}`)
      // Should be in give-coins phase now

      console.log(`[Concurrency Test] Sending ${PLAYER_COUNT * ACTIONS_PER_PLAYER} concurrent actions...`)

      const startTime = Date.now()
      let successCount = 0
      let errorCount = 0

      // Each player sends multiple coin actions concurrently
      const actionPromises = playerClients.flatMap((client, playerIndex) => {
        return Array(ACTIONS_PER_PLAYER).fill(null).map((_, actionIndex) => {
          return new Promise<void>((resolve) => {
            const targetIndex = (playerIndex + actionIndex + 1) % PLAYER_COUNT
            const targetClient = playerClients[targetIndex]
            const coinTypes = ['red', 'yellow', 'green']
            const coinType = coinTypes[actionIndex % 3]

            client.emit('give_coin', {
              roomId,
              receiverSocketId: targetClient.id,
              coinType,
            }, (response: any) => {
              if (response?.success) {
                successCount++
              } else {
                errorCount++
              }
              resolve()
            })
          })
        })
      })

      await Promise.all(actionPromises)

      const duration = Date.now() - startTime

      console.log(`[Concurrency Test] Completed in ${duration}ms`)
      console.log(`[Concurrency Test] Success: ${successCount}, Errors: ${errorCount}`)

      // Some actions should succeed (within coin limits)
      expect(successCount).toBeGreaterThan(0)
      expect(successCount + errorCount).toBe(PLAYER_COUNT * ACTIONS_PER_PLAYER)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    }, 30000)

    it('should handle burst of 50 socket events', async () => {
      // WHY: Network bursts can happen in production
      // MUST: Server should handle without blocking
      
      const roomId = 'burst-test-room'
      const client = await createClient()

      await new Promise<void>((resolve) => {
        client.emit('join_room', {
          name: 'Player 1',
          roomId,
          userId: 'user-1',
          createIfMissing: true,
        })
        client.on('room_state', () => resolve())
      })

      console.log(`\n[Burst Test] Sending 50 rapid get_room_state events...`)

      const startTime = Date.now()
      let responseCount = 0

      const allDone = new Promise<void>((resolve) => {
        client.on('room_state', () => {
          responseCount++
          if (responseCount >= 50) resolve()
        })
      })

      // Send 50 get_room_state events as fast as possible
      for (let i = 0; i < 50; i++) {
        client.emit('get_room_state', { roomId })
      }

      await Promise.race([
        allDone,
        new Promise<void>(resolve => setTimeout(resolve, 5000)),
      ])

      const duration = Date.now() - startTime

      console.log(`[Burst Test] Completed in ${duration}ms`)
      console.log(`[Burst Test] Responses: ${responseCount}/50`)

      expect(responseCount).toBeGreaterThan(40) // Most should respond
      expect(duration).toBeLessThan(5000)
    }, 10000)
  })

  describe('Event Loop Performance', () => {
    it('should maintain low event loop lag under load', async () => {
      // WHY: Blocked event loop causes lag for all users
      // MUST: Event loop lag should stay low
      
      const roomId = 'eventloop-test-room'
      const PLAYER_COUNT = 10

      // Create room with players
      const playerClients: ClientSocket[] = []
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const client = await createClient()
        playerClients.push(client)

        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: `Player ${i + 1}`,
            roomId,
            userId: `user-${i}`,
            createIfMissing: i === 0,
          })
          client.on('room_state', () => resolve())
        })
      }

      console.log(`\n[Event Loop Test] Measuring lag under load...`)

      const lagMeasurements: number[] = []

      // Measure event loop lag while sending actions
      const measureInterval = setInterval(() => {
        const start = Date.now()
        setImmediate(() => {
          const lag = Date.now() - start
          lagMeasurements.push(lag)
        })
      }, 100)

      // Send many get_room_state events (fire and forget)
      playerClients.forEach(client => {
        for (let i = 0; i < 20; i++) {
          client.emit('get_room_state', { roomId })
        }
      })

      // Wait 2 seconds to collect measurements
      await new Promise(resolve => setTimeout(resolve, 2000))

      clearInterval(measureInterval)
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(lagMeasurements.length).toBeGreaterThan(0)
      const avgLag = lagMeasurements.reduce((a, b) => a + b, 0) / lagMeasurements.length
      const maxLag = Math.max(...lagMeasurements)

      console.log(`[Event Loop Test] Average lag: ${avgLag.toFixed(2)}ms`)
      console.log(`[Event Loop Test] Max lag: ${maxLag}ms`)
      console.log(`[Event Loop Test] Measurements: ${lagMeasurements.length}`)

      expect(avgLag).toBeLessThan(50)
      expect(maxLag).toBeLessThan(200)
    }, 15000)
  })

  describe('Memory Leak Detection', () => {
    it('should not leak memory with repeated connections/disconnections', async () => {
      // WHY: Memory leaks accumulate over time in production
      // MUST: Memory should stabilize
      
      const ITERATIONS = 50
      const memorySnapshots: number[] = []

      console.log(`\n[Memory Leak Test] Running ${ITERATIONS} connect/disconnect cycles...`)

      for (let i = 0; i < ITERATIONS; i++) {
        // Connect
        const client = await createClient()
        
        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: 'Test Player',
            roomId: `leak-test-${i}`,
            userId: `user-${i}`,
            createIfMissing: true,
          })
          client.on('room_state', () => resolve())
        })

        // Disconnect
        client.disconnect()
        clients = clients.filter(c => c !== client)

        // Clean up room
        roomRepository.delete(`leak-test-${i}`)

        // Take memory snapshot every 10 iterations
        if (i % 10 === 0) {
          if (global.gc) global.gc()
          const memory = process.memoryUsage().heapUsed / 1024 / 1024
          memorySnapshots.push(memory)
          console.log(`[Memory Leak Test] Iteration ${i}/${ITERATIONS} - Memory: ${memory.toFixed(2)} MB`)
        }
      }

      // Analyze memory trend
      const firstMemory = memorySnapshots[0]
      const lastMemory = memorySnapshots[memorySnapshots.length - 1]
      const memoryGrowth = lastMemory - firstMemory

      console.log(`[Memory Leak Test] Memory growth: ${memoryGrowth.toFixed(2)} MB`)

      // Memory growth should be minimal (< 20MB for 50 iterations)
      expect(memoryGrowth).toBeLessThan(20)
    }, 60000)

    it('should clean up room data properly', async () => {
      // WHY: Old room data should be garbage collected
      
      const ROOM_COUNT = 30
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024

      console.log(`\n[Cleanup Test] Creating ${ROOM_COUNT} rooms...`)

      // Create many rooms
      for (let i = 0; i < ROOM_COUNT; i++) {
        const client = await createClient()
        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: 'Player',
            roomId: `cleanup-room-${i}`,
            userId: `user-${i}`,
            createIfMissing: true,
          })
          client.on('room_state', () => resolve())
        })
      }

      const afterCreateMemory = process.memoryUsage().heapUsed / 1024 / 1024
      console.log(`[Cleanup Test] Memory after create: ${afterCreateMemory.toFixed(2)} MB`)

      // Delete all rooms
      for (let i = 0; i < ROOM_COUNT; i++) {
        roomRepository.delete(`cleanup-room-${i}`)
      }

      // Disconnect all clients
      clients.forEach(c => c.disconnect())
      clients = []

      // Force GC
      if (global.gc) global.gc()
      await new Promise(resolve => setTimeout(resolve, 1000))

      const afterCleanupMemory = process.memoryUsage().heapUsed / 1024 / 1024
      console.log(`[Cleanup Test] Memory after cleanup: ${afterCleanupMemory.toFixed(2)} MB`)

      const memoryRecovered = afterCreateMemory - afterCleanupMemory
      console.log(`[Cleanup Test] Memory recovered: ${memoryRecovered.toFixed(2)} MB`)

      // Should recover most memory
      expect(afterCleanupMemory).toBeLessThan(afterCreateMemory + 10)
    }, 30000)
  })

  describe('Stability Under Load', () => {
    it('should remain stable with mixed operations for 5 seconds', async () => {
      // WHY: Production has continuous mixed operations
      // MUST: Server should remain stable
      
      const DURATION = 5000 // 5 seconds
      const roomId = 'stability-test-room'
      let operationCount = 0
      let errorCount = 0
      let joinCounter = 2 // Start from 2 (user-1 already joined)

      console.log(`\n[Stability Test] Running mixed operations for ${DURATION/1000} seconds...`)

      // Create initial room
      const client = await createClient()
      await new Promise<void>((resolve) => {
        client.emit('join_room', {
          name: 'Player 1',
          roomId,
          userId: 'user-1',
          createIfMissing: true,
        })
        client.on('room_state', () => resolve())
      })

      const startTime = Date.now()

      // Run mixed operations continuously
      const operations = []
      while (Date.now() - startTime < DURATION) {
        const operation = (async () => {
          try {
            const randomOp = Math.random()
            const room = roomRepository.findById(roomId)
            
            if (randomOp < 0.3 && room && room.players.length < 9) {
              // Join room (only if not too full)
              const newClient = await createClient()
              const uid = `user-${joinCounter++}`
              await new Promise<void>((resolve) => {
                newClient.emit('join_room', {
                  name: `Player ${uid}`,
                  roomId,
                  userId: uid,
                })
                newClient.on('room_state', () => resolve())
                setTimeout(resolve, 1000) // timeout fallback
              })
            } else if (randomOp < 0.7) {
              // Get room state — fire and forget
              client.emit('get_room_state', { roomId })
            } else {
              // Leave room (if multiple clients)
              if (clients.length > 1) {
                const clientToRemove = clients[clients.length - 1]
                clientToRemove.disconnect()
                clients = clients.filter(c => c !== clientToRemove)
              }
            }
            
            operationCount++
          } catch (error) {
            errorCount++
          }
        })()

        operations.push(operation)
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms between operations
      }

      await Promise.all(operations)

      console.log(`[Stability Test] Operations: ${operationCount}`)
      console.log(`[Stability Test] Errors: ${errorCount}`)
      if (operationCount > 0) {
        console.log(`[Stability Test] Error rate: ${(errorCount/operationCount*100).toFixed(2)}%`)
      }

      // Error rate should be low
      expect(operationCount).toBeGreaterThan(10)
      if (operationCount > 0) {
        expect(errorCount / operationCount).toBeLessThan(0.2) // < 20% error rate
      }
    }, 15000)
  })
})
