import { test, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect as expectUI } from '../../../e2e/node_modules/@playwright/test/index.mjs'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { roomRepository } from '../../src/modules/room'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

test.each([5, 10])('%i real browser guests create, play, navigate and resume without bots', async count => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-room-browser-qa-'))
  const server = await createIsolatedServer()
  const vite = spawn(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '0', '--clearScreen', 'false'], {
    cwd: path.join(root, 'fe'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, VITE_API_URL: server.url },
  })
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  const records: object[] = []
  const errors: string[] = []
  let countdownDisplay: { before: number; after: number } | undefined
  let browserVersion: string | undefined
  let result = 'failed'
  let stage = 'startup'
  let failureType: string | undefined
  try {
    const base = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Owned Vite startup timed out')), 25_000)
      let logs = ''
      const receive = (chunk: Buffer) => {
        logs += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '')
        const match = logs.match(/http:\/\/127\.0\.0\.1:\d+\//)
        if (match) { clearTimeout(timeout); resolve(match[0]) }
      }
      vite.stdout.on('data', receive); vite.stderr.on('data', receive)
      vite.once('error', error => { clearTimeout(timeout); reject(error) })
      vite.once('exit', code => { clearTimeout(timeout); reject(new Error(`Owned Vite exited ${code}`)) })
    })
    browser = await chromium.launch({ headless: true })
    browserVersion = browser.version()
    const seats = []
    for (let i = 0; i < count; i++) {
      const context = await browser.newContext({ viewport: i % 2 ? { width: 390, height: 844 } : { width: 1280, height: 900 }, reducedMotion: 'reduce' })
      // Preserve DOM/network trace plus explicit screenshots without recording
      // every animated frame in ten independent contexts during artifact export.
      await context.tracing.start({ screenshots: false, snapshots: true, sources: false })
      // No external account/asset requests. Deliberately exercises CDN-unavailable UI.
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(`seat-${i}: ${error.message}`))
      // Exercise both approved materials against real socket handlers, not only QA fixtures.
      await page.goto(`${base}?theme=${count === 5 ? 'emotion-orbit' : 'kindness-workshop'}`, { waitUntil: 'domcontentloaded' })
      await expectUI(page.getByTestId('btn-create-room')).toBeVisible({ timeout: 30_000 })
      seats.push({ context, page, name: `BrowserQA${i + 1}` })
    }
    stage = 'admission'
    const host = seats[0].page
    await host.getByTestId('btn-create-room').click()
    await host.getByTestId('input-username-create').fill(seats[0].name)
    await host.getByTestId('btn-confirm-create').click()
    await expectUI(host.getByTestId('waiting-room')).toBeVisible()
    const roomId = (await host.getByTestId('room-id').textContent())!.trim()
    expect(roomId).toMatch(/^[A-Z0-9]+$/)
    for (const seat of seats.slice(1)) {
      await seat.page.getByTestId('btn-join-room').click()
      await seat.page.getByTestId('input-room-id').fill(roomId)
      await seat.page.getByTestId('input-username-join').fill(seat.name)
      await seat.page.getByTestId('btn-confirm-join').click()
      await expectUI(seat.page.getByTestId('waiting-room')).toBeVisible()
    }
    for (const seat of seats) await expectUI(seat.page.getByTestId('player-count')).toHaveText(`${count} / 10`)
    stage = 'profile-confirmation'
    await host.getByText(seats[0].name, { exact: true }).click()
    seats[0].name += 'Updated'
    await host.getByPlaceholder('Nhập tên').fill(seats[0].name)
    await host.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expectUI(host.getByTestId('cartoon-modal-overlay')).toHaveCount(0)
    for (const seat of seats) await expectUI(seat.page.getByText(seats[0].name, { exact: true })).toBeVisible()
    await host.getByText(seats[0].name, { exact: true }).click()
    await expectUI(host.getByPlaceholder('Nhập tên')).toHaveValue(seats[0].name)
    await host.getByRole('button', { name: 'Đóng', exact: true }).click()
    await expectUI(host.getByTestId('cartoon-modal-overlay')).toHaveCount(0)
    stage = 'start-and-role-reveal'
    const chosenRounds = count === 5 ? 1 : 3
    await host.getByRole('combobox', { name: 'Số lượt chơi', exact: true }).selectOption(String(chosenRounds))
    await host.getByRole('button', { name: 'Lưu số lượt', exact: true }).click()
    await expectUI(host.getByTestId('btn-start-game')).toBeEnabled()
    expect(roomRepository.findAll().find(room => room.players.length === count)?.roundLimit).toBe(chosenRounds)
    await host.getByTestId('btn-start-game').click()
    const roles: string[] = []
    for (const [index, seat] of seats.entries()) {
      await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'role-reveal')
      const overlay = seat.page.getByTestId('role-reveal-all-overlay')
      await expectUI(overlay).toBeVisible()
      await expectUI(seat.page.getByRole('dialog', { name: 'Vai trò của bạn', exact: true })).toBeVisible()
      const alt = await overlay.getByRole('img').first().getAttribute('alt')
      roles.push(alt!.replace(/ - front$/, ''))
      if (index === 0) await seat.page.keyboard.press('Escape')
      else if (index === 1) await seat.page.goBack()
      else await seat.page.getByTestId('btn-close-role-reveal').click()
      await expectUI(overlay).toHaveCount(0)
      await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'role-reveal')
    }
    stage = 'topmost-popup-back-focus'
    const menuButton = host.getByRole('button', { name: 'Menu', exact: true })
    await menuButton.click()
    await host.getByRole('button', { name: 'Hướng dẫn', exact: true }).click()
    await expectUI(host.getByRole('dialog', { name: 'Hướng dẫn', exact: true })).toBeVisible()
    await host.keyboard.press('Escape')
    await expectUI(host.getByRole('dialog', { name: 'Hướng dẫn', exact: true })).toHaveCount(0)
    await expectUI(host.getByRole('dialog', { name: 'Menu', exact: true })).toBeVisible()
    await host.keyboard.press('Escape')
    await expectUI(host.getByRole('dialog', { name: 'Menu', exact: true })).toHaveCount(0)
    await expectUI(menuButton).toBeFocused()
    await menuButton.click()
    await expectUI(host.getByRole('dialog', { name: 'Menu', exact: true })).toBeVisible()
    await host.goBack()
    await expectUI(host.getByRole('dialog', { name: 'Menu', exact: true })).toHaveCount(0)
    await expectUI(host.getByTestId('game-phase')).toHaveAttribute('data-phase', 'role-reveal')
    await expectUI(menuButton).toBeFocused()
    expect(roles.filter(role => role === 'Người Quản trò')).toHaveLength(1)
    stage = 'history-back-focus'
    const historyButton = host.getByRole('button', { name: 'Nhật ký lượt chơi', exact: true })
    await historyButton.click()
    await expectUI(host.getByRole('dialog', { name: 'Nhật ký lượt chơi', exact: true })).toBeVisible()
    await host.keyboard.press('Escape')
    await expectUI(host.getByRole('dialog', { name: 'Nhật ký lượt chơi', exact: true })).toHaveCount(0)
    await expectUI(historyButton).toBeFocused()
    await historyButton.click()
    await expectUI(host.getByRole('dialog', { name: 'Nhật ký lượt chơi', exact: true })).toBeVisible()
    await host.goBack()
    await expectUI(host.getByRole('dialog', { name: 'Nhật ký lượt chơi', exact: true })).toHaveCount(0)
    await expectUI(historyButton).toBeFocused()
    await expectUI(host.getByTestId('game-phase')).toHaveAttribute('data-phase', 'role-reveal')
    stage = 'own-role-preview-lifecycle'
    const ownToken = host.locator('[data-player-token-id]').filter({ has: host.getByText('Bạn', { exact: true }) })
    await ownToken.click()
    const ownPreview = host.getByRole('dialog', { name: 'Xem thẻ vai trò', exact: true })
    await expectUI(ownPreview).toBeVisible()
    await expectUI(ownPreview.getByRole('img', { name: `${roles[0]} - back`, exact: true })).toBeVisible()
    await host.keyboard.press('Escape')
    await expectUI(ownPreview).toHaveCount(0)
    await ownToken.click()
    await expectUI(ownPreview).toBeVisible()
    await ownPreview.getByRole('button', { name: 'Đóng xem thẻ', exact: true }).click()
    await expectUI(ownPreview).toHaveCount(0)
    await expectUI(host.getByTestId('game-phase')).toHaveAttribute('data-phase', 'role-reveal')
    stage = 'mobile-coin-preview-lifecycle'
    const mobile = seats[1].page
    const coinOpener = mobile.getByRole('button', { name: 'Xem Coin Xanh', exact: true })
    const coinDialog = mobile.getByRole('dialog', { name: 'Xem Coin', exact: true })
    await coinOpener.click()
    await expectUI(coinDialog).toBeVisible()
    await coinDialog.getByRole('button', { name: 'Coin tiếp', exact: true }).click()
    await expectUI(coinDialog.getByText('2 / 3', { exact: true })).toBeVisible()
    await mobile.screenshot({ path: path.join(output, 'coin-preview-mobile.png') })
    await mobile.keyboard.press('Escape')
    await expectUI(coinDialog).toHaveCount(0)
    await expectUI(coinOpener).toBeFocused()
    await coinOpener.click()
    await expectUI(coinDialog).toBeVisible()
    await mobile.goBack()
    await expectUI(coinDialog).toHaveCount(0)
    await expectUI(coinOpener).toBeFocused()
    await expectUI(mobile.getByTestId('game-phase')).toHaveAttribute('data-phase', 'role-reveal')
    const narrator = seats[roles.indexOf('Người Quản trò')]
    for (const seat of seats) {
      if (seat === narrator) await expectUI(seat.page.getByTestId('btn-next-phase')).toBeVisible()
      else await expectUI(seat.page.getByTestId('btn-next-phase')).toHaveCount(0)
    }
    stage = 'next-phase'
    await narrator.page.getByTestId('btn-next-phase').click()
    await narrator.page.getByTestId('phase-nav-confirm-popup').getByRole('button', { name: 'Tiếp tục', exact: true }).click()
    for (const seat of seats) await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night')

    stage = 'local-countdown-display'
    const counter = host.getByTestId('turn-countdown-popup')
    await expectUI(counter).toHaveCount(1)
    const before = Number(await counter.textContent())
    expect(before).toBeGreaterThan(0)
    expect(before).toBeLessThanOrEqual(30)
    await expectUI.poll(async () => Number(await counter.textContent()), { timeout: 4000 }).toBeLessThan(before)
    const after = Number(await counter.textContent())
    expect(after).toBeGreaterThanOrEqual(0)
    countdownDisplay = { before, after }
    await expectUI(host.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night')

    stage = 'previous-and-reentry'
    await narrator.page.getByTestId('btn-prev-phase').click()
    await narrator.page.getByTestId('phase-nav-confirm-popup').getByRole('button', { name: 'Quay lại', exact: true }).click()
    for (const seat of seats) {
      await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'role-reveal')
      await seat.page.getByTestId('btn-close-role-reveal').click()
    }
    await narrator.page.getByTestId('btn-next-phase').click()
    await narrator.page.getByTestId('phase-nav-confirm-popup').getByRole('button', { name: 'Tiếp tục', exact: true }).click()
    for (const seat of seats) await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night')

    stage = 'narrator-offline-guards'
    await narrator.context.setOffline(true)
    await expectUI(narrator.page.getByRole('status').filter({ hasText: 'Mất kết nối' })).toBeVisible({ timeout: 15_000 })
    await expectUI(narrator.page.getByTestId('btn-prev-phase')).toBeDisabled()
    await expectUI(narrator.page.getByTestId('btn-next-phase')).toBeDisabled()
    await expectUI(narrator.page.getByTestId('phase-nav-confirm-popup')).toHaveCount(0)
    for (const seat of seats) await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night')
    await narrator.context.setOffline(false)
    await expectUI(narrator.page.getByRole('status').filter({ hasText: 'Mất kết nối' })).toHaveCount(0, { timeout: 30_000 })
    await expectUI(narrator.page.getByTestId('btn-next-phase')).toBeEnabled()

    stage = 'reload-and-offline-recovery'
    const reloader = seats.find(seat => seat !== narrator)!
    await reloader.page.reload({ waitUntil: 'domcontentloaded' })
    await expectUI(reloader.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night', { timeout: 30_000 })
    await reloader.context.setOffline(true)
    await expectUI(reloader.page.getByRole('status').filter({ hasText: 'Mất kết nối' })).toBeVisible({ timeout: 15_000 })
    await expectUI(reloader.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night')
    await reloader.context.setOffline(false)
    await expectUI(reloader.page.getByRole('status').filter({ hasText: 'Mất kết nối' })).toHaveCount(0, { timeout: 30_000 })
    await expectUI(reloader.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night')
    stage = 'tab-replacement'
    const oldTab = reloader.page
    const replacement = await reloader.context.newPage()
    replacement.on('pageerror', error => errors.push(`replacement: ${error.message}`))
    await replacement.goto(base, { waitUntil: 'domcontentloaded' })
    await expectUI(replacement.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night', { timeout: 30_000 })
    await expectUI(oldTab.getByRole('alert')).toHaveText('Phiên chơi đã chuyển sang tab khác. Tab này đã ngắt kết nối.')
    await expectUI(oldTab.getByTestId('game-phase')).toHaveCount(0)
    await expectUI(oldTab.getByTestId('connecting')).toHaveCount(0)
    await oldTab.screenshot({ path: path.join(output, 'replaced-old-tab.png') })
    await oldTab.close()
    reloader.page = replacement
    stage = 'intentional-leave-and-explicit-resume'
    await replacement.getByRole('button', { name: 'Menu', exact: true }).click()
    await replacement.getByRole('button', { name: 'Thoát game', exact: true }).click()
    await replacement.getByRole('button', { name: 'Thoát', exact: true }).click()
    await expectUI(replacement.getByRole('button', { name: 'Tham gia lại', exact: true })).toBeVisible()
    await expectUI(replacement.getByTestId('game-phase')).toHaveCount(0)
    // Observe a fresh lobby connection before manual recovery, not just a transient lobby render.
    await expectUI(replacement.getByRole('status').filter({ hasText: 'Mất kết nối' })).toHaveCount(0)
    await replacement.getByRole('button', { name: 'Tham gia lại', exact: true }).click()
    await expectUI(replacement.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night', { timeout: 30_000 })
    for (let i = 0; i < seats.length; i++) {
      await seats[i].page.screenshot({ path: path.join(output, `seat-${i}-night.png`) })
      await seats[i].context.tracing.stop({ path: path.join(output, `seat-${i}-trace.zip`) })
      records.push({ seat: i, viewport: seats[i].page.viewportSize(), phase: await seats[i].page.getByTestId('game-phase').getAttribute('data-phase') })
    }
    expect(errors).toEqual([])
    result = 'passed'
    stage = 'completed'
  } catch (error) {
    failureType = error instanceof Error ? error.name : 'unknown'
    throw error
  } finally {
    if (result !== 'passed' && browser) {
      for (const [i, context] of browser.contexts().entries()) {
        for (const [j, page] of context.pages().entries()) {
          await page.screenshot({ path: path.join(output, `failure-${i}-${j}.png`) }).catch(() => {})
        }
        await context.tracing.stop({ path: path.join(output, `failure-${i}-trace.zip`) }).catch(() => {})
      }
    }
    await browser?.close()
    vite.kill()
    await server.close()
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ version: 'room-ui-browser-qa/v1', count, result,
      backend: 'production handlers on isolated loopback', storage: 'temp root / mocked Redis', realGuestContexts: count,
      browser: browserVersion, stage, failureType, traceFrameScreenshots: false, explicitScreenshots: true,
      offlineCDN: true, physicalDevice: false, rateLimiterDisabled: true, tabReplacement: result === 'passed', intentionalLeaveResume: result === 'passed', countdownDisplay, records, errors }, null, 2))
    console.log(`Room browser QA (${count}): ${output}`)
  }
})
