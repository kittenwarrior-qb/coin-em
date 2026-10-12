import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const base = process.argv[2]
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base ?? '')) throw new Error('Owned loopback production preview required')
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/qa/web-startup-optimization')
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' })
    const page = await context.newPage()
    // Public home requires a connection. Simulate only the protocol bootstrap, not gameplay.
    await page.routeWebSocket('**/socket.io/**', socket => {
      socket.onMessage(message => {
        if (typeof message !== 'string') return
        if (message.startsWith('40')) socket.send('40{"sid":"qa-startup-only"}')
        if (message.startsWith('42')) socket.send('42["rooms_list",[]]')
      })
      socket.send('0{"sid":"qa-startup-only","upgrades":[],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}')
    })
    const session = await context.newCDPSession(page)
    await session.send('Network.enable')
    await session.send('Network.clearBrowserCache')
    // Controlled Chromium network simulation, not a real handset/production server.
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150,
      downloadThroughput: 200000, uploadThroughput: 100000 })
    await page.addInitScript(() => {
      window.__startupLcp = 0
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__startupLcp = entry.startTime
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    })
    const transfers = new Map()
    const errors = []
    session.on('Network.responseReceived', event => transfers.set(event.requestId, {
      path: new URL(event.response.url).pathname, host: new URL(event.response.url).hostname,
      status: event.response.status, type: event.type, bytes: 0,
    }))
    session.on('Network.loadingFinished', event => {
      const record = transfers.get(event.requestId)
      if (record) record.bytes = event.encodedDataLength
    })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('btn-join-room').waitFor({ state: 'visible', timeout: 60000 })
    await page.waitForTimeout(2000)
    const state = await page.evaluate(() => ({
      lcpMs: Math.round(window.__startupLcp),
      overflowX: document.documentElement.scrollWidth > innerWidth,
      brokenLocalImages: [...document.images].filter(image => image.src.startsWith(location.origin) &&
        image.complete && !image.naturalWidth).map(image => new URL(image.src).pathname),
    }))
    const records = [...transfers.values()]
    const themeImages = records.filter(record => record.path.startsWith('/cartoon/ui/themes/emotion-orbit/') && record.path.endsWith('.webp'))
    const startupPaths = ['logo-v2.webp', 'backdrop-v3.webp', 'primary-v3.webp', 'secondary-v3.webp']
    const uniqueStartup = startupPaths.map(name => themeImages.find(record => record.path.endsWith('/' + name)))
    const uniqueStartupBytes = uniqueStartup.reduce((sum, record) => sum + (record?.bytes ?? 0), 0)
    const unusedPortraits = records.filter(record => record.path.startsWith('/emcoin/avatars/'))
    const legacyPng = records.filter(record => /^\/cartoon\/ui\/themes\/(emotion-orbit|kindness-workshop)\/.*\.png$/.test(record.path))
    const pass = errors.length === 0 && !state.overflowX && state.brokenLocalImages.length === 0 &&
      uniqueStartup.every(record => record?.status === 200) && uniqueStartupBytes < 500000 &&
      themeImages.every(record => record.status === 200) && themeImages.reduce((sum, record) => sum + record.bytes, 0) < 700000 &&
      unusedPortraits.length === 0 && legacyPng.length === 0
    await page.screenshot({ path: path.join(output, `production-home-${width}.png`), fullPage: true })
    results.push({ width, height, result: pass ? 'passed' : 'failed', ...state, errors,
      totalTransferredBytes: records.reduce((sum, record) => sum + record.bytes, 0),
      uniqueStartupBytes, allThemeTransferredBytes: themeImages.reduce((sum, record) => sum + record.bytes, 0),
      unusedPortraitRequests: unusedPortraits.length, legacyPngRequests: legacyPng.length, transfers: records })
    await context.close()
  }
  const outageContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  const outagePage = await outageContext.newPage()
  await outagePage.routeWebSocket('**/socket.io/**', () => {})
  await outagePage.goto(base)
  await outagePage.getByRole('heading', { name: 'Chưa kết nối được máy chủ' }).waitFor({ timeout: 25000 })
  const outage = await outagePage.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > innerWidth,
    guideLink: [...document.querySelectorAll('a')].find(link => link.textContent === 'Đọc hướng dẫn')?.getAttribute('href'),
  }))
  await outagePage.screenshot({ path: path.join(output, 'production-connection-unavailable.png'), fullPage: true })
  await outagePage.getByRole('button', { name: 'Thử kết nối lại' }).click()
  await outagePage.getByRole('heading', { name: 'Đang kết nối...' }).waitFor()
  results.push({ case: 'initial-backend-unavailable', result: !outage.overflowX && outage.guideLink === '/about/story' ? 'passed' : 'failed', ...outage })
  await outageContext.close()
} finally { await browser.close() }
await writeFile(path.join(output, 'report.json'), JSON.stringify({
  scope: 'loopback production Vite preview; Chromium 150ms latency/1.6Mbps down; cold cache; public home with empty-room Socket.IO bootstrap stub; no production handler/gameplay/backend outage/handset proof',
  results,
}, null, 2))
console.log(JSON.stringify(results.map(({ transfers, ...result }) => result)))
if (results.some(result => result.result !== 'passed')) process.exitCode = 1
