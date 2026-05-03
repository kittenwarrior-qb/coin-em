import { Page } from '@playwright/test'

/**
 * Utilities for waiting on socket-driven UI updates.
 * Uses DOM polling instead of arbitrary timeouts — deterministic.
 */
export class SocketWaiter {
  /**
   * Wait until the game-phase element shows the expected phase.
   * Polls the DOM attribute — no arbitrary sleep.
   */
  static async waitForPhase(page: Page, phase: string, timeout = 15_000) {
    await page.waitForSelector(
      `[data-testid="game-phase"][data-phase="${phase}"]`,
      { timeout }
    )
  }

  /**
   * Wait until a player card with the given name appears in the grid.
   * Works for both waiting room (waiting-player-) and game board (player-card-)
   */
  static async waitForPlayerVisible(page: Page, playerName: string, timeout = 10_000) {
    await page.waitForSelector(
      `[data-testid="waiting-player-${playerName}"], [data-testid="player-card-${playerName}"]`,
      { timeout }
    )
  }

  /**
   * Wait until the waiting room shows at least N players.
   */
  static async waitForPlayerCount(page: Page, minCount: number, timeout = 15_000) {
    await page.waitForFunction(
      (min: number) => {
        const el = document.querySelector('[data-testid="player-count"]')
        if (!el) return false
        const match = el.textContent?.match(/(\d+)/)
        return match ? parseInt(match[1]) >= min : false
      },
      minCount,
      { timeout }
    )
  }

  /**
   * Wait until the game board is visible (game has started).
   */
  static async waitForGameStart(page: Page, timeout = 15_000) {
    await page.waitForSelector('[data-testid="game-phase"]', { timeout })
  }

  /**
   * Wait until a specific button becomes visible (role-gated action).
   */
  static async waitForButton(page: Page, testId: string, timeout = 10_000) {
    await page.waitForSelector(`[data-testid="${testId}"]`, { timeout })
  }

  /**
   * Wait until a button is NOT present (action was consumed / phase changed).
   */
  static async waitForButtonGone(page: Page, testId: string, timeout = 10_000) {
    await page.waitForSelector(`[data-testid="${testId}"]`, {
      state: 'hidden',
      timeout,
    })
  }
}
