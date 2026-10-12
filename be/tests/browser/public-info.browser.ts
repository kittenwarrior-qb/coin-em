import { test, expect, onTestFinished } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect as expectUI } from '../../../e2e/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
test('public production page states approved web capacity/support without room or tracker requests', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-public-info-browser-qa-'))
  const vite = spawn(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '0'], {
    cwd: path.join(root, 'fe'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  let result = 'failed', stage = 'startup'
  const errors: string[] = [], viewports: object[] = []
  let privateOrTrackerRequests = 0
  const watchdog = setTimeout(() => { errors.push('Owned public-info110s watchdog expired'); vite.kill(); void browser?.close().catch(() => {}) }, 110000)
  onTestFinished(async () => { clearTimeout(watchdog); vite.kill(); await browser?.close().catch(() => {}) })
  try {
    const base = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Owned public-info startup timeout')), 20000)
      let logs = ''
      const receive = (chunk: Buffer) => {
        logs += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '')
        const match = logs.match(/http:\/\/127\.0\.0\.1:\d+\//)
        if (match) { clearTimeout(timer); resolve(match[0]) }
      }
      vite.stdout.on('data', receive); vite.stderr.on('data', receive)
      vite.once('error', () => { clearTimeout(timer); reject(new Error('Owned public-info preview failed')) })
      vite.once('exit', () => { clearTimeout(timer); reject(new Error('Owned public-info preview exited')) })
    })
    browser = await chromium.launch({ headless: true })
    for (const [width, height] of [[320, 568], [390, 844], [1280, 900]]) {
      stage = `viewport-${width}`
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
      await context.tracing.start({ screenshots: false, snapshots: true, sources: false })
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/admin/api') || /umami|analytics|collect/.test(url.pathname)) privateOrTrackerRequests++
        return url.origin === new URL(base).origin ? route.continue() : route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}about`, { waitUntil: 'domcontentloaded' })
      await expectUI(page.getByText(/Web app cần Internet để chơi; phần offline chỉ hỗ trợ hướng dẫn công khai/)).toBeVisible()
      const facts = page.getByRole('region', { name: 'Thông tin nhanh' })
      await facts.scrollIntoViewIfNeeded()
      await expectUI(facts.getByText('5–10', { exact: true })).toBeVisible()
      await expectUI(facts.getByText('người chơi trên web', { exact: true })).toBeVisible()
      await expectUI(facts.getByText('6–18', { exact: true })).toBeVisible()
      await expectUI(facts.getByText('4-8', { exact: true })).toHaveCount(0)
      await expectUI(page.getByRole('link', { name: /emcoincloud@gmail.com/ })).toHaveAttribute('href', 'mailto:emcoincloud@gmail.com')
      await expectUI(page.getByRole('link', { name: 'Chơi thử app', exact: true })).toHaveAttribute('href', '/game')
      const geometry = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
      expect(geometry.content).toBeLessThanOrEqual(geometry.viewport + 1)
      expect(await page.evaluate(() => localStorage.length)).toBe(0)
      await page.screenshot({ path: path.join(output, `facts-${width}x${height}.png`) })
      // Verify the actual registered guide, not only the separate game popup.
      await page.goto(`${base}about/story/`, { waitUntil: 'domcontentloaded' })
      const rules = page.getByRole('region', { name: 'Luật Coin trên web' })
      await rules.scrollIntoViewIfNeeded()
      await expectUI(rules).toBeVisible()
      for (const phrase of ['20 Coin Đỏ', '20 Coin Xanh', '20 Coin Vàng', 'web-16-coin60/v1', 'không bắt buộc phải sử dụng hết']) {
        await expectUI(rules).toContainText(phrase)
      }
      await expectUI(rules.getByRole('link', { name: 'emcoincloud@gmail.com', exact: true })).toHaveAttribute('href', 'mailto:emcoincloud@gmail.com')
      await expectUI(page.getByText('Offline-first', { exact: true })).toHaveCount(0)
      await expectUI(page.locator('.site-nav-link[aria-current="page"]')).toHaveAttribute('href', '/about/story')
      expect(await page.locator('.tutorial-grid img').evaluateAll(images => images.map(image => image.getAttribute('src'))))
        .toEqual(Array.from({ length: 9 }, (_, i) => `/tutorial/${i + 1}.webp`))
      const guideGeometry = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
      expect(guideGeometry.content).toBeLessThanOrEqual(guideGeometry.viewport + 1)
      await page.screenshot({ path: path.join(output, `guide-${width}x${height}.png`) })
      await page.getByRole('button', { name: 'Mở menu chuyển trang', exact: true }).click()
      const menu = page.getByRole('menu')
      await expectUI(menu).toBeVisible()
      await expectUI(menu.getByRole('menuitem', { name: 'Hướng dẫn', exact: true })).toHaveAttribute('aria-current', 'page')
      await menu.getByRole('menuitem', { name: 'Giới thiệu', exact: true }).click()
      await expectUI(page.getByRole('region', { name: 'Thông tin nhanh' })).toBeAttached()
      expect(await page.evaluate(() => localStorage.length)).toBe(0)
      viewports.push({ width, height, geometry, guideGeometry, guideAndNavigationVerified: true })
      await context.tracing.stop({ path: path.join(output, `trace-${width}.zip`) })
      await context.close()
    }
    expect(privateOrTrackerRequests).toBe(0)
    expect(errors).toEqual([])
    result = 'passed'; stage = 'completed'
  } finally {
    clearTimeout(watchdog)
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ version: 'public-info-browser-qa/v2', result, stage,
      browser: browser?.version(), viewports, privateOrTrackerRequests, errors, backendConnected: false, physicalDevice: false,
      limitations: 'Approved public web facts, Coin guide, current navigation and original tutorial URLs/layout only; not legal/privacy/asset-rights/physical-device acceptance or reskin.' }, null, 2))
    await browser?.close(); vite.kill()
    console.log(`Public-info browser QA: ${output}`)
  }
}, 120000)
