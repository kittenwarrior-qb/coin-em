import { Room, Player, Role } from '../types'

export class RoleManager {
  /**
   * Rotate narrator and sender to next players
   * IMPORTANT: Sender and Narrator must NEVER be the same person in a round
   * NOTE: Other roles (Healer, Silencer, etc.) stay with their original players
   *       We use originalRole to restore roles after rotation
   */
  rotateRoles(room: Room): Room {
    const players = [...room.players]

    const currentNarratorIndex = players.findIndex((p) => p.isNarrator)
    const currentSenderIndex = players.findIndex((p) => p.isSender)

    if (currentNarratorIndex === -1 || currentSenderIndex === -1) {
      throw new Error('Cannot find current narrator or sender')
    }

    // Restore original roles — clear narrator/sender flags
    players[currentNarratorIndex] = {
      ...players[currentNarratorIndex],
      role: players[currentNarratorIndex].originalRole,
      isNarrator: false,
      isSender: false,
    }
    players[currentSenderIndex] = {
      ...players[currentSenderIndex],
      role: players[currentSenderIndex].originalRole,
      isNarrator: false,
      isSender: false,
    }

    // Next narrator (circular)
    const nextNarratorIndex = (currentNarratorIndex + 1) % players.length

    // Next sender: start after current sender, skip if same as new narrator
    let nextSenderIndex = (currentSenderIndex + 1) % players.length
    if (nextSenderIndex === nextNarratorIndex) {
      nextSenderIndex = (nextSenderIndex + 1) % players.length
    }
    // Edge case: still same after second skip (very small player count)
    if (nextSenderIndex === nextNarratorIndex) {
      nextSenderIndex = (nextSenderIndex + 1) % players.length
    }

    // Assign new narrator
    players[nextNarratorIndex] = {
      ...players[nextNarratorIndex],
      role: Role.NARRATOR,
      isNarrator: true,
      isSender: false,
    }

    // Assign new sender
    players[nextSenderIndex] = {
      ...players[nextSenderIndex],
      role: Role.SENDER,
      isNarrator: false,
      isSender: true,
    }

    return {
      ...room,
      players,
      currentNarrator: players[nextNarratorIndex].userId,
      currentNTG: players[nextSenderIndex].userId,
    }
  }

  /**
   * Assign roles to players at game start
   */
  assignRoles(players: Player[]): Player[] {
    const playerCount = players.length
    const roles = this.getRolesForPlayerCount(playerCount)

    if (roles.length !== playerCount) {
      throw new Error(`Cannot assign roles for ${playerCount} players`)
    }

    // Shuffle roles
    const shuffledRoles = this.shuffleArray([...roles])

    // Assign roles to players with initial coins
    // UPDATED LOGIC:
    // - Red = 3 (reset each round)
    // - Yellow = 5-10 random (ONLY given in round 1, kept in other rounds)
    // - Green = 0 (received when others give coins)
    return players.map((player, index) => {
      const role = shuffledRoles[index]
      const initialYellow = Math.floor(Math.random() * 6) + 5 // Random 5-10
      
      return {
        ...player,
        role,
        originalRole: role, // Lưu role gốc
        isNarrator: role === Role.NARRATOR,
        isSender: role === Role.SENDER,
        coins: { 
          red: 3,              // 3 red coins (reset each round)
          yellow: initialYellow, // Random 5-10 (only round 1)
          green: 0             // Start with 0 green (received from others)
        },
      }
    })
  }

  /**
   * Get roles for specific player count
   * Based on game rules:
   * 5 người: Quản trò, Trao Gửi, Im Lặng, Kết Nối, Gợi Mở
   * 6 người: Quản trò, Trao Gửi, Im Lặng, Kết Nối, Gợi Mở, Dẫn Lối
   * 7 người: Quản trò, Trao Gửi, Im Lặng, Kết Nối, Gợi Mở, Dẫn Lối, Chữa Lành
   * 8 người: Quản trò, Trao Gửi, 2 Im Lặng, Kết Nối, Gợi Mở, Dẫn Lối, Chữa Lành
   * 9 người: Quản trò, Trao Gửi, 2 Im Lặng, 2 Kết Nối, Gợi Mở, Dẫn Lối, Chữa Lành
   * 10 người: Quản trò, Trao Gửi, 2 Im Lặng, 2 Kết Nối, 2 Gợi Mở, Dẫn Lối, Chữa Lành
   */
  private getRolesForPlayerCount(count: number): Role[] {
    switch (count) {
      case 5:
        return [
          Role.NARRATOR,    // Quản trò
          Role.SENDER,      // Trao Gửi
          Role.SILENCER,    // Im Lặng
          Role.CONNECTOR,   // Kết Nối
          Role.OPENER,      // Gợi Mở
        ]
      
      case 6:
        return [
          Role.NARRATOR,    // Quản trò
          Role.SENDER,      // Trao Gửi
          Role.SILENCER,    // Im Lặng
          Role.CONNECTOR,   // Kết Nối
          Role.OPENER,      // Gợi Mở
          Role.GUIDE,       // Dẫn Lối
        ]
      
      case 7:
        return [
          Role.NARRATOR,    // Quản trò
          Role.SENDER,      // Trao Gửi
          Role.SILENCER,    // Im Lặng
          Role.CONNECTOR,   // Kết Nối
          Role.OPENER,      // Gợi Mở
          Role.GUIDE,       // Dẫn Lối
          Role.HEALER,      // Chữa Lành
        ]
      
      case 8:
        return [
          Role.NARRATOR,    // Quản trò
          Role.SENDER,      // Trao Gửi
          Role.SILENCER,    // Im Lặng 1
          Role.SILENCER,    // Im Lặng 2
          Role.CONNECTOR,   // Kết Nối
          Role.OPENER,      // Gợi Mở
          Role.GUIDE,       // Dẫn Lối
          Role.HEALER,      // Chữa Lành
        ]
      
      case 9:
        return [
          Role.NARRATOR,    // Quản trò
          Role.SENDER,      // Trao Gửi
          Role.SILENCER,    // Im Lặng 1
          Role.SILENCER,    // Im Lặng 2
          Role.CONNECTOR,   // Kết Nối 1
          Role.CONNECTOR,   // Kết Nối 2
          Role.OPENER,      // Gợi Mở
          Role.GUIDE,       // Dẫn Lối
          Role.HEALER,      // Chữa Lành
        ]
      
      case 10:
        return [
          Role.NARRATOR,    // Quản trò
          Role.SENDER,      // Trao Gửi
          Role.SILENCER,    // Im Lặng 1
          Role.SILENCER,    // Im Lặng 2
          Role.CONNECTOR,   // Kết Nối 1
          Role.CONNECTOR,   // Kết Nối 2
          Role.OPENER,      // Gợi Mở 1
          Role.OPENER,      // Gợi Mở 2
          Role.GUIDE,       // Dẫn Lối
          Role.HEALER,      // Chữa Lành
        ]
      
      default:
        throw new Error(`Invalid player count: ${count}. Must be between 5 and 10.`)
    }
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Check if player has specific role
   */
  hasRole(player: Player, role: Role): boolean {
    return player.role === role
  }

  /**
   * Find player with specific role
   */
  findPlayerWithRole(room: Room, role: Role): Player | undefined {
    return room.players.find((p) => p.role === role)
  }
}
