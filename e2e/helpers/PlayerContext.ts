import { BrowserContext, Page, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

/**
 * Represents a single player's browser session.
 * Wraps all UI interactions for one player.
 */
export class PlayerContext {
  public readonly name: string
  public readonly userId: string
  public context: BrowserContext | null = null
  public page: Page | null = null

  constructor(name: string, userId: string) {
    this.name = name
    this.userId = userId
  }

  async initialize(context: BrowserContext) {
    this.context = context
    this.page = await context.newPage()

    // Inject userId into localStorage before any page load
    await this.page.addInitScript((uid: string) => {
      localStorage.setItem('userId', uid)
    }, this.userId)
  }

  get p(): Page {
    if (!this.page) throw new Error(`[${this.name}] Page not initialized`)
    return this.page
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async goToHome() {
    await this.p.goto(BASE_URL)
    await this.p.waitForSelector('[data-testid="lobby"]', { timeout: 10_000 })
  }

  // ── Lobby ───────────────────────────────────────────────────────────────────

  /** Create a new room and return the generated roomId */
  async createRoom(): Promise<string> {
    await this.p.click('[data-testid="btn-create-room"]')
    await this.p.fill('[data-testid="input-username-create"]', this.name)
    await this.p.click('[data-testid="btn-confirm-create"]')
    await this.p.waitForSelector('[data-testid="waiting-room"]', { timeout: 10_000 })

    const roomIdEl = this.p.locator('[data-testid="room-id"]')
    return (await roomIdEl.textContent()) ?? ''
  }

  /** Join an existing room by ID */
  async joinRoom(roomId: string) {
    await this.p.click('[data-testid="btn-join-room"]')
    await this.p.fill('[data-testid="input-room-id"]', roomId)
    await this.p.fill('[data-testid="input-username-join"]', this.name)
    await this.p.click('[data-testid="btn-confirm-join"]')
    await this.p.waitForSelector('[data-testid="waiting-room"]', { timeout: 10_000 })
  }

  // ── Waiting Room ─────────────────────────────────────────────────────────────

  async addBots() {
    const btn = this.p.locator('[data-testid="btn-add-bots"]')
    if (await btn.isVisible()) await btn.click()
  }

  async startGame() {
    await this.p.click('[data-testid="btn-start-game"]')
    await this.waitForGameBoard()
  }

  async getWaitingPlayerCount(): Promise<number> {
    const text = await this.p.locator('[data-testid="player-count"]').textContent()
    const match = text?.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  // ── Game Board ───────────────────────────────────────────────────────────────

  async waitForGameBoard() {
    await this.p.waitForSelector('[data-testid="game-phase"]', { timeout: 15_000 })
    // Dismiss role card overlay if present
    await this.dismissOverlay()
  }

  /** Dismiss any full-screen overlay (role card, etc) by clicking backdrop */
  async dismissOverlay() {
    try {
      const overlay = this.p.locator('.fixed.inset-0.z-50.bg-black\\/60')
      if (await overlay.isVisible({ timeout: 1_000 })) {
        await overlay.click({ position: { x: 10, y: 10 } })
        await this.p.waitForTimeout(300)
      }
    } catch {
      // No overlay, continue
    }
  }

  async getCurrentPhase(): Promise<string> {
    const el = this.p.locator('[data-testid="game-phase"]')
    return (await el.getAttribute('data-phase')) ?? ''
  }

  async waitForPhase(phase: string, timeout = 15_000) {
    await this.p.waitForSelector(
      `[data-testid="game-phase"][data-phase="${phase}"]`,
      { timeout }
    )
  }

  async getMyRole(): Promise<string> {
    // Role is stored in data-role on my own player card
    const myCard = this.p.locator('[data-testid^="player-card-"][data-is-me="true"]')
    return (await myCard.getAttribute('data-role')) ?? ''
  }

  async isNarrator(): Promise<boolean> {
    const role = await this.getMyRole()
    return role === 'Người Quản trò'
  }

  async isSender(): Promise<boolean> {
    const role = await this.getMyRole()
    return role === 'Người Trao Gửi'
  }

  /** Narrator: advance to next phase */
  async clickNextTurn() {
    await this.p.waitForSelector('[data-testid="btn-next-turn"]', { timeout: 10_000 })
    await this.p.click('[data-testid="btn-next-turn"]')
  }

  /** NTG: draw situation card */
  async drawSituationCard() {
    await this.p.click('[data-testid="btn-draw-situation"]')
  }

  /** NTG: open emotion selection and pick first card */
  async selectEmotionCard() {
    await this.p.click('[data-testid="btn-select-emotion"]')
    await this.p.waitForSelector('.grid .aspect-\\[2\\/3\\]', { timeout: 5_000 })
    await this.p.locator('.grid .aspect-\\[2\\/3\\]').first().click()
    await this.p.click('button:has-text("Chọn thẻ này")')
  }

  /** NTG: open reflection selection and pick first card */
  async selectReflectionCard() {
    await this.p.click('[data-testid="btn-select-reflection"]')
    await this.p.waitForSelector('.grid .aspect-\\[2\\/3\\]', { timeout: 5_000 })
    await this.p.locator('.grid .aspect-\\[2\\/3\\]').first().click()
    await this.p.click('button:has-text("Chọn thẻ này")')
  }

  /** NTG: open selfcare selection and pick first card */
  async selectSelfcareCard() {
    await this.p.click('[data-testid="btn-select-selfcare"]')
    await this.p.waitForSelector('.grid .aspect-\\[2\\/3\\]', { timeout: 5_000 })
    await this.p.locator('.grid .aspect-\\[2\\/3\\]').first().click()
    await this.p.click('button:has-text("Chọn thẻ này")')
  }

  /** Give a coin to another player by name */
  async giveCoin(targetName: string, coinType: 'red' | 'yellow' | 'green') {
    await this.p.click(`[data-testid="player-card-${targetName}"]`)
    await this.p.waitForSelector(`[data-testid="coin-btn-${coinType}"]`, { timeout: 3_000 })
    await this.p.click(`[data-testid="coin-btn-${coinType}"]`)
  }

  /** Night action: click a player card (silencer/healer) */
  async nightActionOn(targetName: string) {
    await this.p.click(`[data-testid="player-card-${targetName}"]`)
  }

  /** Get all visible player names from the grid */
  async getVisiblePlayerNames(): Promise<string[]> {
    const cards = this.p.locator('[data-testid^="player-card-"]')
    const count = await cards.count()
    const names: string[] = []
    for (let i = 0; i < count; i++) {
      const testId = await cards.nth(i).getAttribute('data-testid')
      if (testId) names.push(testId.replace('player-card-', ''))
    }
    return names
  }

  async getPlayerCount(): Promise<number> {
    return await this.p.locator('[data-testid^="player-card-"]').count()
  }

  // ── Assertions ───────────────────────────────────────────────────────────────

  async assertPhase(phase: string) {
    await expect(this.p.locator('[data-testid="game-phase"]')).toHaveAttribute('data-phase', phase)
  }

  async assertOnWaitingRoom() {
    await expect(this.p.locator('[data-testid="waiting-room"]')).toBeVisible()
  }

  async assertOnGameBoard() {
    await expect(this.p.locator('[data-testid="game-phase"]')).toBeVisible()
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  async reload() {
    await this.p.reload()
    // Wait for reconnect — either waiting room or game board
    await this.p.waitForSelector(
      '[data-testid="waiting-room"], [data-testid="game-phase"]',
      { timeout: 10_000 }
    )
  }

  async close() {
    if (this.context) await this.context.close()
  }
}
