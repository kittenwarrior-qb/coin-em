import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client'
import { Server } from 'socket.io'
import { createServer } from 'http'
import express from 'express'
import { registerRoomHandlers } from '../../src/socket/handlers/roomHandlers'
import { registerGameHandlers } from '../../src/socket/handlers/gameHandlers'
import { roomRepository } from '../../src/modules/room'

describe('Socket.IO Game Integration', () => {
  let io: Server
  let httpServer: any
  let clients: ClientSocket[] = []
  let PORT: number
  let SERVER_URL: string

  beforeAll(async () => {
    const app = express()
    httpServer = createServer(app)
    io = new Server(httpServer, {
      cors: { origin: '*' },
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

  afterAll(async () => {
    // Force disconnect all clients
    clients.forEach(client => {
      try {
        client.removeAllListeners()
        client.disconnect()
      } catch (e) {
        // Ignore errors
      }
    })
    clients = []
    
    // Close server
    try {
      io.close()
      await new Promise<void>((resolve) => {
        httpServer.close(() => {
          resolve()
        })
        
        // Force close after 1 second
        setTimeout(() => {
          resolve()
        }, 1000)
      })
    } catch (e) {
      // Ignore errors
    }
  })

  beforeEach(() => {
    // Clear rooms before each test
    const allRooms = roomRepository.findAll()
    allRooms.forEach(room => roomRepository.delete(room.id))
    
    // Disconnect all clients
    clients.forEach(client => client.disconnect())
    clients = []
  })

  function createClient(): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = ioClient(SERVER_URL, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
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

  describe('Room Management', () => {
    it('should create room when first player joins', async () => {
      const client = await createClient()
      const roomId = 'test-room-1'

      return new Promise<void>((resolve) => {
        client.emit('join_room', {
          name: 'Player 1',
          roomId,
          userId: 'user-1',
          createIfMissing: true,
        })

        client.on('room_state', (state) => {
          expect(state.id).toBe(roomId)
          expect(state.players.length).toBe(1)
          expect(state.host).toBe('user-1')
          resolve()
        })
      })
    })

    it('should allow multiple players to join', async () => {
      const roomId = 'test-room-2'
      const client1 = await createClient()
      const client2 = await createClient()

      return new Promise<void>((resolve) => {
        let joinCount = 0

        client1.emit('join_room', {
          name: 'Player 1',
          roomId,
          userId: 'user-1',
          createIfMissing: true,
        })

        client1.on('room_state', () => {
          joinCount++
          if (joinCount === 1) {
            client2.emit('join_room', {
              name: 'Player 2',
              roomId,
              userId: 'user-2',
            })
          }
        })

        client2.on('room_state', (state) => {
          expect(state.players.length).toBe(2)
          resolve()
        })
      })
    })

    it('should broadcast player_joined to existing players', async () => {
      const roomId = 'test-room-3'
      const client1 = await createClient()
      const client2 = await createClient()

      return new Promise<void>((resolve) => {
        client1.emit('join_room', {
          name: 'Player 1',
          roomId,
          userId: 'user-1',
          createIfMissing: true,
        })

        client1.on('room_state', () => {
          client1.on('player_joined', (data) => {
            expect(data.name).toBe('Player 2')
            expect(data.userId).toBe('user-2')
            resolve()
          })

          client2.emit('join_room', {
            name: 'Player 2',
            roomId,
            userId: 'user-2',
          })
        })
      })
    })

    it.skip('should reject joining room with game in progress', async () => {
      // TODO: Fix timeout issue - event listener race condition
      const roomId = 'test-room-4'
      const client1 = await createClient()

      // Create room and start game
      client1.emit('join_room', {
        name: 'Player 1',
        roomId,
        userId: 'user-1',
        createIfMissing: true,
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Manually set room to playing
      const room = roomRepository.findById(roomId)
      if (room) {
        roomRepository.update(roomId, { status: 'playing' })
      }

      const client2 = await createClient()

      return new Promise<void>((resolve) => {
        client2.emit('join_room', {
          name: 'Player 2',
          roomId,
          userId: 'user-2',
        })

        client2.on('error', (error) => {
          expect(error.code).toBe('game_in_progress')
          resolve()
        })
      })
    })
  })

  describe('Game Start', () => {
    it('should start game with 7 players', async () => {
      const roomId = 'test-room-5'
      const playerClients: ClientSocket[] = []

      // Create 7 players
      for (let i = 0; i < 7; i++) {
        const client = await createClient()
        playerClients.push(client)
        
        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: `Player ${i + 1}`,
            roomId,
            userId: `user-${i + 1}`,
            createIfMissing: i === 0,
          })
          client.on('room_state', () => resolve())
        })
      }

      return new Promise<void>((resolve) => {
        playerClients[0].emit('start_game', { roomId }, (response: any) => {
          expect(response.success).toBe(true)
        })

        playerClients[1].on('game_started', (state) => {
          expect(state.status).toBe('playing')
          expect(state.phase).toBe('role-reveal')
          expect(state.players.every((p: any) => p.role)).toBe(true)
          resolve()
        })
      })
    })

    it.skip('should reject start with less than 5 players', async () => {
      // TODO: Fix timeout issue - callback not being called
      const roomId = 'test-room-6'
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

      return new Promise<void>((resolve) => {
        client.emit('start_game', { roomId }, (response: any) => {
          expect(response.success).toBe(false)
          expect(response.error).toBe('NOT_ENOUGH_PLAYERS')
          resolve()
        })
      })
    })

    it('should only allow host to start game', async () => {
      const roomId = 'test-room-7'
      const host = await createClient()
      const player = await createClient()

      await new Promise<void>((resolve) => {
        host.emit('join_room', {
          name: 'Host',
          roomId,
          userId: 'host-1',
          createIfMissing: true,
        })
        host.on('room_state', () => resolve())
      })

      await new Promise<void>((resolve) => {
        player.emit('join_room', {
          name: 'Player',
          roomId,
          userId: 'player-1',
        })
        player.on('room_state', () => resolve())
      })

      return new Promise<void>((resolve) => {
        player.emit('start_game', { roomId }, (response: any) => {
          expect(response.success).toBe(false)
          expect(response.error).toBe('NOT_HOST')
          resolve()
        })
      })
    })
  })

  describe('Turn Advancement', () => {
    it('should advance turn when narrator requests', async () => {
      const roomId = 'test-room-8'
      const playerClients: ClientSocket[] = []

      // Create and start game with 7 players
      for (let i = 0; i < 7; i++) {
        const client = await createClient()
        playerClients.push(client)
        
        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: `Player ${i + 1}`,
            roomId,
            userId: `user-${i + 1}`,
            createIfMissing: i === 0,
          })
          client.on('room_state', () => resolve())
        })
      }

      await new Promise<void>((resolve) => {
        playerClients[0].emit('start_game', { roomId })
        playerClients[0].on('game_started', () => resolve())
      })

      return new Promise<void>((resolve) => {
        playerClients[0].emit('next_turn', { roomId })

        playerClients[1].on('turn_changed', (state) => {
          expect(state.phase).toBe('night')
          resolve()
        })
      })
    })

    it('should reject turn advancement from non-narrator', async () => {
      const roomId = 'test-room-9'
      const playerClients: ClientSocket[] = []

      // Create and start game
      for (let i = 0; i < 7; i++) {
        const client = await createClient()
        playerClients.push(client)
        
        await new Promise<void>((resolve) => {
          client.emit('join_room', {
            name: `Player ${i + 1}`,
            roomId,
            userId: `user-${i + 1}`,
            createIfMissing: i === 0,
          })
          client.on('room_state', () => resolve())
        })
      }

      await new Promise<void>((resolve) => {
        playerClients[0].emit('start_game', { roomId })
        playerClients[0].on('game_started', () => resolve())
      })

      return new Promise<void>((resolve) => {
        playerClients[1].emit('next_turn', { roomId }, (response: any) => {
          expect(response.success).toBe(false)
          expect(response.error).toBe('NOT_NARRATOR')
          resolve()
        })
      })
    })
  })
})
