import { test, expect } from '@playwright/test'
import { GameOrchestrator } from '../helpers/GameOrchestrator'

/**
 * Flow 6: Spam prevention (UI level)
 * Tests: rapid clicking doesn't cause duplicate state
 */

test.describe('Spam Prevention', () => {
  let orchestrator: GameOrchestrator

  test.beforeEach(async ({ browser }) => {
    orchestrator = new GameOrchestrator(browser)
  })

  test.afterEach(async () => {
    await orchestrator.cleanup()
  })

  test('rapid clicks on next-turn button do not cause duplicate phase transitions', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    // Record phase before
    const phaseBefore = await narrator!.getCurrentPhase()

    // Act - click next-turn once and record resulting phase
    const btn = narrator!.p.locator('[data-testid="btn-next-turn"]')
    await btn.click()
    await narrator!.p.waitForTimeout(500)
    const phaseAfter = await narrator!.getCurrentPhase()

    // Now spam click 4 more times rapidly
    for (let i = 0; i < 4; i++) {
      await btn.click({ force: true })
    }
    await narrator!.p.waitForTimeout(1_500)

    // Assert - phase should not have advanced beyond the first click's result
    const phaseFinal = await narrator!.getCurrentPhase()
    expect(phaseFinal).toBe(phaseAfter)
    expect(phaseFinal).not.toBe(phaseBefore)
  })

  test('coin popup closes after sending coin (no duplicate popup)', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const [player1, player2] = orchestrator.getPlayers()

    // Act - open coin popup
    await player1.p.click(`[data-testid="player-card-${player2.name}"]`)
    await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).toBeVisible({ timeout: 3_000 })

    // Act - send coin
    await player1.p.click('[data-testid="coin-btn-yellow"]')

    // Assert - popup closes after sending
    await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).not.toBeVisible({ timeout: 3_000 })
  })

  test('clicking own player card does not open coin popup', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const [player1] = orchestrator.getPlayers()

    // Act - click own card multiple times
    const myCard = player1.p.locator('[data-testid^="player-card-"][data-is-me="true"]')
    await myCard.click()
    await myCard.click()
    await myCard.click()

    // Assert - coin popup never appears
    await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).not.toBeVisible()
  })

  test('start game button becomes disabled after clicking', async () => {
    // Arrange
    await orchestrator.createPlayers(1)
    const host = orchestrator.getPlayers()[0]
    await host.goToHome()
    await host.createRoom()

    // Add enough bots
    for (let i = 0; i < 6; i++) {
      await host.addBots()
      await host.p.waitForTimeout(300)
    }

    const startBtn = host.p.locator('[data-testid="btn-start-game"]')
    await expect(startBtn).toBeEnabled({ timeout: 10_000 })

    // Act - click start
    await startBtn.click()

    // Assert - game board appears (button gone), not stuck in waiting room
    await host.waitForGameBoard()
    await expect(host.p.locator('[data-testid="waiting-room"]')).not.toBeVisible()
  })
})
