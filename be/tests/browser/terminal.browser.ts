import { test, expect, onTestFinished } from 'vitest'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect as expectUI } from '../../../e2e/node_modules/@playwright/test/index.mjs'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { PHASE_ORDER } from '../../src/modules/game/engine/PhaseRegistry'
import catalog from '../../src/constants/webCardBaseline.json'
import { CatalogStore } from '../../src/catalog/CatalogStore'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'
import { configureRuntimeCatalog } from '../../src/catalog/runtimeCatalog'
import { randomUUID } from 'node:crypto'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const terminalCases = [
  { size: 5, scenario: 'zero-gift', pdf: false },
  { size: 5, scenario: 'three-color', pdf: false },
  { size: 10, scenario: 'three-color', pdf: false },
  { size: 5, scenario: 'three-color', pdf: true },
  { size: 10, scenario: 'three-color', pdf: true },
] as const

for (const { size, scenario, pdf } of terminalCases) {
test(`${pdf ? 'PDF' : 'legacy'} ${size} UI guests finish ${size} rounds with ${scenario} and retain exact summary after reload/Back/Escape`, async () => {
  const share = Math.floor(20 / (size - 1))
  const ownedTimeout = size === 5 ? 390000 : 780000
  const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-terminal-browser-qa-'))
  const pdfStore = pdf ? new CatalogStore(':memory:') : undefined
  let catalogVersion: string | undefined
  if (pdfStore) {
    pdfStore.seed(pdfCatalogDraft().map(card => ({ ...card, reviewed: true })))
    catalogVersion = pdfStore.snapshot(1, randomUUID()).version
    pdfStore.activate(catalogVersion, 2, randomUUID()); configureRuntimeCatalog(pdfStore)
  }
  const server = await createIsolatedServer({ catalog: pdfStore })
  // Long release QA must not be invalidated by shared-workspace HMR while implementation continues.
  if (pdf) {
    const build = spawnSync(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), 'build'], {
      cwd: path.join(root, 'fe'), windowsHide: true, timeout: 60000, encoding: 'utf8',
      env: { ...process.env, VITE_API_URL: server.url, NODE_ENV: 'production' },
    })
    if (build.status !== 0) { await server.close(); configureRuntimeCatalog(); pdfStore?.close(); throw new Error(`Owned PDF preview build failed: ${build.stderr?.slice(-1000)}`) }
  }
  const vite = spawn(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), ...(pdf ? ['preview'] : []), '--host', '127.0.0.1', '--port', '0', '--clearScreen', 'false'], {
    cwd: path.join(root, 'fe'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, VITE_API_URL: server.url },
  })
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  let result = 'failed', stage = 'startup', phaseVisits = 0, emotionSelections = 0, completedRounds = 0
  let gifts = 0, receiptPreviews = 0
  const faultEnabled = size === 5 && scenario === 'three-color'
  const makeFault = () => ({ actor: -1, held: false, ackId: '', requestId: '', payload: '', identicalPayloads: true, droppedAcks: 0, droppedProjections: 0, sameRequestEmissions: 0, recovered: 0, noticeTextWidth: 0 })
  const reloadFault = makeFault(), wireFault = makeFault()
  const faults = [reloadFault, wireFault]
  const expectedTotals = Array.from({ length: size }, () => ({ green: 0, yellow: 0, red: 0 }))
  const errors: string[] = []
  const narrators = new Set<number>()
  const senders = new Set<number>()
  const watchdog = setTimeout(() => { errors.push(`Owned${ownedTimeout / 1000}s terminal watchdog expired`); vite.kill(); void browser?.close().catch(() => {}) }, ownedTimeout)
  onTestFinished(async () => { clearTimeout(watchdog); vite.kill(); await browser?.close().catch(() => {}) })
  try {
    const base = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Owned terminal Vite startup timeout')), 25000)
      let logs = ''
      const receive = (chunk: Buffer) => {
        logs += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '')
        const match = logs.match(/http:\/\/127\.0\.0\.1:\d+\//)
        if (match) { clearTimeout(timer); resolve(match[0]) }
      }
      vite.stdout.on('data', receive); vite.stderr.on('data', receive)
      vite.once('error', () => { clearTimeout(timer); reject(new Error('Owned terminal Vite failed')) })
      vite.once('exit', () => { clearTimeout(timer); reject(new Error('Owned terminal Vite exited')) })
    })
    browser = await chromium.launch({ headless: true })
    const seats = []
    for (let i = 0; i < size; i++) {
      const context = await browser.newContext({ viewport: i % 2 ? { width: 390, height: 844 } : { width: 1280, height: 900 }, reducedMotion: 'reduce' })
      await context.tracing.start({ screenshots: false, snapshots: true, sources: false })
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort()
      })
      const page = await context.newPage()
      if (faultEnabled) await page.routeWebSocket('**/socket.io/**', ws => {
        const upstream = ws.connectToServer()
        ws.onMessage(message => {
          if (typeof message === 'string') {
            const frame = /^42(\d+)(\[.*)$/.exec(message)
            if (frame) {
              const [event, payload] = JSON.parse(frame[2])
              if (event === 'give_coin') {
                for (const fault of faults) {
                  if (fault.held && fault.actor === i && !fault.requestId) {
                    fault.ackId = frame[1]; fault.requestId = payload.requestId; fault.payload = JSON.stringify(payload)
                  }
                  if (fault.requestId && payload.requestId === fault.requestId) {
                    fault.sameRequestEmissions++
                    fault.identicalPayloads &&= fault.payload === JSON.stringify(payload)
                  }
                }
              }
            }
          }
          upstream.send(message) // Never alter or fabricate a client command.
        })
        upstream.onMessage(message => {
          for (const fault of faults) if (fault.held && fault.actor === i && typeof message === 'string') {
            if (fault.ackId && message.startsWith(`43${fault.ackId}[`)) { fault.droppedAcks++; return }
            if (message.startsWith('42')) { fault.droppedProjections++; return }
          }
          ws.send(message) // Preserve Engine.IO heartbeat and all other traffic.
        })
      })
      page.on('pageerror', error => errors.push(`seat-${i}:${error.message}`))
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await expectUI(page.getByTestId('btn-create-room')).toBeVisible({ timeout: 30000 })
      seats.push({ page, context, name: `TerminalQA${i + 1}` })
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
    for (const seat of seats) await expectUI(seat.page.getByTestId('player-count')).toHaveText(`${size} / 10`)
    await host.getByTestId('btn-start-game').click()
    const changedStart = host.getByText('Phòng đã thay đổi. Kiểm tra lại số lượt trước khi bắt đầu.', { exact: true })
    await expectUI.poll(async () => await host.getByTestId('game-phase').count() > 0 || await changedStart.count() > 0, { timeout: 15000 }).toBe(true)
    if (await changedStart.count()) {
      // Simulate the host reviewing the fresh confirmed roster/count and explicitly starting again.
      await expectUI(host.getByTestId('player-count')).toHaveText(`${size} / 10`)
      await expectUI(host.getByRole('combobox', { name: 'Số lượt chơi', exact: true })).toHaveValue('auto')
      await host.getByRole('button', { name: 'Đóng thông báo', exact: true }).click()
      await host.getByTestId('btn-start-game').click()
    }
    const emotionId = (pdf ? pdfCatalogDraft() : catalog.cards).find(card => card.category === 'emotion')!.id
    const phases = PHASE_ORDER.filter(phase => size >= 7 || phase !== 'healer-turn') // Approved five-seat deck has no healer.
    for (let round = 1; round <= size; round++) {
      const expectedRound = Array.from({ length: size }, () => ({ green: 0, yellow: 0, red: 0 }))
      stage = `round-${round}-role-reveal`
      const roles: string[] = []
      for (const seat of seats) {
        await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'role-reveal')
        const overlay = seat.page.getByTestId('role-reveal-all-overlay')
        await expectUI(overlay).toBeVisible()
        roles.push((await overlay.getByRole('img').first().getAttribute('alt'))!.replace(/ - front$/, ''))
        await seat.page.getByTestId('btn-close-role-reveal').click()
        await expectUI(overlay).toHaveCount(0)
      }
      expect(roles.filter(role => role === 'Người Quản trò')).toHaveLength(1)
      expect(roles.filter(role => role === 'Người Trao Gửi')).toHaveLength(1)
      const narratorIndex = roles.indexOf('Người Quản trò')
      const senderIndex = roles.indexOf('Người Trao Gửi')
      expect(senderIndex).not.toBe(narratorIndex)
      narrators.add(narratorIndex)
      senders.add(senderIndex)
      const narrator = seats[narratorIndex].page
      for (const phase of phases) {
        stage = `round-${round}-${phase}`
        for (const seat of seats) await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', phase)
        const navigationReadyAt = Date.now() + 850 // Existing client navigation cooldown is800ms.
        phaseVisits++
        if (phase === 'emotion-card') {
          const chooser = seats[roles.indexOf('Người Trao Gửi')].page
          await chooser.getByTestId('btn-select-emotion').click()
          const inventory = chooser.getByRole('dialog', { name: 'Bộ thẻ', exact: true })
          await expectUI(inventory).toBeVisible()
          await inventory.getByRole('button', { name: emotionId, exact: true }).click()
          await chooser.getByTestId('btn-confirm-preview-card').click()
          await expectUI(inventory).toHaveCount(0)
          emotionSelections++
          // A committed emotion selection schedules the existing server-owned
          // transition. Do not issue a second manual NEXT after that deadline.
          for (const seat of seats) await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'story-telling', { timeout: 15000 })
          continue
        }
        if (phase === 'reveal-silencer') {
          for (const seat of seats) {
            await seat.page.getByRole('button', { name: 'Đã xem', exact: true }).click()
            await expectUI(seat.page.getByRole('button', { name: 'Đã xem', exact: true })).toHaveCount(0)
          }
        }
        if (phase === 'give-coins') {
          if (scenario === 'three-color') {
            const giverIndex = narratorIndex
            const yellowTarget = seats.findIndex((_, i) => i !== giverIndex && i !== senderIndex)
            const planned = [
              { actor: senderIndex, target: narratorIndex, color: 'red', label: 'Đỏ', lower: 'đỏ', available: 20 },
              { actor: giverIndex, target: senderIndex, color: 'green', label: 'Xanh', lower: 'xanh', available: share },
              { actor: giverIndex, target: yellowTarget, color: 'yellow', label: 'Vàng', lower: 'vàng', available: share },
            ] as const
            for (const gift of planned) {
              const page = seats[gift.actor].page
              const loseConfirmation = faultEnabled && round === 1 && gift.color !== 'yellow'
              const wireRetry = gift.color === 'green'
              const fault = wireRetry ? wireFault : reloadFault
              if (loseConfirmation) await page.setViewportSize({ width: 390, height: 844 })
              const picker = page.getByRole('dialog', { name: 'Trao Coin', exact: true })
              await expectUI(picker).toBeVisible()
              await picker.getByRole('button', { name: `${gift.label} · ${gift.available}`, exact: true }).click()
              await picker.getByRole('button', { name: seats[gift.target].name, exact: true }).click()
              if (loseConfirmation) { fault.actor = gift.actor; fault.held = true }
              await picker.getByRole('button', { name: `Tặng 1 coin ${gift.lower} cho ${seats[gift.target].name}`, exact: true }).click()
              const success = page.getByRole('dialog', { name: 'Trao Coin thành công', exact: true })
              if (loseConfirmation) {
                const mode = wireRetry ? 'wire-retry' : 'reload'
                stage = `lost-confirmation-${mode}-pending`
                await expectUI(picker).toHaveAttribute('aria-busy', 'true')
                await page.keyboard.press('Escape')
                await expectUI(picker).toBeVisible()
                await expectUI(page.getByText('Chưa xác nhận được lượt trao Coin. Thử lại đúng lượt trao này sẽ không trừ Coin hai lần.', { exact: true })).toBeVisible({ timeout: 8000 })
                await expectUI(success).toHaveCount(0)
                await page.keyboard.press('Escape')
                await expectUI(picker).toHaveCount(0)
                // Role queries stop matching an inert exit before the animated
                // node unmounts. Wait for actual teardown before visual capture.
                await expectUI(page.getByTestId('give-coin-dialog')).toHaveCount(0)
                const checkTransfer = page.getByRole('button', { name: 'Kiểm tra lượt trao', exact: true })
                await expectUI(checkTransfer).toBeEnabled()
                await checkTransfer.scrollIntoViewIfNeeded()
                const notice = page.getByRole('complementary', { name: 'Trạng thái phiên chơi', exact: true })
                await notice.scrollIntoViewIfNeeded()
                const textBox = await notice.locator('div').first().boundingBox()
                expect(textBox).not.toBeNull()
                fault.noticeTextWidth = textBox!.width
                expect(textBox!.width).toBeGreaterThanOrEqual(350)
                for (const button of [checkTransfer, notice.getByRole('button', { name: 'Đóng thông báo', exact: true })]) {
                  const box = await button.boundingBox()
                  expect(box).not.toBeNull()
                  expect(box!.x).toBeGreaterThanOrEqual(0)
                  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
                  expect(box!.y).toBeGreaterThanOrEqual(textBox!.y + textBox!.height - 1)
                }
                await page.screenshot({ path: path.join(output, `lost-confirmation-${mode}-uncertain.png`) })
                const retained = () => page.evaluate(id => JSON.parse(localStorage.getItem('emcoin_session') ?? '{}').pendingCoin?.requestId === id, fault.requestId)
                expect(await retained()).toBe(true)
                expect(fault.droppedAcks).toBe(1)
                expect(fault.droppedProjections).toBeGreaterThan(0)
                if (!wireRetry) {
                  fault.held = false
                  await page.reload({ waitUntil: 'domcontentloaded' })
                  await expectUI(page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'give-coins')
                  await expectUI(picker).toBeVisible()
                  expect(await retained()).toBe(true)
                  await page.keyboard.press('Escape')
                  await expectUI(picker).toHaveCount(0)
                  await expectUI(page.getByTestId('give-coin-dialog')).toHaveCount(0)
                }
                await page.getByRole('button', { name: 'Kiểm tra lượt trao', exact: true }).click()
                await expectUI(page.getByRole('button', { name: 'Kiểm tra lượt trao', exact: true })).toHaveCount(0)
                // The retry button disappears as soon as its pending label is
                // shown, before ACK. Wait for the actual durable journal clear.
                await expectUI.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('emcoin_session') ?? '{}').pendingCoin === undefined)).toBe(true)
                expect(fault.sameRequestEmissions).toBe(wireRetry ? 2 : 1)
                expect(fault.identicalPayloads).toBe(true)
                expect(fault.droppedAcks).toBe(1)
                fault.held = false
                await expectUI(page.getByText('Chưa xác nhận được lượt trao Coin. Thử lại đúng lượt trao này sẽ không trừ Coin hai lần.', { exact: true })).toHaveCount(0)
                fault.recovered++
                await page.screenshot({ path: path.join(output, `lost-confirmation-${mode}-recovered.png`) })
                await page.getByTestId('btn-open-give-coin-picker').click()
                await expectUI(picker).toBeVisible()
              } else {
                await expectUI(success).toBeVisible()
                await expectUI(success.getByText(`cho ${seats[gift.target].name}`, { exact: true })).toBeVisible()
                await success.getByRole('button', { name: 'Tặng tiếp', exact: true }).click()
                await expectUI(success).toHaveCount(0)
              }
              gifts++
              expectedRound[gift.target][gift.color]++
              expectedTotals[gift.target][gift.color]++
              await expectUI(picker.getByRole('button', { name: `${gift.label} · ${gift.available - 1}`, exact: true })).toBeVisible()
              // A committed gift opens the existing recipient's Coin viewer
              // above their picker. Verify and dismiss it through the real UI
              // before that recipient can act; never bypass the modal.
              const recipient = seats[gift.target].page
              const received = recipient.getByRole('dialog', { name: 'Xem Coin', exact: true })
              await expectUI(received).toBeVisible()
              await expectUI(received.getByText(`Bạn đã nhận được 1 coin ${gift.lower}`, { exact: true })).toBeVisible()
              receiptPreviews++
              await received.getByRole('button', { name: 'Đóng xem Coin', exact: true }).click()
              await expectUI(received).toHaveCount(0)
            }
          }
          for (const seat of seats) {
            const picker = seat.page.getByRole('dialog', { name: 'Trao Coin', exact: true })
            await expectUI(picker).toBeVisible()
            await seat.page.keyboard.press('Escape')
            await expectUI(picker).toHaveCount(0)
          }
          if (scenario === 'three-color') {
            await expectUI(narrator.getByTestId('btn-prev-phase')).toBeDisabled()
            if (round === 1) {
              stage = 'round-1-giver-cold-reload'
              await narrator.reload({ waitUntil: 'domcontentloaded' })
              await expectUI(narrator.getByTestId('game-phase')).toHaveAttribute('data-phase', 'give-coins')
              const restoredPicker = narrator.getByRole('dialog', { name: 'Trao Coin', exact: true })
              await expectUI(restoredPicker).toBeVisible()
              await expectUI(restoredPicker.getByRole('button', { name: `Xanh · ${share - 1}`, exact: true })).toBeVisible()
              await expectUI(restoredPicker.getByRole('button', { name: `Vàng · ${share - 1}`, exact: true })).toBeVisible()
              await narrator.keyboard.press('Escape')
              await expectUI(restoredPicker).toHaveCount(0)
              await expectUI(narrator.getByTestId('btn-prev-phase')).toBeDisabled()
              await narrator.screenshot({ path: path.join(output, 'gift-checkpoint-after-reload.png') })
            }
          }
        }
        if (phase === 'reward') {
          for (const [i, seat] of seats.entries()) {
            const reward = seat.page.getByRole('dialog', { name: `Tổng kết lượt ${round}/${size}`, exact: true })
            await expectUI(reward).toBeVisible()
            for (const [key, emoji] of [['green', '💚'], ['yellow', '💛'], ['red', '❤️']] as const) {
              await expectUI(reward.getByText(`${emoji} ${expectedRound[i][key]}`, { exact: true })).toBeVisible()
            }
          }
          await expectUI.poll(() => Date.now(), { timeout: 2500, intervals: [50, 100] }).toBeGreaterThanOrEqual(navigationReadyAt)
          await narrator.getByTestId('btn-next-round').click()
          for (const seat of seats) await expectUI(seat.page.getByTestId('game-phase')).toHaveAttribute('data-phase', round === size ? 'ended' : 'role-reveal')
          completedRounds++
        } else {
          await expectUI.poll(() => Date.now(), { timeout: 2500, intervals: [50, 100] }).toBeGreaterThanOrEqual(navigationReadyAt)
          await expectUI(narrator.getByTestId('btn-next-phase')).toBeEnabled()
          await narrator.getByTestId('btn-next-phase').click()
          await narrator.getByTestId('phase-nav-confirm-popup').getByRole('button', { name: 'Tiếp tục', exact: true }).click()
        }
      }
    }
    const checkEnded = async (page: typeof host) => {
      await expectUI(page.getByTestId('game-phase')).toHaveAttribute('data-phase', 'ended')
      const summary = page.getByRole('dialog', { name: 'Hành trình kết thúc', exact: true })
      await expectUI(summary).toBeVisible()
      for (const [title, emoji, key] of [['Được yêu thương', '💚', 'green'], ['Trao yêu thương', '💛', 'yellow'], ['Lòng tốt vô hạn', '❤️', 'red']] as const) {
        const values = summary.locator(`[title="${title}"]`)
        const themed = await values.first().locator('[data-ui-coin-icon]').count() > 0
        await expectUI(values).toHaveText(expectedTotals.map(total => themed ? String(total[key]) : `${emoji} ${total[key]}`))
        for (let i = 0; i < expectedTotals.length; i++) await expectUI(values.nth(i)).toHaveAttribute('aria-label', `Coin ${key === 'green' ? 'Xanh' : key === 'yellow' ? 'Vàng' : 'Đỏ'}: ${expectedTotals[i][key]}`)
      }
      // The narrator's underlying board may retain disabled controls beneath
      // the terminal panel; other guests have no narrator controls.
      const next = page.getByTestId('btn-next-phase')
      if (await next.count()) {
        await expectUI(next).toHaveCount(1)
        await expectUI(next).toBeDisabled()
        await expectUI(page.getByTestId('btn-prev-phase')).toBeDisabled()
      }
      return summary
    }
    stage = 'terminal-convergence'
    for (const seat of seats) await checkEnded(seat.page)
    expect(phaseVisits).toBe(size * (size === 5 ? 15 : 16)); expect(emotionSelections).toBe(size); expect(completedRounds).toBe(size)
    expect(narrators.size).toBe(size); expect(senders.size).toBe(size)
    expect(gifts).toBe(scenario === 'three-color' ? size * 3 : 0)
    expect(receiptPreviews).toBe(gifts)
    for (const fault of faults) expect(fault.recovered).toBe(faultEnabled ? 1 : 0)
    stage = 'terminal-cold-reload-and-back'
    const mobile = seats[1].page
    const terminalURL = mobile.url()
    await mobile.reload({ waitUntil: 'domcontentloaded' })
    await checkEnded(mobile)
    await mobile.keyboard.press('Escape')
    await checkEnded(mobile)
    await mobile.goBack()
    expect(mobile.url()).toBe(terminalURL)
    const summary = await checkEnded(mobile)
    await summary.getByRole('button', { name: 'Rời phòng', exact: true }).scrollIntoViewIfNeeded()
    await mobile.screenshot({ path: path.join(output, 'ended-mobile-after-reload.png') })
    await host.screenshot({ path: path.join(output, 'ended-desktop.png') })
    stage = 'explicit-terminal-leave'
    await summary.getByRole('button', { name: 'Rời phòng', exact: true }).click()
    await expectUI(mobile.getByTestId('btn-create-room')).toBeVisible()
    await expectUI(mobile.getByTestId('game-phase')).toHaveCount(0)
    for (const seat of seats.filter((_, i) => i !== 1)) await checkEnded(seat.page)
    for (const [i, seat] of seats.entries()) await seat.context.tracing.stop({ path: path.join(output, `seat-${i}-trace.zip`) })
    expect(errors).toEqual([])
    result = 'passed'; stage = 'completed'
  } finally {
    clearTimeout(watchdog)
    if (result !== 'passed' && browser) for (const [i, context] of browser.contexts().entries()) {
      for (const [j, page] of context.pages().entries()) await page.screenshot({ path: path.join(output, `failure-${i}-${j}.png`) }).catch(() => {})
      await context.tracing.stop({ path: path.join(output, `failure-${i}-trace.zip`) }).catch(() => {})
    }
    const browserVersion = browser?.version()
    await browser?.close(); vite.kill(); await server.close(); configureRuntimeCatalog(); pdfStore?.close()
    const summarizeFault = (fault: typeof reloadFault) => ({ droppedAcks: fault.droppedAcks, droppedProjections: fault.droppedProjections, sameRequestEmissions: fault.sameRequestEmissions, identicalPayloads: fault.identicalPayloads, recovered: fault.recovered, noticeTextWidth: fault.noticeTextWidth })
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ version: 'terminal-browser-qa/v5', scenario, result, stage, browser: browserVersion,
      lostConfirmation: { enabled: faultEnabled, reload: summarizeFault(reloadFault), wireRetry: summarizeFault(wireFault) },
      frontend: pdf ? 'production-build-preview' : 'development-server', catalogVersion: catalogVersion ?? catalog.version, realGuestContexts: size, originalNonSenderShare: share, unusedPerGreenYellow: 20 - share * (size - 1), completedRounds, phaseVisits, emotionSelections, gifts, receiptPreviews, receivedTotal: expectedTotals.reduce((sum, total) => sum + total.red + total.green + total.yellow, 0), errors, storage: 'isolated mocked Redis/temp disk',
      rateLimiterDisabled: true, physicalDevice: false, offlineCDN: true,
      limitations: 'Actual UI optional-zero or three-color gifts/round receipts/terminal/reload/Back/leave; five-seat positive includes two closed ACK/projection-loss recoveries: hydrated receipt and actual unchanged same-intent wire retry. Not general packet loss/offline gifting, real Redis durability, device/WebKit, load/SLO or release approval.' }, null, 2))
    console.log(`Terminal browser QA: ${output}`)
  }
}, size === 5 ? 420000 : 810000)
}
