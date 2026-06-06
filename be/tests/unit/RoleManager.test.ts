import { describe, it, expect, beforeEach } from 'vitest'
import { RoleManager } from '../../src/modules/game/engine/RoleManager'
import { createMockPlayers, createPlayingRoom } from '../helpers/mockData'
import { Role } from '../../src/modules/game/types'

describe('RoleManager', () => {
  let roleManager: RoleManager

  beforeEach(() => {
    roleManager = new RoleManager()
  })

  describe('assignRoles', () => {
    it('should assign roles to 7 players', () => {
      const players = createMockPlayers(7)
      const assigned = roleManager.assignRoles(players)

      expect(assigned.length).toBe(7)
      expect(assigned.every(p => p.role)).toBe(true)
    })

    it('should assign roles to 5 players (minimum)', () => {
      const players = createMockPlayers(5)
      const assigned = roleManager.assignRoles(players)

      expect(assigned.length).toBe(5)
      expect(assigned.every(p => p.role)).toBe(true)
    })

    it('should assign roles to 10 players (maximum)', () => {
      const players = createMockPlayers(10)
      const assigned = roleManager.assignRoles(players)

      expect(assigned.length).toBe(10)
      expect(assigned.every(p => p.role)).toBe(true)
    })

    it('should assign exactly one narrator', () => {
      const players = createMockPlayers(7)
      const assigned = roleManager.assignRoles(players)

      const narrators = assigned.filter(p => p.isNarrator)
      expect(narrators.length).toBe(1)
      expect(narrators[0].role).toBe(Role.NARRATOR)
    })

    it('should assign exactly one sender', () => {
      const players = createMockPlayers(7)
      const assigned = roleManager.assignRoles(players)

      const senders = assigned.filter(p => p.isSender)
      expect(senders.length).toBe(1)
      expect(senders[0].role).toBe(Role.SENDER)
    })

    it('should assign base roles (narrator, sender, silencer)', () => {
      const players = createMockPlayers(7)
      const assigned = roleManager.assignRoles(players)

      const roles = assigned.map(p => p.role)
      expect(roles).toContain(Role.NARRATOR)
      expect(roles).toContain(Role.SENDER)
      expect(roles).toContain(Role.SILENCER)
    })

    it('should initialize coins correctly (yellow=5-10 random, red=3, green=0)', () => {
      const players = createMockPlayers(7)
      const assigned = roleManager.assignRoles(players)

      assigned.forEach(p => {
        expect(p.coins.red).toBe(3)
        expect(p.coins.yellow).toBeGreaterThanOrEqual(5)
        expect(p.coins.yellow).toBeLessThanOrEqual(10)
        expect(p.coins.green).toBe(0)
      })
    })

    it('should initialize coins with random yellow (5-10) for each player', () => {
      for (let count = 5; count <= 10; count++) {
        const players = createMockPlayers(count)
        const assigned = roleManager.assignRoles(players)

        assigned.forEach(p => {
          expect(p.coins.red).toBe(3)
          expect(p.coins.yellow).toBeGreaterThanOrEqual(5)
          expect(p.coins.yellow).toBeLessThanOrEqual(10)
          expect(p.coins.green).toBe(0)
        })
      }
    })

    it('should handle different player counts (5-10)', () => {
      for (let count = 5; count <= 10; count++) {
        const players = createMockPlayers(count)
        const assigned = roleManager.assignRoles(players)

        expect(assigned.length).toBe(count)
        expect(assigned.filter(p => p.isNarrator).length).toBe(1)
        expect(assigned.filter(p => p.isSender).length).toBe(1)
      }
    })

    it('should throw error for invalid player count', () => {
      const players4 = createMockPlayers(4)
      expect(() => roleManager.assignRoles(players4)).toThrow('Invalid player count: 4')

      const players11 = createMockPlayers(11)
      expect(() => roleManager.assignRoles(players11)).toThrow('Invalid player count: 11')
    })
  })

  describe('rotateRoles', () => {
    it('should rotate narrator to next player', () => {
      const room = createPlayingRoom(7)
      const oldNarratorIndex = room.players.findIndex(p => p.isNarrator)
      
      const rotated = roleManager.rotateRoles(room)
      const newNarratorIndex = rotated.players.findIndex(p => p.isNarrator)

      expect(newNarratorIndex).toBe((oldNarratorIndex + 1) % room.players.length)
    })

    it('should rotate sender to next player', () => {
      const room = createPlayingRoom(7)
      const oldSenderIndex = room.players.findIndex(p => p.isSender)
      
      const rotated = roleManager.rotateRoles(room)
      const newSenderIndex = rotated.players.findIndex(p => p.isSender)

      expect(newSenderIndex).toBe((oldSenderIndex + 1) % room.players.length)
    })

    it('should update currentNarrator and currentNTG', () => {
      const room = createPlayingRoom(7)
      const rotated = roleManager.rotateRoles(room)

      const narrator = rotated.players.find(p => p.isNarrator)
      const sender = rotated.players.find(p => p.isSender)

      expect(rotated.currentNarrator).toBe(narrator?.userId)
      expect(rotated.currentNTG).toBe(sender?.userId)
    })

    it('should wrap around at end of player list', () => {
      const room = createPlayingRoom(7)
      
      // Rotate until last player is narrator
      let rotated = room
      for (let i = 0; i < 6; i++) {
        rotated = roleManager.rotateRoles(rotated)
      }

      // Next rotation should wrap to first player
      rotated = roleManager.rotateRoles(rotated)
      const narratorIndex = rotated.players.findIndex(p => p.isNarrator)
      expect(narratorIndex).toBe(0)
    })

    it('should clear old narrator flag', () => {
      const room = createPlayingRoom(7)
      const oldNarratorId = room.currentNarrator
      
      const rotated = roleManager.rotateRoles(room)
      const oldNarrator = rotated.players.find(p => p.userId === oldNarratorId)

      expect(oldNarrator?.isNarrator).toBe(false)
    })

    it('should clear old sender flag', () => {
      const room = createPlayingRoom(7)
      const oldSenderId = room.currentNTG
      
      const rotated = roleManager.rotateRoles(room)
      const oldSender = rotated.players.find(p => p.userId === oldSenderId)

      expect(oldSender?.isSender).toBe(false)
    })

    it('should ensure sender and narrator are never the same player', () => {
      const room = createPlayingRoom(7)
      
      // Test multiple rotations
      let rotated = room
      for (let i = 0; i < 20; i++) {
        rotated = roleManager.rotateRoles(rotated)
        
        const narrator = rotated.players.find(p => p.isNarrator)
        const sender = rotated.players.find(p => p.isSender)
        
        expect(narrator?.userId).not.toBe(sender?.userId)
        expect(narrator?.socketId).not.toBe(sender?.socketId)
      }
    })

    it('should keep exactly one role per player across rotations', () => {
      let rotated = createPlayingRoom(7)

      for (let i = 0; i < 20; i++) {
        rotated = roleManager.rotateRoles(rotated)

        expect(rotated.players.filter(p => p.isNarrator)).toHaveLength(1)
        expect(rotated.players.filter(p => p.isSender)).toHaveLength(1)
        expect(rotated.players.every(p => Boolean(p.role))).toBe(true)
        expect(rotated.players.every(p => Boolean(p.originalRole))).toBe(true)
        expect(rotated.players.filter(p => p.role === Role.NARRATOR)).toHaveLength(1)
        expect(rotated.players.filter(p => p.role === Role.SENDER)).toHaveLength(1)
      }
    })

    it('should skip sender to next player if would collide with narrator', () => {
      // Create room where narrator and sender are adjacent
      const room = createPlayingRoom(5) // Smaller group to test easier
      
      // Manually set narrator at index 0, sender at index 4 (last)
      room.players.forEach((p, i) => {
        p.isNarrator = i === 0
        p.isSender = i === 4
        p.role = i === 0 ? Role.NARRATOR : i === 4 ? Role.SENDER : p.role
      })
      room.currentNarrator = room.players[0].userId
      room.currentNTG = room.players[4].userId
      
      // After rotation: narrator should be at 1, sender should be at 0 (4+1=0, but skip 1, so stay 0)
      const rotated = roleManager.rotateRoles(room)
      
      const narratorIndex = rotated.players.findIndex(p => p.isNarrator)
      const senderIndex = rotated.players.findIndex(p => p.isSender)
      
      expect(narratorIndex).toBe(1)
      expect(senderIndex).not.toBe(narratorIndex)
      expect(senderIndex).toBe(0) // Wrapped to 0, skipped 1 (narrator)
    })
  })

  describe('hasRole', () => {
    it('should return true if player has role', () => {
      const room = createPlayingRoom(7)
      const silencer = room.players.find(p => p.role === Role.SILENCER)!

      expect(roleManager.hasRole(silencer, Role.SILENCER)).toBe(true)
    })

    it('should return false if player does not have role', () => {
      const room = createPlayingRoom(7)
      const silencer = room.players.find(p => p.role === Role.SILENCER)!

      expect(roleManager.hasRole(silencer, Role.HEALER)).toBe(false)
    })
  })

  describe('findPlayerWithRole', () => {
    it('should find player with specific role', () => {
      const room = createPlayingRoom(7)
      const healer = roleManager.findPlayerWithRole(room, Role.HEALER)

      expect(healer).toBeDefined()
      expect(healer?.role).toBe(Role.HEALER)
    })

    it('should return undefined if role not found', () => {
      const room = createPlayingRoom(7)
      // Remove all healers
      room.players.forEach(p => {
        if (p.role === Role.HEALER) p.role = Role.CONNECTOR
      })

      const healer = roleManager.findPlayerWithRole(room, Role.HEALER)
      expect(healer).toBeUndefined()
    })
  })
})
