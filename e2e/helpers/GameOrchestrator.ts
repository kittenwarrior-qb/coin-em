import { Browser } from '@playwright/test'
import { PlayerContext } from './PlayerContext'

/**
 * Manages multiple PlayerContext instances for a single game session.
 * Handles room creation, player joining, and synchronized assertions.
 */
export class GameOrchestrator {
  private browser: Browser
  private players: PlayerContext[] = []
  public roomId: string = ''

  constructor(browser: Browser) {
    this.browser = browser
  }

  /**
   * Create N PlayerContext instances (browser contexts).
   * Does NOT navigate yet.
   */
  async createPlayers(count: number, namePrefix = 'Player'): Promise<PlayerContext[]> {
    this.players = []
    for (let i = 1; i <= count; i++) {
      const player = new PlayerContext(
        `${namePrefix}${i}`,
        `uid-${Date.now()}-${i}`
      )
      const ctx = await this.browser.newContext()
      await player.initialize(ctx)
      this.players.push(player)
    }
    return this.players
  }

  /**
   * Host (first player) creates room, rest join.
   * Fills room with bots if needed to reach minPlayers.
   */
  async setupRoom(minPlayers = 7): Promise<string> {
    const [host, ...guests] = this.players

    // Host creates room
    await host.goToHome()
    this.roomId = await host.createRoom()

    // Guests join
    for (const guest of guests) {
      await guest.goToHome()
      await guest.joinRoom(this.roomId)
    }

    // Add bots until we have enough
    const currentCount = await host.getWaitingPlayerCount()
    const botsNeeded = minPlayers - currentCount
    for (let i = 0; i < botsNeeded; i++) {
      await host.addBots()
      await host.p.waitForTimeout(300)
    }

    return this.roomId
  }

  /** Host starts the game */
  async startGame() {
    await this.players[0].startGame()
    // Wait for all human players to see the game board
    await Promise.all(this.players.map(p => p.waitForGameBoard()))
  }

  /** Wait for all players to reach a specific phase */
  async waitForAllPhase(phase: string, timeout = 20_000) {
    await Promise.all(this.players.map(p => p.waitForPhase(phase, timeout)))
  }

  /** Assert all players see the same phase */
  async assertAllPhase(phase: string) {
    for (const player of this.players) {
      await player.assertPhase(phase)
    }
  }

  /** Assert all players see the same player count */
  async assertAllPlayerCount(expected: number) {
    for (const player of this.players) {
      const count = await player.getPlayerCount()
      if (count !== expected) {
        throw new Error(`[${player.name}] Expected ${expected} players, got ${count}`)
      }
    }
  }

  /** Find the narrator among human players */
  async findNarrator(): Promise<PlayerContext | null> {
    for (const player of this.players) {
      if (await player.isNarrator()) return player
    }
    return null
  }

  /** Find the sender (NTG) among human players */
  async findSender(): Promise<PlayerContext | null> {
    for (const player of this.players) {
      if (await player.isSender()) return player
    }
    return null
  }

  getPlayers(): PlayerContext[] {
    return this.players
  }

  getHost(): PlayerContext {
    return this.players[0]
  }

  async cleanup() {
    await Promise.all(this.players.map(p => p.close()))
    this.players = []
  }
}
