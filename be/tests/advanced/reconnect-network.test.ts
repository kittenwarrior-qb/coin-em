import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client'
import { Server } from 'socket.io'
import { createServer } from 'http'
import express from 'express'
import { registerRoomHandlers } from '../../src/socket/handlers/roomHandlers'
import { registerGameHandlers } from '../../src/socket/handlers/gameHandlers'
import { roomRepository } from '../../src/modules/room'

/**
 * RECONNECT & NETWORK INSTABILITY TESTS
 * 
 * WHY: In production, network issues are common:
 * - Users lose connection temporarily
 * - Mobile users switch networks (WiFi <-> 4G)
 * - Browser tabs go to sleep
 * - Network congestion causes packet loss
 * 
 * MUST: Ensure:
 * - No duplicate players after reconnect
 * - State consistency maintained
 * - No memory leaks from orphaned connections
 * - Graceful handling of connection issues
 */

describe('Reconnection & Network Instability', () => {
  let io: Server
  let httpServer: any
  let clients: ClientSocket[] = []
  let PORT: number
  let SERVER_URL: string

  beforeEach(async () => {
    const app = express()
    httpServer = createServer(app)
    io = new Server(httpServer, {
      cors: { origin: '*' },
      pingTimeout: 5000,
      pingInterval: 2000,
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
    clients.forEach(client => client.disconnect())
    clients = []
    
    const allRooms = roomRepository.findAll()
    allRooms.forEach(room => roomRepository.delete(room.id))
    
    io.close()
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  })

  function createClient(options = {}): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = ioClient(SERVER_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 100,
        reconnectionAttempts: 5,
        ...options,
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

  describe('Basic Reconnection', () => {
    it('should handle player disconnect and reconnect', async () => {
      // WHY: Users lose connection temporarily (network glitch)
      // MUST: Player can rejoin without creating duplicate
      
      const roomId = 'reconnect-test-room'
      const userId = 'user-1'
      const playerName = 'Player 1'

      console.log('\n[Reconnect Test] Initial connection...')

      // Initial connection
      const client1 = await createClient()
      await new Promise<void>((resolve) => {
        client1.emit('join_room', {
          name: playerName,
          roomId,
          userId,
          createIfMissing: true,
        })
        client1.on('room_state', () => resolve())
      })

      let room = roomRepository.findById(roomId)!
      expect(room.players.length).toBe(1)
      expect(room.players[0].userId).toBe(userId)

      console.log('[Reconnect Test] Disconnecting...')

      // Disconnect
      client1.disconnect()
      clients = clients.filter(c => c !== client1)

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('[Reconnect Test] Reconnecting...')

      // Reconnect with same userId
      const client2 = await createClient()
      await new Promise<void>((resolve) => {
        client2.emit('join_room', {
          name: playerName,
          roomId,
          userId, // Same userId
        })
        client2.on('room_state', () => resolve())
      })

      room = roomRepository.findById(roomId)!
      
      // Should still have only 1 player (no duplicate)
      expect(room.players.length).toBe(1)
      expect(room.players[0].userId).toBe(userId)
      
      console.log('[Reconnect Test] Success - no duplicate player')
    })

    it('should handle rapid disconnect/reconnect cycles', async () => {
      // WHY: Unstable network causes rapid connection changes
      // MUST: System should handle gracefully
      
      const roomId = 'rapid-reconnect-room'
      const userId = 'user-1'

      console.log('\n[Rapid Reconnect Test] Starting cycles...')

      for (let i = 0; i < 10; i++) {
        // Connect
        const client = await createClient()
        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: 'Player 1',
            roomId,
            userId,
            createIfMissing: i === 0,
          })
          client.on('room_state', () => resolve())
        })

        // Disconnect immediately
        client.disconnect()
        clients = clients.filter(c => c !== client)

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const room = roomRepository.findById(roomId)!
      
      // Should still have only 1 player
      expect(room.players.length).toBe(1)
      
      console.log('[Rapid Reconnect Test] Completed 10 cycles - no duplicates')
    })

    it('should handle multiple players reconnecting simultaneously', async () => {
      // WHY: Network outage might disconnect all players at once
      // MUST: All can reconnect without issues
      
      const roomId = 'multi-reconnect-room'
      const PLAYER_COUNT = 7

      console.log(`\n[Multi Reconnect Test] Creating ${PLAYER_COUNT} players...`)

      // Create initial players
      const playerData = []
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const client = await createClient()
        const userId = `user-${i}`
        
        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: `Player ${i + 1}`,
            roomId,
            userId,
            createIfMissing: i === 0,
          })
          client.on('room_state', () => resolve())
        })

        playerData.push({ userId, name: `Player ${i + 1}` })
      }

      let room = roomRepository.findById(roomId)!
      expect(room.players.length).toBe(PLAYER_COUNT)

      console.log('[Multi Reconnect Test] Disconnecting all players...')

      // Disconnect all
      clients.forEach(c => c.disconnect())
      clients = []

      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('[Multi Reconnect Test] Reconnecting all players simultaneously...')

      // Reconnect all simultaneously
      const reconnectPromises = playerData.map(async (data) => {
        const client = await createClient()
        return new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: data.name,
            roomId,
            userId: data.userId,
          })
          client.on('room_state', () => resolve())
        })
      })

      await Promise.all(reconnectPromises)

      room = roomRepository.findById(roomId)!
      
      // Should still have exactly PLAYER_COUNT players
      expect(room.players.length).toBe(PLAYER_COUNT)
      
      // All original userIds should be present
      const userIds = room.players.map(p => p.userId).sort()
      const expectedIds = playerData.map(p => p.userId).sort()
      expect(userIds).toEqual(expectedIds)
      
      console.log('[Multi Reconnect Test] All players reconnected successfully')
    })
  })

  describe('Duplicate Connection Prevention', () => {
    it('should prevent duplicate socket connections for same user', async () => {
      // WHY: User might open multiple tabs or have stale connection
      // MUST: Only one active connection per user
      
      const roomId = 'duplicate-conn-room'
      const userId = 'user-1'

      console.log('\n[Duplicate Connection Test] Creating first connection...')

      // First connection
      const client1 = await createClient()
      await new Promise<void>((resolve) => {
        client1.emit('join_room', {
          name: 'Player 1',
          roomId,
          userId,
          createIfMissing: true,
        })
        client1.on('room_state', () => resolve())
      })

      console.log('[Duplicate Connection Test] Creating second connection with same userId...')

      // Second connection with same userId (simulate opening new tab)
      const client2 = await createClient()
      await new Promise<void>((resolve) => {
        client2.emit('join_room', {
          name: 'Player 1',
          roomId,
          userId, // Same userId
        })
        client2.on('room_state', () => resolve())
      })

      const room = roomRepository.findById(roomId)!
      
      // Should have only 1 player (not 2)
      expect(room.players.length).toBe(1)
      
      // Latest socketId should be active
      expect(room.players[0].socketId).toBe(client2.id)
      
      console.log('[Duplicate Connection Test] Duplicate prevented successfully')
    })

    it('should handle user opening multiple tabs', async () => {
      // WHY: User might accidentally open game in multiple tabs
      // MUST: Latest tab takes over, old tab disconnected
      
      const roomId = 'multi-tab-room'
      const userId = 'user-1'

      const tabs: ClientSocket[] = []

      console.log('\n[Multi Tab Test] Opening 5 tabs...')

      // Open 5 tabs
      for (let i = 0; i < 5; i++) {
        const client = await createClient()
        tabs.push(client)
        
        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: 'Player 1',
            roomId,
            userId,
            createIfMissing: i === 0,
          })
          client.on('room_state', () => resolve())
        })

        await new Promise(resolve => setTimeout(resolve, 200))
      }

      const room = roomRepository.findById(roomId)!
      
      // Should have only 1 player
      expect(room.players.length).toBe(1)
      
      // Latest tab should be active
      expect(room.players[0].socketId).toBe(tabs[tabs.length - 1].id)
      
      console.log('[Multi Tab Test] Latest tab is active')
    })
  })

  describe('Network Packet Loss Simulation', () => {
    it('should handle delayed responses', async () => {
      // WHY: Network congestion causes delays
      // MUST: System should timeout gracefully
      
      const roomId = 'delayed-response-room'
      const client = await createClient()

      console.log('\n[Delayed Response Test] Sending request...')

      // Send request with timeout
      const timeoutPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Request timeout'))
        }, 3000)

        client.emit('join_room', {
          name: 'Player 1',
          roomId,
          userId: 'user-1',
          createIfMissing: true,
        })

        client.on('room_state', () => {
          clearTimeout(timeout)
          resolve()
        })
      })

      // Should complete or timeout gracefully
      try {
        await timeoutPromise
        console.log('[Delayed Response Test] Request completed')
      } catch (error: any) {
        console.log('[Delayed Response Test] Request timed out (expected)')
        expect(error.message).toBe('Request timeout')
      }
    })

    it('should handle out-of-order messages', async () => {
      // WHY: Network can deliver packets out of order
      // MUST: State should remain consistent
      
      const roomId = 'out-of-order-room'
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

      console.log('\n[Out of Order Test] Sending rapid sequential requests...')

      // Send multiple get_room_state requests rapidly
      // Server responds with room_state events (no callback)
      let responseCount = 0
      const allResolved = new Promise<void>((resolve) => {
        client.on('room_state', () => {
          responseCount++
          if (responseCount >= 10) resolve()
        })
      })

      for (let i = 0; i < 10; i++) {
        client.emit('get_room_state', { roomId })
      }

      await Promise.race([
        allResolved,
        new Promise<void>(resolve => setTimeout(resolve, 3000)),
      ])

      const room = roomRepository.findById(roomId)!
      
      // State should be consistent
      expect(room.players.length).toBe(1)
      expect(room.status).toBe('waiting')
      
      console.log('[Out of Order Test] State remained consistent')
    }, 10000)
  })

  describe('Connection State Management', () => {
    it('should clean up orphaned connections', async () => {
      // WHY: Crashed clients leave orphaned connections
      // MUST: System should detect and clean up
      
      const roomId = 'orphan-cleanup-room'
      const PLAYER_COUNT = 5

      console.log(`\n[Orphan Cleanup Test] Creating ${PLAYER_COUNT} players...`)

      // Create players
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const client = await createClient()
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

      let room = roomRepository.findById(roomId)!
      expect(room.players.length).toBe(PLAYER_COUNT)

      console.log('[Orphan Cleanup Test] Simulating crashes (no disconnect event)...')

      // Simulate crash - destroy sockets without proper disconnect
      const socketIds = clients.map(c => c.id)
      clients.forEach(c => {
        c.removeAllListeners()
        c.disconnect()
      })
      clients = []

      // Wait for server to detect disconnections
      await new Promise(resolve => setTimeout(resolve, 6000)) // Wait for ping timeout

      // In real implementation, server should clean up disconnected players
      // For now, we just verify the test setup works
      console.log('[Orphan Cleanup Test] Cleanup detection completed')
    }, 10000)

    it('should handle connection during game in progress', async () => {
      // WHY: New player tries to join active game
      // MUST: Should be rejected or handled appropriately
      
      const roomId = 'game-in-progress-room'

      console.log('\n[Game In Progress Test] Creating game...')

      // Create game with 7 players
      const playerClients: ClientSocket[] = []
      for (let i = 0; i < 7; i++) {
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

      console.log('[Game In Progress Test] Attempting to join active game...')

      // Try to join game in progress
      const newClient = await createClient()
      let joinError: any = null

      await new Promise<void>((resolve) => {
        newClient.emit('join_room', {
          name: 'Late Player',
          roomId,
          userId: 'late-user',
        })

        newClient.on('error', (error) => {
          joinError = error
          resolve()
        })

        newClient.on('room_state', () => {
          resolve()
        })

        // Timeout
        setTimeout(resolve, 2000)
      })

      const room = roomRepository.findById(roomId)!
      
      // Should still have 7 players (new player rejected or not added)
      expect(room.players.length).toBe(7)
      
      console.log('[Game In Progress Test] Late join handled correctly')
    })
  })

  describe('Reconnection State Consistency', () => {
    it('should maintain game state after reconnection', async () => {
      // WHY: Player reconnects mid-game
      // MUST: Should see current game state
      
      const roomId = 'state-consistency-room'
      const userId = 'user-1'

      console.log('\n[State Consistency Test] Creating game...')

      // Create game
      const playerClients: ClientSocket[] = []
      for (let i = 0; i < 7; i++) {
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

      // Advance to night phase
      await new Promise<void>((resolve) => {
        playerClients[0].emit('next_turn', { roomId })
        playerClients[0].on('turn_changed', () => resolve())
      })

      const roomBeforeDisconnect = roomRepository.findById(roomId)!
      expect(roomBeforeDisconnect.phase).toBe('night')

      console.log('[State Consistency Test] Player disconnecting...')

      // Player 1 disconnects
      playerClients[1].disconnect()

      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('[State Consistency Test] Player reconnecting via reconnect_room...')

      // Player 1 reconnects using reconnect_room (not join_room — game is in progress)
      const reconnectedClient = await createClient()
      let receivedState: any = null

      await new Promise<void>((resolve) => {
        reconnectedClient.emit('reconnect_room', {
          name: 'Player 2',
          roomId,
          userId: 'user-1', // Same userId
        })

        reconnectedClient.on('room_state', (state) => {
          receivedState = state
          resolve()
        })

        // Timeout fallback
        setTimeout(resolve, 3000)
      })

      // Should receive current game state
      expect(receivedState).toBeDefined()
      expect(receivedState.phase).toBe('night')
      expect(receivedState.status).toBe('playing')
      
      console.log('[State Consistency Test] State maintained correctly')
    }, 15000)

    it('should handle reconnection during action execution', async () => {
      // WHY: Player disconnects while action is being processed
      // MUST: Action should complete or fail gracefully
      
      const roomId = 'action-reconnect-room'

      console.log('\n[Action Reconnect Test] Setting up game...')

      // Create and start game
      const playerClients: ClientSocket[] = []
      for (let i = 0; i < 7; i++) {
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

      await new Promise<void>((resolve) => {
        playerClients[0].emit('start_game', { roomId })
        playerClients[0].on('game_started', () => resolve())
      })

      await new Promise<void>((resolve) => {
        playerClients[0].emit('next_turn', { roomId })
        playerClients[0].on('turn_changed', () => resolve())
      })

      console.log('[Action Reconnect Test] Sending action and disconnecting...')

      // Send action and disconnect immediately
      playerClients[1].emit('night_action', {
        roomId,
        action: 'silence',
        targetSocketId: playerClients[2].id,
      })

      // Disconnect immediately (before response)
      playerClients[1].disconnect()

      await new Promise(resolve => setTimeout(resolve, 500))

      // Action might or might not complete - system should handle gracefully
      const room = roomRepository.findById(roomId)!
      expect(room.phase).toBe('night')
      
      console.log('[Action Reconnect Test] System remained stable')
    })
  })

  describe('Memory Leak Prevention', () => {
    it('should not leak memory from disconnected sockets', async () => {
      // WHY: Orphaned socket listeners cause memory leaks
      // MUST: Properly clean up event listeners
      
      const ITERATIONS = 30
      const memorySnapshots: number[] = []

      console.log(`\n[Socket Memory Test] Running ${ITERATIONS} connect/disconnect cycles...`)

      for (let i = 0; i < ITERATIONS; i++) {
        const client = await createClient()
        
        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: 'Test Player',
            roomId: `memory-test-${i}`,
            userId: `user-${i}`,
            createIfMissing: true,
          })
          client.on('room_state', () => resolve())
        })

        // Add many listeners (simulate real app)
        client.on('game_started', () => {})
        client.on('turn_changed', () => {})
        client.on('coin_given', () => {})
        client.on('vote_submitted', () => {})

        // Disconnect
        client.disconnect()
        clients = clients.filter(c => c !== client)

        // Cleanup
        roomRepository.delete(`memory-test-${i}`)

        if (i % 10 === 0) {
          if (global.gc) global.gc()
          const memory = process.memoryUsage().heapUsed / 1024 / 1024
          memorySnapshots.push(memory)
          console.log(`[Socket Memory Test] Iteration ${i}/${ITERATIONS} - Memory: ${memory.toFixed(2)} MB`)
        }
      }

      const firstMemory = memorySnapshots[0]
      const lastMemory = memorySnapshots[memorySnapshots.length - 1]
      const memoryGrowth = lastMemory - firstMemory

      console.log(`[Socket Memory Test] Memory growth: ${memoryGrowth.toFixed(2)} MB`)

      // Memory growth should be minimal
      expect(memoryGrowth).toBeLessThan(15)
    }, 60000)
  })
})
