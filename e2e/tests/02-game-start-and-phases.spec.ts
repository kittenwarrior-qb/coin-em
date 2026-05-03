import { test, expect } from '@playwright/test'
import { GameOrchestrator } from '../helpers/GameOrchestrator'
import { SocketWaiter } from '../helpers/SocketWaiter'

/**
 * Flow 2: Game start and phase transitions
 * Tests: roles assigned, phase progression, narrator controls
 */

test.describe('Game Start & Phase Transitions', () => {
  let orchestrator: GameOrchestrator

  test.beforeEach(async ({ browser }) => {
    orchestrator = new GameOrchestrator(browser)
  })

  test.afterEach(async () => {
    await orchestrator.cleanup()
  })

  test('game starts and all players see role-reveal phase', async () => {
    // Arrange - 2 human players + bots to reach 7
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)

    // Act
    await orchestrator.startGame()

    // Assert - all human players see role-reveal
    await orchestrator.assertAllPhase('role-reveal')
  })

  test('all players receive a role after game starts', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    // Assert - each player has a non-empty role
    for (const player of orchestrator.getPlayers()) {
      const role = await player.getMyRole()
      expect(role).toBeTruthy()
      expect(role).not.toBe('Chưa chia vai trò')
    }
  })

  test('narrator can advance from role-reveal to night phase', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    // Find narrator
    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players in this run')

    // Act
    await narrator!.clickNextTurn()

    // Assert - narrator sees night phase
    await narrator!.waitForPhase('night')
    await narrator!.assertPhase('night')
  })

  test('phase change broadcasts to all players', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    // Act - narrator advances
    await narrator!.clickNextTurn()

    // Assert - all players see night phase
    await orchestrator.waitForAllPhase('night', 10_000)
    await orchestrator.assertAllPhase('night')
  })

  test('player count is correct on game board', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    // Assert - each player sees 7 player cards
    for (const player of orchestrator.getPlayers()) {
      const count = await player.getPlayerCount()
      expect(count).toBeGreaterThanOrEqual(7)
    }
  })
})
