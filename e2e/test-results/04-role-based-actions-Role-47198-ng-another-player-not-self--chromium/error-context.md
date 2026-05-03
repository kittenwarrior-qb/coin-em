# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-role-based-actions.spec.ts >> Role-based Actions >> coin popup only appears when clicking another player (not self)
- Location: tests\04-role-based-actions.spec.ts:116:7

# Error details

```
TimeoutError: page.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid="player-card-Player2"]')
    - locator resolved to <div tabindex="0" data-is-me="false" data-role="Người Dẫn Lối" data-testid="player-card-Player2" data-player-id="Ge1F2nV6D3EWEPfGAAH2" class="rounded-2xl border-[3px] border-black↵                   flex flex-col items-center justify-center gap-1 cursor-pointer↵                   select-none aspect-[3/4] relative overflow-hidden↵                   ">…</div>
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
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">…</div> intercepts pointer events
  18 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
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
      - generic [ref=e33]:
        - generic [ref=e35]: Trao gửi
        - generic [ref=e36] [cursor=pointer]:
          - generic: B
          - generic: Bot Diana
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
  28  |     test.skip(!narrator, 'No narrator among human players')
  29  | 
  30  |     const nonNarrators = orchestrator.getPlayers().filter(p => p !== narrator)
  31  | 
  32  |     await expect(narrator!.p.locator('[data-testid="btn-next-turn"]')).toBeVisible()
  33  |     for (const p of nonNarrators) {
  34  |       await expect(p.p.locator('[data-testid="btn-next-turn"]')).not.toBeVisible()
  35  |     }
  36  |   })
  37  | 
  38  |   test('sender sees draw-situation button in situation-card phase', async () => {
  39  |     await orchestrator.createPlayers(2)
  40  |     await orchestrator.setupRoom(7)
  41  |     await orchestrator.startGame()
  42  | 
  43  |     const narrator = await orchestrator.findNarrator()
  44  |     test.skip(!narrator, 'No narrator among human players')
  45  | 
  46  |     // role-reveal → night → healer-turn → silencer-turn → situation-card
  47  |     await narrator!.clickNextTurn()
  48  |     await orchestrator.waitForAllPhase('night', 5_000)
  49  |     await narrator!.clickNextTurn()
  50  |     await orchestrator.waitForAllPhase('healer-turn', 5_000)
  51  |     await narrator!.clickNextTurn()
  52  |     await orchestrator.waitForAllPhase('silencer-turn', 5_000)
  53  |     await narrator!.clickNextTurn()
  54  |     await orchestrator.waitForAllPhase('situation-card', 5_000)
  55  | 
  56  |     const sender = await orchestrator.findSender()
  57  |     test.skip(!sender, 'No sender among human players')
  58  | 
  59  |     await expect(sender!.p.locator('[data-testid="btn-draw-situation"]')).toBeVisible()
  60  | 
  61  |     const nonSenders = orchestrator.getPlayers().filter(p => p !== sender)
  62  |     for (const p of nonSenders) {
  63  |       await expect(p.p.locator('[data-testid="btn-draw-situation"]')).not.toBeVisible()
  64  |     }
  65  |   })
  66  | 
  67  |   test('sender sees emotion button in emotion-card phase', async () => {
  68  |     await orchestrator.createPlayers(2)
  69  |     await orchestrator.setupRoom(7)
  70  |     await orchestrator.startGame()
  71  | 
  72  |     const narrator = await orchestrator.findNarrator()
  73  |     test.skip(!narrator, 'No narrator among human players')
  74  | 
  75  |     // Advance to emotion-card phase
  76  |     const phases = ['night', 'healer-turn', 'silencer-turn', 'situation-card', 'emotion-card']
  77  |     for (const phase of phases) {
  78  |       await narrator!.clickNextTurn()
  79  |       await orchestrator.waitForAllPhase(phase, 5_000)
  80  |     }
  81  | 
  82  |     const sender = await orchestrator.findSender()
  83  |     test.skip(!sender, 'No sender among human players')
  84  | 
  85  |     await SocketWaiter.waitForButton(sender!.p, 'btn-select-emotion', 5_000)
  86  |     await expect(sender!.p.locator('[data-testid="btn-select-emotion"]')).toBeVisible()
  87  |   })
  88  | 
  89  |   test('non-sender cannot see sender-only action buttons in situation-card phase', async () => {
  90  |     await orchestrator.createPlayers(2)
  91  |     await orchestrator.setupRoom(7)
  92  |     await orchestrator.startGame()
  93  | 
  94  |     const narrator = await orchestrator.findNarrator()
  95  |     test.skip(!narrator, 'No narrator among human players')
  96  | 
  97  |     await narrator!.clickNextTurn()
  98  |     await orchestrator.waitForAllPhase('night', 5_000)
  99  |     await narrator!.clickNextTurn()
  100 |     await orchestrator.waitForAllPhase('healer-turn', 5_000)
  101 |     await narrator!.clickNextTurn()
  102 |     await orchestrator.waitForAllPhase('silencer-turn', 5_000)
  103 |     await narrator!.clickNextTurn()
  104 |     await orchestrator.waitForAllPhase('situation-card', 5_000)
  105 | 
  106 |     const sender = await orchestrator.findSender()
  107 |     const nonSenders = orchestrator.getPlayers().filter(p => p !== sender && p !== narrator)
  108 | 
  109 |     for (const p of nonSenders) {
  110 |       await expect(p.p.locator('[data-testid="btn-draw-situation"]')).not.toBeVisible()
  111 |       await expect(p.p.locator('[data-testid="btn-select-emotion"]')).not.toBeVisible()
  112 |       await expect(p.p.locator('[data-testid="btn-select-reflection"]')).not.toBeVisible()
  113 |     }
  114 |   })
  115 | 
  116 |   test('coin popup only appears when clicking another player (not self)', async () => {
  117 |     await orchestrator.createPlayers(2)
  118 |     await orchestrator.setupRoom(7)
  119 |     await orchestrator.startGame()
  120 | 
  121 |     const [player1, player2] = orchestrator.getPlayers()
  122 | 
  123 |     // Click own card → role card opens, no coin popup
  124 |     await player1.p.click(`[data-testid="player-card-${player1.name}"][data-is-me="true"]`)
  125 |     await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).not.toBeVisible()
  126 | 
  127 |     // Click another player → coin popup appears
> 128 |     await player1.p.click(`[data-testid="player-card-${player2.name}"]`)
      |                     ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  129 |     await expect(player1.p.locator('[data-testid="coin-btn-yellow"]')).toBeVisible({ timeout: 3_000 })
  130 |   })
  131 | })
  132 | 
```