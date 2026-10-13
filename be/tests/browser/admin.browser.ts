import { test, expect, onTestFinished } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect as expectUI } from '../../../e2e/node_modules/@playwright/test/index.mjs'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

test('production admin UI: bounded mobile layout, confirmation, pending Back/Escape and same-ID retry (synthetic HTTP)', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-admin-browser-qa-'))
  const vite = spawn(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), 'preview',
    '--host', '127.0.0.1', '--port', '0'], { cwd: path.join(root, 'fe'), windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'] })
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  let result = 'failed', stage = 'startup'
  const errors: string[] = []
  const closeCommands: object[] = []
  const watchdog = setTimeout(() => {
    errors.push('Owned admin110s watchdog expired'); vite.kill(); void browser?.close().catch(() => {})
  }, 110_000)
  onTestFinished(async () => { clearTimeout(watchdog); vite.kill(); await browser?.close().catch(() => {}) })
  try {
    const base = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Owned admin preview startup timeout')), 20_000)
      let logs = ''
      const receive = (chunk: Buffer) => {
        logs += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '')
        const match = logs.match(/http:\/\/127\.0\.0\.1:\d+\//)
        if (match) { clearTimeout(timeout); resolve(match[0]) }
      }
      vite.stdout.on('data', receive); vite.stderr.on('data', receive)
      vite.once('error', error => { clearTimeout(timeout); reject(error) })
      vite.once('exit', code => { clearTimeout(timeout); reject(new Error(`Owned preview exited ${code}`)) })
    })
    browser = await chromium.launch({ headless: true })
    for (const width of [320, 390, 1280]) {
      stage = `viewport-${width}`
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
      let authenticated = false, closed = false
      let releaseClose!: () => void
      let closeAttempt = 0
      await context.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (url.origin !== new URL(base).origin) { await route.abort(); return }
        if (!url.pathname.startsWith('/admin/api/')) { await route.continue(); return }
        expect(route.request().headers()['x-emcoin-admin']).toBe('1')
        const reply = (status: number, body: object) => route.fulfill({ status, contentType: 'application/json',
          headers: { 'cache-control': 'no-store' }, body: JSON.stringify(body) })
        if (url.pathname.endsWith('/login')) { authenticated = true; await reply(200, { success: true }); return }
        if (!authenticated) { await reply(401, { error: 'ADMIN_AUTH_REQUIRED' }); return }
        if (url.pathname === '/admin/api/catalog') { await reply(200, { revision: 1, cards: pdfCatalogDraft(), active: false }); return }
        if (url.pathname === '/admin/api/catalog/readiness') { await reply(200, { revision: 1, ready: false, snapshots: [] }); return }
        if (url.pathname.endsWith('/logout')) { authenticated = false; await reply(200, { success: true }); return }
        if (url.pathname.endsWith('/close-room')) {
          closeCommands.push(route.request().postDataJSON())
          if (++closeAttempt === 1) {
            await new Promise<void>(resolve => { releaseClose = resolve })
            await reply(503, { error: 'ADMIN_UNAVAILABLE' }); return
          }
          closed = true
          await reply(200, { success: true, replayed: true }); return
        }
        await reply(200, { rooms: closed ? [] : [{ id: 'synthetic-browser-room', status: 'playing', seats: 5, revision: 3,
          privateStory: 'must-not-render' }], analytics: { version: 'operational-analytics/v1',
          scope: 'this-process-since-start', persistent: false, http: { completed: 17, clientErrors: 2, serverErrors: 1,
            durationBuckets: [10, 50, 100, 250, 500, 1000, 5000, null].map((upperBoundMs, index) => ({ upperBoundMs, count: index ? 0 : 17 })) } } })
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}admin`, { waitUntil: 'domcontentloaded' })
      await expectUI(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible()
      await page.getByLabel('Email', { exact: true }).fill('synthetic@example.invalid')
      await page.getByLabel('Mật khẩu EmCoin', { exact: true }).fill('synthetic-browser-password')
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
      await expectUI(page.getByText('Phòng synthetic-browser-room', { exact: true })).toBeVisible()
      await expectUI(page.getByText('must-not-render', { exact: true })).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const box = await page.locator('main > div').boundingBox()
      expect(box!.width).toBeLessThanOrEqual(width)
      if (width === 1280) {
        expect(box!.width).toBeGreaterThan(800)
        const sidebar = await page.locator('.admin-sidebar').boundingBox()
        expect(sidebar!.x + sidebar!.width).toBeLessThan(box!.x)
      }
      // A screenshot taken before hidden sizing images/background materials load
      // can falsely show text without its button material. Decode real assets.
      const assetsReady = await page.evaluate(async () => {
        await document.fonts.ready
        const images = Array.from(document.querySelectorAll<HTMLImageElement>('button img'))
        await Promise.all(images.map(image => image.decode()))
        return images.length > 0 && images.every(image => image.naturalWidth > 0)
      })
      expect(assetsReady).toBe(true)
      const logoutMaterial = await page.getByRole('button', { name: 'Đăng xuất', exact: true }).evaluate(button => {
        const surface = button.querySelector<HTMLElement>('[data-cartoon-surface="pill"]')!
        return { width: surface.getBoundingClientRect().width, image: getComputedStyle(surface, '::before').backgroundImage }
      })
      expect(logoutMaterial.width).toBeGreaterThanOrEqual(44)
      expect(logoutMaterial.image).toContain('quiet-v3.webp')
      await page.screenshot({ path: path.join(output, `overview-${width}.png`), fullPage: true })
      for (const [label, key] of [['Analytics', 'analytics'], ['Dữ liệu', 'database'], ['Tài khoản', 'account']] as const) {
        await page.getByRole('button', { name: label, exact: true }).click()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        await page.screenshot({ path: path.join(output, `${key}-${width}.png`), fullPage: true })
      }
      await page.getByRole('button', { name: 'Tổng quan & phòng', exact: true }).click()
      await page.getByRole('button', { name: 'Bộ thẻ', exact: true }).click()
      await expectUI(page.getByLabel('Tìm thẻ', { exact: true })).toBeVisible()
      await expectUI(page.getByRole('button', { name: 'Đăng xuất', exact: true })).toBeEnabled()
      await page.screenshot({ path: path.join(output, `catalog-${width}.png`), fullPage: true })
      await page.getByLabel('Danh sách thẻ', { exact: true }).getByRole('button').first().click()
      await expectUI(page.getByLabel('Mã thẻ', { exact: true })).toBeVisible()
      await expectUI(page.getByRole('button', { name: 'Analytics', exact: true })).toBeDisabled()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.screenshot({ path: path.join(output, `card-editor-${width}.png`), fullPage: true })
      await page.getByRole('button', { name: 'Về danh sách', exact: true }).click()
      await page.getByRole('button', { name: 'Đóng quản lý thẻ', exact: true }).click()
      const open = page.getByRole('button', { name: 'Đóng phòng synthetic-browser-room', exact: true })
      await open.click()
      await expectUI(page.getByRole('dialog', { name: 'Đóng phòng?', exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await expectUI(page.getByRole('dialog')).toHaveCount(0)
      await expectUI(open).toBeFocused()
      await open.click()
      await page.getByRole('button', { name: 'Xác nhận đóng', exact: true }).click()
      await expectUI(page.getByRole('button', { name: 'Hủy', exact: true })).toBeDisabled()
      await page.keyboard.press('Escape')
      await page.goBack()
      await expectUI(page.getByRole('dialog')).toBeVisible()
      expect(new URL(page.url()).pathname).toBe('/admin')
      expect(closeAttempt).toBe(1)
      releaseClose()
      await expectUI(page.getByRole('alert')).toContainText('chưa được cấu hình')
      await expectUI(page.getByLabel('Lý do đóng phòng')).toBeDisabled()
      await page.getByRole('button', { name: 'Xác nhận đóng', exact: true }).click()
      await expectUI(page.getByText('Không có phòng đang được lưu.', { exact: true })).toBeVisible()
      expect(closeCommands.at(-1)).toEqual(closeCommands.at(-2))
      await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
      await expectUI(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible()
      expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 })
      await context.close()
    }
    expect(errors).toEqual([])
    result = 'passed'; stage = 'complete'
  } finally {
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ version: 'admin-browser-qa/v1', result, stage,
      browser: browser?.version(), viewports: [320, 390, 1280], errors, closeRequests: closeCommands.length,
      physicalDevice: false, backendConnected: false, authCookieProof: false,
      limitations: 'Production preview with intercepted synthetic HTTP only; real auth/CSRF/cookie and Redis restart evidence are separate fixtures.' }, null, 2))
    clearTimeout(watchdog); vite.kill(); await browser?.close()
    console.log(`R36 owned admin browser artifacts: ${output}`)
  }
}, 120_000)
