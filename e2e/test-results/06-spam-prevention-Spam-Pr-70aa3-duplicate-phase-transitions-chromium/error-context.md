# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-spam-prevention.spec.ts >> Spam Prevention >> rapid clicks on next-turn button do not cause duplicate phase transitions
- Location: tests\06-spam-prevention.spec.ts:20:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "night"
Received: "emotion-card"
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: 💛
      - generic [ref=e8]: "7"
    - generic [ref=e9]:
      - generic [ref=e10]: 💚
      - generic [ref=e11]: "0"
    - generic [ref=e12]:
      - generic [ref=e13]: ❤️
      - generic [ref=e14]: "3"
  - button "←" [ref=e15]
  - generic [ref=e18]: Round 1/7 • emotion-card
  - generic [ref=e19]:
    - generic [ref=e21] [cursor=pointer]:
      - generic: P
      - generic: Player2
      - generic [ref=e22]: 👤 Mình
    - generic [ref=e23]:
      - generic [ref=e25]: Quản trò
      - generic [ref=e26] [cursor=pointer]:
        - generic: P
        - generic: Player1
    - generic [ref=e28] [cursor=pointer]:
      - generic: B
      - generic: Bot Alice
    - generic [ref=e29]:
      - generic [ref=e31]: Trao gửi
      - generic [ref=e32] [cursor=pointer]:
        - generic: B
        - generic: Bot Bob
    - generic [ref=e34] [cursor=pointer]:
      - generic: B
      - generic: Bot Charlie
    - generic [ref=e36] [cursor=pointer]:
      - generic: B
      - generic: Bot Diana
    - generic [ref=e38] [cursor=pointer]:
      - generic: B
      - generic: Bot Eve
  - button "🎴" [ref=e39]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { GameOrchestrator } from '../helpers/GameOrchestrator'
  3   | 
  4   | /**
  5   |  * Flow 6: Spam prevention (UI level)
  6   |  * Tests: rapid clicking doesn't cause duplicate state
  7   |  */
  8   | 
  9   | test.describe('Spam Prevention', () => {
  10  |   let orchestrator: GameOrchestrator
  11  | 
  12  |   test.beforeEach(async ({ browser }) => {
  13  |     orchestrator = new GameOrchestrator(browser)
  14  |   })
  15  | 
  16  |   test.afterEach(async () => {
  17  |     await orchestrator.cleanup()
  18  |   })
  19  | 
  20  |   test('rapid clicks on next-turn button do not cause duplicate phase transitions', async () => {
  21  |     // Arrange
  22  |     await orchestrator.createPlayers(2)
  23  |     await orchestrator.setupRoom(7)
  24  |     await orchestrator.startGame()
  25  | 
  26  |     const narrator = await orchestrator.findNarrator()
  27  |     test.skip(!narrator, 'No narrator among human players')
  28  | 
  29  |     // Record phase before
  30  |     const phaseBefore = await narrator!.getCurrentPhase()
  31  | 
  32  |     // Act - click next-turn once and record resulting phase
  33  |     const btn = narrator!.p.locator('[data-testid="btn-next-turn"]')
  34  |     await btn.click()
  35  |     await narrator!.p.waitForTimeout(500)
  36  |     const phaseAfter = await narrator!.getCurrentPhase()
  37  | 
  38  |     // Now spam click 4 more times rapidly
  39  |     for (let i = 0; i < 4; i++) {
  40  |       await btn.click({ force: true })
  41  |     }
  42  |     await narrator!.p.waitForTimeout(1_500)
  43  | 
  44  |     // Assert - phase should not have advanced beyond the first click's result
  45  |     const phaseFinal = await narrator!.getCurrentPhase()
> 46  |     expect(phaseFinal).toBe(phaseAfter)
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  47  |     expect(phaseFinal).not.toBe(phaseBefore)
  48  |   })
  49  | 
  50  |   test('coin popup closes after sending coin (no duplicate popup)', async () => {
  51  |     // Arrange
  52  |     await orchestrator.createPlayers(2)
  53  |     await orchestrator.setupRoom(7)
  54  |     await orchestrator.startGame()
  55  | 
  56  |     const [player1, player2] = orchestrator.getPlayers()
  57  | 
  58  |     // Act - open coin popup
  59  |     await player1.p.click(`[data-testid="player-card-${player2.name}"]`)
  60  |     await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).toBeVisible({ timeout: 3_000 })
  61  | 
  62  |     // Act - send coin
  63  |     await player1.p.click('[data-testid="coin-btn-yellow"]')
  64  | 
  65  |     // Assert - popup closes after sending
  66  |     await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).not.toBeVisible({ timeout: 3_000 })
  67  |   })
  68  | 
  69  |   test('clicking own player card does not open coin popup', async () => {
  70  |     // Arrange
  71  |     await orchestrator.createPlayers(2)
  72  |     await orchestrator.setupRoom(7)
  73  |     await orchestrator.startGame()
  74  | 
  75  |     const [player1] = orchestrator.getPlayers()
  76  | 
  77  |     // Act - click own card multiple times
  78  |     const myCard = player1.p.locator('[data-testid^="player-card-"][data-is-me="true"]')
  79  |     await myCard.click()
  80  |     await myCard.click()
  81  |     await myCard.click()
  82  | 
  83  |     // Assert - coin popup never appears
  84  |     await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).not.toBeVisible()
  85  |   })
  86  | 
  87  |   test('start game button becomes disabled after clicking', async () => {
  88  |     // Arrange
  89  |     await orchestrator.createPlayers(1)
  90  |     const host = orchestrator.getPlayers()[0]
  91  |     await host.goToHome()
  92  |     await host.createRoom()
  93  | 
  94  |     // Add enough bots
  95  |     for (let i = 0; i < 6; i++) {
  96  |       await host.addBots()
  97  |       await host.p.waitForTimeout(300)
  98  |     }
  99  | 
  100 |     const startBtn = host.p.locator('[data-testid="btn-start-game"]')
  101 |     await expect(startBtn).toBeEnabled({ timeout: 10_000 })
  102 | 
  103 |     // Act - click start
  104 |     await startBtn.click()
  105 | 
  106 |     // Assert - game board appears (button gone), not stuck in waiting room
  107 |     await host.waitForGameBoard()
  108 |     await expect(host.p.locator('[data-testid="waiting-room"]')).not.toBeVisible()
  109 |   })
  110 | })
  111 | 
```