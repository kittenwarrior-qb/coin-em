# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-spam-prevention.spec.ts >> Spam Prevention >> clicking own player card does not open coin popup
- Location: tests\06-spam-prevention.spec.ts:69:7

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid^="player-card-"][data-is-me="true"]')
    - locator resolved to <div tabindex="0" data-is-me="true" data-role="Người Quản trò" data-testid="player-card-Player1" data-player-id="DL_gxuR2yzrIGPf3AAJX" class="rounded-2xl border-[3px] border-blue-500 shadow-xl↵                   flex flex-col items-center justify-center gap-1 cursor-pointer↵                   select-none aspect-[3/4] relative overflow-hidden↵                   ring-4 ring-blue-300">…</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">…</div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">…</div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    5 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">…</div> intercepts pointer events
    - retrying click action
      - waiting 500ms
    14 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <img draggable="false" alt="Người Quản trò - front" src="https://res.cloudinary.com/djuksxdrw/image/upload/v1777469092/emcoin/vai-tro/m%E1%BA%B7t%20sau.png"/> from <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
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
    - generic [ref=e18]: Round 1/7 • role-reveal
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e22]: Quản trò
        - generic [active] [ref=e23] [cursor=pointer]:
          - generic: P
          - generic: Player1
          - generic [ref=e24]: 👤 Mình
      - generic [ref=e26] [cursor=pointer]:
        - generic: P
        - generic: Player2
      - generic [ref=e28] [cursor=pointer]:
        - generic: B
        - generic: Bot Alice
      - generic [ref=e30] [cursor=pointer]:
        - generic: B
        - generic: Bot Bob
      - generic [ref=e32] [cursor=pointer]:
        - generic: B
        - generic: Bot Charlie
      - generic [ref=e34] [cursor=pointer]:
        - generic: B
        - generic: Bot Diana
      - generic [ref=e35]:
        - generic [ref=e37]: Trao gửi
        - generic [ref=e38] [cursor=pointer]:
          - generic: B
          - generic: Bot Eve
    - button "👑 Chia vai trò" [ref=e40]
    - button "🎴" [ref=e41]
  - generic [ref=e43]:
    - generic [ref=e44] [cursor=pointer]:
      - img "Người Quản trò - front" [ref=e46]
      - img "Người Quản trò - back" [ref=e48]
    - generic [ref=e49]:
      - generic [ref=e50]: Nhấn để lật thẻ
      - generic [ref=e51]: 👆 Vuốt xuống để đóng
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
  46  |     expect(phaseFinal).toBe(phaseAfter)
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
> 80  |     await myCard.click()
      |                  ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
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