import { test, expect, onTestFinished } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect as ui } from '../../../e2e/node_modules/@playwright/test/index.mjs'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { ChatReportStore } from '../../src/communication/ChatReportStore'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
test('both-theme chat invitation, real guarded send/block/report and selected admin evidence (owned loopback)', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-chat-browser-'))
  const oldFlag = process.env.EMCOIN_ROOM_CHAT_ENABLED
  const oldThrottle = process.env.DISABLE_RATE_LIMIT
  process.env.EMCOIN_ROOM_CHAT_ENABLED = 'true'
  process.env.DISABLE_RATE_LIMIT = 'false'
  const reports = new ChatReportStore(':memory:')
  const server = await createIsolatedServer({ chatReports: reports })
  const vite = spawn(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '0', '--clearScreen', 'false'],
    { cwd: path.join(root, 'fe'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VITE_API_URL: server.url } })
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  const errors: string[] = [], resolutions: object[] = []
  onTestFinished(async () => {
    vite.kill(); await browser?.close(); await server.close(); reports.close()
    if (oldFlag === undefined) delete process.env.EMCOIN_ROOM_CHAT_ENABLED; else process.env.EMCOIN_ROOM_CHAT_ENABLED = oldFlag
    if (oldThrottle === undefined) delete process.env.DISABLE_RATE_LIMIT; else process.env.DISABLE_RATE_LIMIT = oldThrottle
  })
  const base = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Owned chat Vite startup timeout')), 20000)
    let logs = ''
    const receive = (chunk: Buffer) => {
      logs += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '')
      const match = logs.match(/http:\/\/127\.0\.0\.1:\d+\//)
      if (match) { clearTimeout(timeout); resolve(match[0]) }
    }
    vite.stdout.on('data', receive); vite.stderr.on('data', receive)
    vite.once('error', error => { clearTimeout(timeout); reject(error) })
  })
  browser = await chromium.launch({ headless: true })
  for (const [theme, width] of [['emotion-orbit', 320], ['kindness-workshop', 390]] as const) {
    const contexts = await Promise.all([0, 1].map(() => browser!.newContext({ viewport: { width, height: width === 320 ? 568 : 844 }, reducedMotion: 'reduce' })))
    const pages = await Promise.all(contexts.map(async context => {
      await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}?theme=${theme}`, { waitUntil: 'domcontentloaded' }); return page
    }))
    const [host, guest] = pages
    await host.getByTestId('btn-create-room').click({ timeout: 30000 })
    await host.getByTestId('input-username-create').fill('QA quản trò')
    await host.getByTestId('btn-confirm-create').click()
    await ui(host.getByTestId('waiting-room')).toBeVisible()
    const roomId = (await host.getByTestId('room-id').textContent())!.trim()
    await guest.getByTestId('btn-join-room').click({ timeout: 30000 })
    await guest.getByTestId('input-room-id').fill(roomId)
    await guest.getByTestId('input-username-join').fill('QA khách')
    await guest.getByTestId('btn-confirm-join').click()
    await ui(guest.getByTestId('waiting-room')).toBeVisible()
    await host.getByRole('button', { name: 'Mở chat phòng' }).click()
    await host.getByText('Quản lý chat', { exact: true }).click()
    await host.getByRole('button', { name: 'Mở chat & tạo mã mời' }).click()
    const invitation = await host.getByLabel('Mã mời (gửi riêng cho người chơi)').inputValue()
    expect(invitation).toMatch(/^[A-Za-z0-9_-]{43}$/)
    await guest.getByRole('button', { name: 'Mở chat phòng' }).click()
    await guest.getByLabel('Mã mời từ quản trò').fill(invitation)
    await guest.getByRole('button', { name: 'Tham gia chat', exact: true }).click()
    await ui(guest.getByLabel('Tin nhắn', { exact: true })).toBeEnabled()
    await guest.waitForTimeout(350) // Distinct new command, respect the production 250ms throttle.
    await guest.getByLabel('Tin nhắn', { exact: true }).fill('Tin thử nghiệm <script>không thực thi</script>')
    await guest.getByRole('button', { name: 'Gửi', exact: true }).click()
    await ui(host.getByText('Tin thử nghiệm <script>không thực thi</script>', { exact: true })).toBeVisible()
    await host.getByRole('button', { name: 'Báo cáo', exact: true }).click()
    await host.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click()
    await ui(host.getByText(/Đã gửi báo cáo/)).toBeVisible()
    await host.getByText('Người chơi & an toàn', { exact: true }).click()
    await host.getByRole('button', { name: 'Chặn với tôi', exact: true }).click()
    await ui(host.getByRole('button', { name: 'Bỏ chặn' })).toBeVisible()
    await ui(host.getByText('Tin thử nghiệm <script>không thực thi</script>', { exact: true })).toHaveCount(0)
    await host.waitForTimeout(350)
    await host.getByRole('button', { name: 'Tắt gửi tin', exact: true }).click()
    await ui(guest.getByLabel('Tin nhắn', { exact: true })).toBeDisabled()
    await host.waitForTimeout(350)
    await host.getByRole('button', { name: 'Cho gửi tin', exact: true }).click()
    await ui(guest.getByLabel('Tin nhắn', { exact: true })).toBeEnabled()
    for (const [index, page] of pages.entries()) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: path.join(output, `${theme}-chat-${index}-${width}.png`), fullPage: true })
      const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
      expect(storage).not.toContain(invitation); expect(storage).not.toContain('Tin thử nghiệm')
    }
    await Promise.all(contexts.map(context => context.close()))
  }
  // Admin uses actual selected SQLite evidence but intercepted HTTP, not real auth-cookie proof.
  for (const theme of ['emotion-orbit', 'kindness-workshop']) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { await route.abort(); return }
      if (!url.pathname.startsWith('/admin/api/')) { await route.continue(); return }
      let body: object
      if (url.pathname === '/admin/api/reports') body = reports.list((url.searchParams.get('status') ?? 'open') as 'open')
      else if (url.pathname === '/admin/api/reports/resolve') {
        const command = route.request().postDataJSON(); resolutions.push(command)
        body = reports.resolve(command.id, command.status, command.requestId)
      } else body = { rooms: [], analytics: { version: 'operational-analytics/v1', scope: 'this-process-since-start', persistent: false,
        http: { completed: 0, clientErrors: 0, serverErrors: 0, durationBuckets: [10, 50, 100, 250, 500, 1000, 5000, null].map(upperBoundMs => ({ upperBoundMs, count: 0 })) } } }
      await route.fulfill({ contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify(body) })
    })
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}admin?theme=${theme}`)
    await page.getByRole('button', { name: 'Báo cáo an toàn', exact: true }).click()
    await page.getByRole('button', { name: 'Xem báo cáo', exact: true }).first().click()
    await ui(page.locator('.admin-report-evidence')).toHaveText('Tin thử nghiệm <script>không thực thi</script>')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true)
    await page.screenshot({ path: path.join(output, `${theme}-report-detail.png`), fullPage: true })
    await page.getByRole('button', { name: 'Đánh dấu đã xử lý', exact: true }).click()
    await ui(page.getByRole('dialog')).toHaveCount(0)
    await context.close()
  }
  expect(resolutions).toHaveLength(2); expect(errors).toEqual([])
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ result: 'passed', errors, themes: ['emotion-orbit', 'kindness-workshop'],
    chatTransport: 'real-production-guarded-handlers-loopback', roomStorage: 'test-fixture-not-redis-proof', reportStorage: 'actual-in-memory-sqlite',
    adminHttp: 'intercepted-not-auth-proof', physicalDevice: false, productionModified: false }, null, 2))
  console.log(`Owned chat browser artifacts: ${output}`)
}, 180000)
