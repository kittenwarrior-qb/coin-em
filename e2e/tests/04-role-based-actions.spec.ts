import { test, expect } from '@playwright/test'
import { GameOrchestrator } from '../helpers/GameOrchestrator'
import { SocketWaiter } from '../helpers/SocketWaiter'

/**
 * Flow 4: Role-based behavior
 * Tests: only correct roles see their action buttons
 * Phase names match backend TurnManager exactly.
 */

test.describe('Role-based Actions', () => {
  let orchestrator: GameOrchestrator

  test.beforeEach(async ({ browser }) => {
    orchestrator = new GameOrchestrator(browser)
  })

  test.afterEach(async () => {
    await orchestrator.cleanup()
  })

  test('narrator sees next-turn button, non-narrator does not', async () => {
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    const nonNarrators = orchestrator.getPlayers().filter(p => p !== narrator)

    await expect(narrator!.p.locator('[data-testid="btn-next-turn"]')).toBeVisible()
    for (const p of nonNarrators) {
      await expect(p.p.locator('[data-testid="btn-next-turn"]')).not.toBeVisible()
    }
  })

  test('sender sees draw-situation button in situation-card phase', async () => {
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    // role-reveal → night → healer-turn → silencer-turn → situation-card
    await narrator!.clickNextTurn()
    await orchestrator.waitForAllPhase('night', 5_000)
    await narrator!.clickNextTurn()
    await orchestrator.waitForAllPhase('healer-turn', 5_000)
    await narrator!.clickNextTurn()
    await orchestrator.waitForAllPhase('silencer-turn', 5_000)
    await narrator!.clickNextTurn()
    await orchestrator.waitForAllPhase('situation-card', 5_000)

    const sender = await orchestrator.findSender()
    test.skip(!sender, 'No sender among human players')

    await expect(sender!.p.locator('[data-testid="btn-draw-situation"]')).toBeVisible()

    const nonSenders = orchestrator.getPlayers().filter(p => p !== sender)
    for (const p of nonSenders) {
      await expect(p.p.locator('[data-testid="btn-draw-situation"]')).not.toBeVisible()
    }
  })

  test('sender sees emotion button in emotion-card phase', async () => {
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    // Advance to emotion-card phase
    const phases = ['night', 'healer-turn', 'silencer-turn', 'situation-card', 'emotion-card']
    for (const phase of phases) {
      await narrator!.clickNextTurn()
      await orchestrator.waitForAllPhase(phase, 5_000)
    }

    const sender = await orchestrator.findSender()
    test.skip(!sender, 'No sender among human players')

    await SocketWaiter.waitForButton(sender!.p, 'btn-select-emotion', 5_000)
    await expect(sender!.p.locator('[data-testid="btn-select-emotion"]')).toBeVisible()
  })

  test('non-sender cannot see sender-only action buttons in situation-card phase', async () => {
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const narrator = await orchestrator.findNarrator()
    test.skip(!narrator, 'No narrator among human players')

    await narrator!.clickNextTurn()
    await orchestrator.waitForAllPhase('night', 5_000)
    await narrator!.clickNextTurn()
    await orchestrator.waitForAllPhase('healer-turn', 5_000)
    await narrator!.clickNextTurn()
    await orchestrator.waitForAllPhase('silencer-turn', 5_000)
    await narrator!.clickNextTurn()
    await orchestrator.waitForAllPhase('situation-card', 5_000)

    const sender = await orchestrator.findSender()
    const nonSenders = orchestrator.getPlayers().filter(p => p !== sender && p !== narrator)

    for (const p of nonSenders) {
      await expect(p.p.locator('[data-testid="btn-draw-situation"]')).not.toBeVisible()
      await expect(p.p.locator('[data-testid="btn-select-emotion"]')).not.toBeVisible()
      await expect(p.p.locator('[data-testid="btn-select-reflection"]')).not.toBeVisible()
    }
  })

  test('coin popup only appears when clicking another player (not self)', async () => {
    await orchestrator.createPlayers(2)
    await orchestrator.setupRoom(7)
    await orchestrator.startGame()

    const [player1, player2] = orchestrator.getPlayers()

    // Click own card → role card opens, no coin popup
    await player1.p.click(`[data-testid="player-card-${player1.name}"][data-is-me="true"]`)
    await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).not.toBeVisible()

    // Click another player → coin popup appears
    await player1.p.click(`[data-testid="player-card-${player2.name}"]`)
    await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).toBeVisible({ timeout: 3_000 })
  })
})
