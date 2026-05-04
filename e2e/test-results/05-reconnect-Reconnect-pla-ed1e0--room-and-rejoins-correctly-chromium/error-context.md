# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-reconnect.spec.ts >> Reconnect >> player reloads during waiting room and rejoins correctly
- Location: tests\05-reconnect.spec.ts:21:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid="waiting-room"], [data-testid="game-phase"]') to be visible

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]: 🎴
    - heading "Phòng chờ" [level=2] [ref=e7]
    - generic [ref=e8]:
      - generic [ref=e9]: "Room ID:"
      - generic [ref=e10]: P9W9QB
  - generic [ref=e12]: "Thành viên: 1 / 11"
  - generic [ref=e14]:
    - generic [ref=e15]: P
    - generic [ref=e17]: Player1(Bạn)
    - generic [ref=e18]: HOST
  - generic [ref=e19]:
    - button "Cần 5 người" [disabled] [ref=e20]
    - button "Thêm Bot" [ref=e21]
    - button "Rời phòng" [ref=e22]
```

# Test source

```ts
  112 |     )
  113 |   }
  114 | 
  115 |   async getMyRole(): Promise<string> {
  116 |     // Role is stored in data-role on my own player card
  117 |     const myCard = this.p.locator('[data-testid^="player-card-"][data-is-me="true"]')
  118 |     return (await myCard.getAttribute('data-role')) ?? ''
  119 |   }
  120 | 
  121 |   async isNarrator(): Promise<boolean> {
  122 |     const role = await this.getMyRole()
  123 |     return role === 'Người Quản trò'
  124 |   }
  125 | 
  126 |   async isSender(): Promise<boolean> {
  127 |     const role = await this.getMyRole()
  128 |     return role === 'Người Trao Gửi'
  129 |   }
  130 | 
  131 |   /** Narrator: advance to next phase */
  132 |   async clickNextTurn() {
  133 |     await this.p.click('[data-testid="btn-next-turn"]')
  134 |   }
  135 | 
  136 |   /** NTG: draw situation card */
  137 |   async drawSituationCard() {
  138 |     await this.p.click('[data-testid="btn-draw-situation"]')
  139 |   }
  140 | 
  141 |   /** NTG: open emotion selection and pick first card */
  142 |   async selectEmotionCard() {
  143 |     await this.p.click('[data-testid="btn-select-emotion"]')
  144 |     await this.p.waitForSelector('.grid .aspect-\\[2\\/3\\]', { timeout: 5_000 })
  145 |     await this.p.locator('.grid .aspect-\\[2\\/3\\]').first().click()
  146 |     await this.p.click('button:has-text("Chọn thẻ này")')
  147 |   }
  148 | 
  149 |   /** NTG: open reflection selection and pick first card */
  150 |   async selectReflectionCard() {
  151 |     await this.p.click('[data-testid="btn-select-reflection"]')
  152 |     await this.p.waitForSelector('.grid .aspect-\\[2\\/3\\]', { timeout: 5_000 })
  153 |     await this.p.locator('.grid .aspect-\\[2\\/3\\]').first().click()
  154 |     await this.p.click('button:has-text("Chọn thẻ này")')
  155 |   }
  156 | 
  157 |   /** NTG: open selfcare selection and pick first card */
  158 |   async selectSelfcareCard() {
  159 |     await this.p.click('[data-testid="btn-select-selfcare"]')
  160 |     await this.p.waitForSelector('.grid .aspect-\\[2\\/3\\]', { timeout: 5_000 })
  161 |     await this.p.locator('.grid .aspect-\\[2\\/3\\]').first().click()
  162 |     await this.p.click('button:has-text("Chọn thẻ này")')
  163 |   }
  164 | 
  165 |   /** Give a coin to another player by name */
  166 |   async giveCoin(targetName: string, coinType: 'red' | 'yellow' | 'green') {
  167 |     await this.p.click(`[data-testid="player-card-${targetName}"]`)
  168 |     await this.p.waitForSelector(`[data-testid="coin-btn-${coinType}"]`, { timeout: 3_000 })
  169 |     await this.p.click(`[data-testid="coin-btn-${coinType}"]`)
  170 |   }
  171 | 
  172 |   /** Night action: click a player card (silencer/healer) */
  173 |   async nightActionOn(targetName: string) {
  174 |     await this.p.click(`[data-testid="player-card-${targetName}"]`)
  175 |   }
  176 | 
  177 |   /** Get all visible player names from the grid */
  178 |   async getVisiblePlayerNames(): Promise<string[]> {
  179 |     const cards = this.p.locator('[data-testid^="player-card-"]')
  180 |     const count = await cards.count()
  181 |     const names: string[] = []
  182 |     for (let i = 0; i < count; i++) {
  183 |       const testId = await cards.nth(i).getAttribute('data-testid')
  184 |       if (testId) names.push(testId.replace('player-card-', ''))
  185 |     }
  186 |     return names
  187 |   }
  188 | 
  189 |   async getPlayerCount(): Promise<number> {
  190 |     return await this.p.locator('[data-testid^="player-card-"]').count()
  191 |   }
  192 | 
  193 |   // ── Assertions ───────────────────────────────────────────────────────────────
  194 | 
  195 |   async assertPhase(phase: string) {
  196 |     await expect(this.p.locator('[data-testid="game-phase"]')).toHaveAttribute('data-phase', phase)
  197 |   }
  198 | 
  199 |   async assertOnWaitingRoom() {
  200 |     await expect(this.p.locator('[data-testid="waiting-room"]')).toBeVisible()
  201 |   }
  202 | 
  203 |   async assertOnGameBoard() {
  204 |     await expect(this.p.locator('[data-testid="game-phase"]')).toBeVisible()
  205 |   }
  206 | 
  207 |   // ── Lifecycle ────────────────────────────────────────────────────────────────
  208 | 
  209 |   async reload() {
  210 |     await this.p.reload()
  211 |     // Wait for reconnect — either waiting room or game board
> 212 |     await this.p.waitForSelector(
      |                  ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  213 |       '[data-testid="waiting-room"], [data-testid="game-phase"]',
  214 |       { timeout: 10_000 }
  215 |     )
  216 |   }
  217 | 
  218 |   async close() {
  219 |     if (this.context) await this.context.close()
  220 |   }
  221 | }
  222 | 
```