import { Room, Player, Role } from '../types'

export class RoleManager {
  /**
   * Rotate narrator and sender to next players
   */
  rotateRoles(room: Room): Room {
    const players = [...room.players]

    // Find current narrator and sender indices
    const currentNarratorIndex = players.findIndex((p) => p.isNarrator)
    const currentSenderIndex = players.findIndex((p) => p.isSender)

    if (currentNarratorIndex === -1 || currentSenderIndex === -1) {
      throw new Error('Cannot find current narrator or sender')
    }

    // Clear current roles
    players[currentNarratorIndex].isNarrator = false
    players[currentSenderIndex].isSender = false

    // Assign to next players (circular)
    const nextNarratorIndex = (currentNarratorIndex + 1) % players.length
    const nextSenderIndex = (currentSenderIndex + 1) % players.length

    players[nextNarratorIndex].role = Role.NARRATOR
    players[nextNarratorIndex].isNarrator = true

    players[nextSenderIndex].role = Role.SENDER
    players[nextSenderIndex].isSender = true

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

    // Assign roles to players
    return players.map((player, index) => {
      const role = shuffledRoles[index]
      return {
        ...player,
        role,
        isNarrator: role === Role.NARRATOR,
        isSender: role === Role.SENDER,
        coins: { red: 0, yellow: 0, green: 0 },
      }
    })
  }

  /**
   * Get roles for specific player count
   */
  private getRolesForPlayerCount(count: number): Role[] {
    // Base roles (always present)
    const baseRoles = [Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.HEALER]

    // Additional roles based on player count
    const additionalRoles = [
      Role.CONNECTOR,
      Role.OPENER,
      Role.GUIDE,
      Role.CONNECTOR, // Duplicate for more players
      Role.OPENER, // Duplicate for more players
    ]

    const roles = [...baseRoles]
    const remaining = count - baseRoles.length

    for (let i = 0; i < remaining && i < additionalRoles.length; i++) {
      roles.push(additionalRoles[i])
    }

    return roles
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
