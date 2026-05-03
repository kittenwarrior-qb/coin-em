# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-lobby-and-room.spec.ts >> Lobby & Waiting Room >> joining non-existent room shows error
- Location: tests\01-lobby-and-room.spec.ts:93:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="lobby"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid="lobby"]')

```

# Test source

```ts
  7   |  * Tests: create room, join room, player list sync, start game
  8   |  */
  9   | 
  10  | test.describe('Lobby & Waiting Room', () => {
  11  |   test('host creates room and sees correct room ID', async ({ browser }) => {
  12  |     // Arrange
  13  |     const host = new PlayerContext('HostPlayer', `uid-host-${Date.now()}`)
  14  |     const ctx = await browser.newContext()
  15  |     await host.initialize(ctx)
  16  | 
  17  |     try {
  18  |       // Act
  19  |       await host.goToHome()
  20  |       const roomId = await host.createRoom()
  21  | 
  22  |       // Assert
  23  |       expect(roomId).toBeTruthy()
  24  |       expect(roomId.length).toBeGreaterThan(3)
  25  |       await host.assertOnWaitingRoom()
  26  |     } finally {
  27  |       await host.close()
  28  |     }
  29  |   })
  30  | 
  31  |   test('guest joins existing room and appears in player list', async ({ browser }) => {
  32  |     // Arrange
  33  |     const host = new PlayerContext('HostA', `uid-ha-${Date.now()}`)
  34  |     const guest = new PlayerContext('GuestA', `uid-ga-${Date.now()}`)
  35  |     const ctxHost = await browser.newContext()
  36  |     const ctxGuest = await browser.newContext()
  37  |     await host.initialize(ctxHost)
  38  |     await guest.initialize(ctxGuest)
  39  | 
  40  |     try {
  41  |       // Act - host creates room
  42  |       await host.goToHome()
  43  |       const roomId = await host.createRoom()
  44  | 
  45  |       // Act - guest joins
  46  |       await guest.goToHome()
  47  |       await guest.joinRoom(roomId)
  48  | 
  49  |       // Assert - guest sees waiting room
  50  |       await guest.assertOnWaitingRoom()
  51  | 
  52  |       // Assert - host sees guest in player list
  53  |       await SocketWaiter.waitForPlayerVisible(host.p, 'GuestA')
  54  |       await expect(host.p.locator('[data-testid="waiting-player-GuestA"]')).toBeVisible()
  55  |     } finally {
  56  |       await host.close()
  57  |       await guest.close()
  58  |     }
  59  |   })
  60  | 
  61  |   test('player count syncs across all clients', async ({ browser }) => {
  62  |     // Arrange
  63  |     const players = await Promise.all(
  64  |       ['Alice', 'Bob', 'Carol'].map(async (name, i) => {
  65  |         const p = new PlayerContext(name, `uid-sync-${Date.now()}-${i}`)
  66  |         await p.initialize(await browser.newContext())
  67  |         return p
  68  |       })
  69  |     )
  70  | 
  71  |     try {
  72  |       // Act - Alice creates room
  73  |       await players[0].goToHome()
  74  |       const roomId = await players[0].createRoom()
  75  | 
  76  |       // Act - Bob and Carol join
  77  |       for (const p of players.slice(1)) {
  78  |         await p.goToHome()
  79  |         await p.joinRoom(roomId)
  80  |       }
  81  | 
  82  |       // Assert - all see 3 players
  83  |       for (const p of players) {
  84  |         await SocketWaiter.waitForPlayerCount(p.p, 3)
  85  |         const count = await p.getWaitingPlayerCount()
  86  |         expect(count).toBe(3)
  87  |       }
  88  |     } finally {
  89  |       await Promise.all(players.map(p => p.close()))
  90  |     }
  91  |   })
  92  | 
  93  |   test('joining non-existent room shows error', async ({ browser }) => {
  94  |     // Arrange
  95  |     const player = new PlayerContext('ErrorUser', `uid-err-${Date.now()}`)
  96  |     await player.initialize(await browser.newContext())
  97  | 
  98  |     try {
  99  |       // Act
  100 |       await player.goToHome()
  101 |       await player.p.click('[data-testid="btn-join-room"]')
  102 |       await player.p.fill('[data-testid="input-room-id"]', 'INVALID999')
  103 |       await player.p.fill('[data-testid="input-username-join"]', 'ErrorUser')
  104 |       await player.p.click('[data-testid="btn-confirm-join"]')
  105 | 
  106 |       // Assert - error shown, still on lobby
> 107 |       await expect(player.p.locator('[data-testid="lobby"]')).toBeVisible({ timeout: 5_000 })
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  108 |     } finally {
  109 |       await player.close()
  110 |     }
  111 |   })
  112 | 
  113 |   test('start game button disabled until 7 players', async ({ browser }) => {
  114 |     // Arrange
  115 |     const host = new PlayerContext('HostB', `uid-hb-${Date.now()}`)
  116 |     await host.initialize(await browser.newContext())
  117 | 
  118 |     try {
  119 |       await host.goToHome()
  120 |       await host.createRoom()
  121 | 
  122 |       // Assert - start button disabled with only 1 player
  123 |       const startBtn = host.p.locator('[data-testid="btn-start-game"]')
  124 |       await expect(startBtn).toBeDisabled()
  125 | 
  126 |       // Add bots until 7
  127 |       for (let i = 0; i < 6; i++) {
  128 |         await host.addBots()
  129 |         await host.p.waitForTimeout(400)
  130 |       }
  131 | 
  132 |       // Assert - start button enabled
  133 |       await expect(startBtn).toBeEnabled({ timeout: 10_000 })
  134 |     } finally {
  135 |       await host.close()
  136 |     }
  137 |   })
  138 | })
  139 | 
```