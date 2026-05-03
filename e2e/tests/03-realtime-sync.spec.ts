import { test, expect } from '@playwright/test'
import { GameOrchestrator } from '../helpers/GameOrchestrator'
import { PlayerContext } from '../helpers/PlayerContext'
import { SocketWaiter } from '../helpers/SocketWaiter'

/**
 * Flow 3: Real-time synchronization
 * Tests: one player acts → other players see update immediately
 */

test.describe('Real-time Synchronization', () => {
  let orchestrator: GameOrchestrator

  test.beforeEach(async ({ browser }) => {
    orchestrator = new GameOrchestrator(browser)
  })

  test.afterEach(async () => {
    await orchestrator.cleanup()
  })

  test('narrator advancing phase syncs to all players within 3s', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    const nonNarrators = orchestrator.getPlayers().filter(p => p !== narrator)

    // Act - narrator advances
    await narrator!.clickNextTurn()

    // Assert - all others see night within 3s
    await Promise.all(
      nonNarrators.map(p => p.waitForPhase('night', 3_000))
    )
  })

  test('new player joining waiting room appears for all existing players', async ({ browser }) => {
    // Arrange
    await orchestrator.createPlayers(2)
    const [host, guest1] = orchestrator.getPlayers()

    await host.goToHome()
    const roomId = await host.createRoom()
    await guest1.goToHome()
    await guest1.joinRoom(roomId)

    // Add a 3rd player dynamically
    const lateJoiner = new PlayerContext('LateJoiner', `uid-late-${Date.now()}`)
    await lateJoiner.initialize(await browser.newContext())

    try {
      await lateJoiner.goToHome()
      await lateJoiner.joinRoom(roomId)

      // Assert - host sees LateJoiner appear
      await SocketWaiter.waitForPlayerVisible(host.p, 'LateJoiner', 5_000)
      await expect(host.p.locator('[data-testid="waiting-player-LateJoiner"]')).toBeVisible()

      // Assert - guest1 also sees LateJoiner
      await SocketWaiter.waitForPlayerVisible(guest1.p, 'LateJoiner', 5_000)
    } finally {
      await lateJoiner.close()
    }
  })

  test('coin popup appears when clicking another player card', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const [player1, player2] = orchestrator.getPlayers()

    // Act - player1 clicks player2's card
    await player1.p.click(`[data-testid="player-card-${player2.name}"]`)

    // Assert - coin popup appears
    await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).toBeVisible({ timeout: 3_000 })
  })

  test('phase indicator updates without page reload', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    // Assert initial phase
    await narrator!.assertPhase('role-reveal')

    // Act - advance
    await narrator!.clickNextTurn()

    // Assert - phase changed without reload
    await narrator!.waitForPhase('night', 5_000)
    const phase = await narrator!.getCurrentPhase()
    expect(phase).toBe('night')
  })

  test('all players see same phase after narrator advances', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    // Act
    await narrator!.clickNextTurn()

    // Assert - all players in sync
    await orchestrator.waitForAllPhase('night', 8_000)
    await orchestrator.assertAllPhase('night')
  })
})
