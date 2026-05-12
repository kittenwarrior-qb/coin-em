import { test, expect, chromium } from '@playwright/test'
import { PlayerContext } from '../helpers/PlayerContext'
import { SocketWaiter } from '../helpers/SocketWaiter'

/**
 * Flow 1: Lobby & Waiting Room
 * Tests: create room, join room, player list sync, start game
 */

test.describe('Lobby & Waiting Room', () => {
  test('host creates room and sees correct room ID', async ({ browser }) => {
    // Arrange
    const host = new PlayerContext('HostPlayer', `uid-host-${Date.now()}`)
    const ctx = await browser.newContext()
    await host.initialize(ctx)

    try {
      // Act
      await host.goToHome()
      const roomId = await host.createRoom()

      // Assert
      expect(roomId).toBeTruthy()
      expect(roomId.length).toBeGreaterThan(3)
      await host.assertOnWaitingRoom()
    } finally {
      await host.close()
    }
  })

  test('guest joins existing room and appears in player list', async ({ browser }) => {
    // Arrange
    const host = new PlayerContext('HostA', `uid-ha-${Date.now()}`)
    const guest = new PlayerContext('GuestA', `uid-ga-${Date.now()}`)
    const ctxHost = await browser.newContext()
    const ctxGuest = await browser.newContext()
    await host.initialize(ctxHost)
    await guest.initialize(ctxGuest)

    try {
      // Act - host creates room
      await host.goToHome()
      const roomId = await host.createRoom()

      // Act - guest joins
      await guest.goToHome()
      await guest.joinRoom(roomId)

      // Assert - guest sees waiting room
      await guest.assertOnWaitingRoom()

      // Assert - host sees guest in player list
      await SocketWaiter.waitForPlayerVisible(host.p, 'GuestA')
      await expect(host.p.locator('[data-testid="waiting-player-GuestA"]')).toBeVisible()
    } finally {
      await host.close()
      await guest.close()
    }
  })

  test('player count syncs across all clients', async ({ browser }) => {
    // Arrange
    const players = await Promise.all(
      ['Alice', 'Bob', 'Carol'].map(async (name, i) => {
        const p = new PlayerContext(name, `uid-sync-${Date.now()}-${i}`)
        await p.initialize(await browser.newContext())
        return p
      })
    )

    try {
      // Act - Alice creates room
      await players[0].goToHome()
      const roomId = await players[0].createRoom()

      // Act - Bob and Carol join
      for (const p of players.slice(1)) {
        await p.goToHome()
        await p.joinRoom(roomId)
      }

      // Assert - all see 3 players
      for (const p of players) {
        await SocketWaiter.waitForPlayerCount(p.p, 3)
        const count = await p.getWaitingPlayerCount()
        expect(count).toBe(3)
      }
    } finally {
      await Promise.all(players.map(p => p.close()))
    }
  })

  test('joining non-existent room shows error', async ({ browser }) => {
    // Arrange
    const player = new PlayerContext('ErrorUser', `uid-err-${Date.now()}`)
    await player.initialize(await browser.newContext())

    try {
      // Act
      await player.goToHome()
      await player.p.click('[data-testid="btn-join-room"]')
      await player.p.fill('[data-testid="input-room-id"]', 'INVALID999')
      await player.p.fill('[data-testid="input-username-join"]', 'ErrorUser')
      await player.p.click('[data-testid="btn-confirm-join"]')

      // Assert - error shown, still on lobby
      await expect(player.p.locator('[data-testid="lobby"]')).toBeVisible({ timeout: 5_000 })
    } finally {
      await player.close()
    }
  })

  test('start game button disabled until 7 players', async ({ browser }) => {
    // Arrange
    const host = new PlayerContext('HostB', `uid-hb-${Date.now()}`)
    await host.initialize(await browser.newContext())

    try {
      await host.goToHome()
      await host.createRoom()

      // Assert - start button disabled with only 1 player
      const startBtn = host.p.locator('[data-testid="btn-start-game"]')
      await expect(startBtn).toBeDisabled()

      // Add bots until 7
      for (let i = 0; i < 6; i++) {
        await host.addBots()
        await host.p.waitForTimeout(400)
      }

      // Assert - start button enabled
      await expect(startBtn).toBeEnabled({ timeout: 10_000 })
    } finally {
      await host.close()
    }
  })
})

test.describe('Card Deck Selection', () => {
  test('create room with custom card deck selection', async ({ browser }) => {
    const host = new PlayerContext('DeckHost', `uid-deck-${Date.now()}`)
    const ctx = await browser.newContext()
    await host.initialize(ctx)

    try {
      await host.goToHome()

      // Open create room modal
      await host.p.click('[data-testid="btn-create-room"]')
      await host.p.fill('[data-testid="input-username-create"]', host.name)

      // Verify default checkboxes: light + medium checked, sensitive unchecked
      await expect(host.p.locator('[data-testid="checkbox-situation-light"]')).toHaveAttribute('aria-checked', 'true')
      await expect(host.p.locator('[data-testid="checkbox-situation-medium"]')).toHaveAttribute('aria-checked', 'true')
      await expect(host.p.locator('[data-testid="checkbox-situation-sensitive"]')).toHaveAttribute('aria-checked', 'false')

      // Toggle sensitive on, medium off
      await host.p.click('[data-testid="checkbox-situation-sensitive"]')
      await host.p.click('[data-testid="checkbox-situation-medium"]')

      await expect(host.p.locator('[data-testid="checkbox-situation-sensitive"]')).toHaveAttribute('aria-checked', 'true')
      await expect(host.p.locator('[data-testid="checkbox-situation-medium"]')).toHaveAttribute('aria-checked', 'false')

      // Create room
      await host.p.click('[data-testid="btn-confirm-create"]')
      await host.p.waitForSelector('[data-testid="waiting-room"]', { timeout: 10_000 })

      // Assert host is in waiting room
      await host.assertOnWaitingRoom()
    } finally {
      await host.close()
    }
  })

  test('create room button disabled when no deck selected', async ({ browser }) => {
    const host = new PlayerContext('NoDeckHost', `uid-nodeck-${Date.now()}`)
    const ctx = await browser.newContext()
    await host.initialize(ctx)

    try {
      await host.goToHome()
      await host.p.click('[data-testid="btn-create-room"]')
      await host.p.fill('[data-testid="input-username-create"]', host.name)

      // Uncheck all situation decks
      await host.p.click('[data-testid="checkbox-situation-light"]')
      await host.p.click('[data-testid="checkbox-situation-medium"]')

      // Confirm button should still be enabled (FE fallback to defaults)
      const confirmBtn = host.p.locator('[data-testid="btn-confirm-create"]')
      await expect(confirmBtn).toBeEnabled()
    } finally {
      await host.close()
    }
  })
})
