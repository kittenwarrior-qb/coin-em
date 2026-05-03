import { Player, Role, Coins } from '../../src/modules/game/types'

/**
 * Builder Pattern for creating test Player objects
 * Provides fluent API for flexible player configuration
 */
export class PlayerBuilder {
  private userId: string = `user-${Math.random().toString(36).substr(2, 9)}`
  private socketId: string = `socket-${Math.random().toString(36).substr(2, 9)}`
  private name: string = `Player ${Math.floor(Math.random() * 1000)}`
  private role?: Role
  private isNarrator: boolean = false
  private isSender: boolean = false
  private coins: Coins = { red: 3, yellow: 7, green: 0 }
  private collectedGreenCoins: number = 0

  withUserId(userId: string): this {
    this.userId = userId
    return this
  }

  withSocketId(socketId: string): this {
    this.socketId = socketId
    return this
  }

  withName(name: string): this {
    this.name = name
    return this
  }

  withRole(role: Role): this {
    this.role = role
    return this
  }

  asNarrator(): this {
    this.role = Role.NARRATOR
    this.isNarrator = true
    return this
  }

  asSender(): this {
    this.role = Role.SENDER
    this.isSender = true
    return this
  }

  asSilencer(): this {
    this.role = Role.SILENCER
    return this
  }

  asHealer(): this {
    this.role = Role.HEALER
    return this
  }

  asConnector(): this {
    this.role = Role.CONNECTOR
    return this
  }

  asOpener(): this {
    this.role = Role.OPENER
    return this
  }

  asGuide(): this {
    this.role = Role.GUIDE
    return this
  }

  withCoins(coins: Partial<Coins>): this {
    this.coins = { ...this.coins, ...coins }
    return this
  }

  withRedCoins(amount: number): this {
    this.coins.red = amount
    return this
  }

  withYellowCoins(amount: number): this {
    this.coins.yellow = amount
    return this
  }

  withGreenCoins(amount: number): this {
    this.coins.green = amount
    return this
  }

  withCollectedGreenCoins(amount: number): this {
    this.collectedGreenCoins = amount
    return this
  }

  build(): Player {
    return {
      socketId: this.socketId,
      userId: this.userId,
      name: this.name,
      role: this.role,
      originalRole: this.role, // Set originalRole same as role
      isNarrator: this.isNarrator,
      isSender: this.isSender,
      coins: this.coins,
      collectedGreenCoins: this.collectedGreenCoins,
    }
  }
}
