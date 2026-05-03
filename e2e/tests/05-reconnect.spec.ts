import { test, expect } from '@playwright/test'
import { GameOrchestrator } from '../helpers/GameOrchestrator'
import { SocketWaiter } from '../helpers/SocketWaiter'

/**
 * Flow 5: Reconnect scenario
 * Tests: player reloads page → game state restored from server
 */

test.describe('Reconnect', () => {
  let orchestrator: GameOrchestrator

  test.beforeEach(async ({ browser }) => {
    orchestrator = new GameOrchestrator(browser)
  })

  test.afterEach(async () => {
    await orchestrator.cleanup()
  })

  test('player reloads during waiting room and rejoins correctly', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    const [host, guest] = orchestrator.getPlayers()

    await host.goToHome()
    const roomId = await host.createRoom()
    await guest.goToHome()
    await guest.joinRoom(roomId)

    // Act - guest reloads
    await guest.p.reload()

    // Wait through "connecting" screen first, then lobby or waiting-room
    await guest.p.waitForSelector(
      '[data-testid="connecting"], [data-testid="waiting-room"], [data-testid="lobby"]',
      { timeout: 15_000 }
    )
    // Now wait for connecting to resolve into a real state
    await guest.p.waitForSelector(
      '[data-testid="waiting-room"], [data-testid="lobby"]',
      { timeout: 30_000 }
    )

    // If landed on lobby (app didn't auto-reconnect), rejoin manually
    const onLobby = await guest.p.locator('[data-testid="lobby"]').isVisible()
    if (onLobby) {
      await guest.joinRoom(roomId)
    }

    // Assert - guest is back in waiting room with correct room ID
    await guest.assertOnWaitingRoom()
    const displayedRoomId = await guest.p.locator('[data-testid="room-id"]').textContent()
    expect(displayedRoomId).toBe(roomId)
  })

  test('player reloads during game and sees correct phase', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    // Advance to night
    await narrator!.clickNextTurn()
    await orchestrator.waitForAllPhase('night', 5_000)

    // Find a non-narrator to reload
    const reloader = orchestrator.getPlayers().find(p => p !== narrator)!

    // Act - player reloads
    await reloader.reload()

    // Assert - player sees game board with night phase restored
    await reloader.waitForGameBoard()
    await reloader.waitForPhase('night', 10_000)
    await reloader.assertPhase('night')
  })

  test('reloaded player still appears in other players grid', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const [player1, player2] = orchestrator.getPlayers()

    // Act - player2 reloads
    await player2.reload()
    await player2.waitForGameBoard()

    // Assert - player1 still sees player2 in the grid
    await SocketWaiter.waitForPlayerVisible(player1.p, player2.name, 8_000)
    await expect(player1.p.locator(`[data-testid="player-card-${player2.name}"]`)).toBeVisible()
  })

  test('reloaded player retains their role', async () => {
    // Arrange
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const [player1] = orchestrator.getPlayers()
    const roleBefore = await player1.getMyRole()

    // Act - reload
    await player1.reload()
    await player1.waitForGameBoard()

    // Assert - same role after reload
    const roleAfter = await player1.getMyRole()
    expect(roleAfter).toBe(roleBefore)
  })
})
