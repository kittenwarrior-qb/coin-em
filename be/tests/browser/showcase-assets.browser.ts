import { test, expect, onTestFinished } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect as expectUI } from '../../../e2e/node_modules/@playwright/test/index.mjs'
import { startPublicCatalogFixture } from '../helpers/publicCatalogFixture'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
// Linux hosted CI uses software graphics; this is a functional lifecycle gate,
// not a device FPS/latency benchmark. Keep all 100+20 switches and restore checks.
const assetsTimeoutMs = process.platform === 'linux' ? 290_000 : 170_000

test.each(['models', 'stickers'] as const)('original showcase assets: %s', async scenario => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-showcase-browser-qa-'))
  const catalogApi = await startPublicCatalogFixture()
  const vite = spawn(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '0', '--clearScreen', 'false'], {
    cwd: path.join(root, 'fe'), env: catalogApi.env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  let stage = 'startup', result = 'failed', completedSwitches = 0, renderer: string | undefined
  const requests = new Map<string, number>(), errors: string[] = []
  let reportWritten = false
  const report = async () => {
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ version: 'showcase-assets-qa/v2', scenario, stage, result,
      completedSwitches, browserChannel: 'chromium-new-headless', inputMode: 'pointer', renderer, browser: browser?.version(), assetRequests: Object.fromEntries(requests), errors,
      backendConnected: false, catalogApiConnected: true, reducedMotion: true, physicalDevice: false, limitations: 'Actual reported desktop renderer, simulated viewport; not mobile device, FPS or memory-budget acceptance' }, null, 2))
    reportWritten = true
  }
  const watchdog = setTimeout(() => { errors.push(`Owned${assetsTimeoutMs / 1000}s watchdog expired`); void browser?.close().catch(() => {}); vite.kill() }, assetsTimeoutMs)
  onTestFinished(async () => { clearTimeout(watchdog); if (!reportWritten) await report(); vite.kill(); await browser?.close(); await catalogApi.close() })
  try {
    const base = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Owned Vite startup timeout')), 20_000)
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
    browser = await chromium.launch({ headless: true, channel: 'chromium' })
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    await context.tracing.start({ screenshots: false, snapshots: true, sources: false })
    await context.route('**/*', route => [new URL(base).origin, new URL(catalogApi.url).origin].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort())
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      const pathname = new URL(request.url()).pathname
      if (pathname.endsWith('.glb') || pathname.startsWith('/stickers/')) requests.set(pathname, (requests.get(pathname) ?? 0) + 1)
    })
    await page.goto(`${base}cards`, { waitUntil: 'domcontentloaded' })
    await expectUI(page.getByTestId('card-showcase-canvas')).toBeVisible({ timeout: 20_000 })
    const ready = async () => {
      await expectUI(page.getByText('Đang tải thẻ...', { exact: true })).toHaveCount(0, { timeout: 20_000 })
      await expectUI(page.getByRole('region', { name: 'Bản xem thay thế' })).toHaveCount(0)
    }
    await ready()
    renderer = await page.evaluate(() => {
      const gl = document.querySelector<HTMLCanvasElement>('[data-testid="card-showcase-canvas"]')!.getContext('webgl2')!
      if (!gl) throw new Error('Actual WebGL2 unavailable')
      const debug = gl.getExtension('WEBGL_debug_renderer_info')
      return String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
    })
    await page.getByRole('button', { name: 'Bộ thẻ', exact: true }).click()
    await page.getByRole('button', { name: scenario === 'models' ? 'Nhân vật 3D' : 'Sticker', exact: true }).click()
    const count = scenario === 'models' ? 8 : 19
    await expectUI(page.locator('.bottom-counter')).toHaveText(`1/${count}`)
    await ready()
    const next = page.getByRole('button', { name: 'Card kế tiếp', exact: true })
    const activateNext = () => next.click()
    stage = '100-actual-asset-switches'
    for (let index = 0; index < 100; index++) {
      await activateNext()
      await expectUI(page.locator('.bottom-counter')).toHaveText(`${(index + 1) % count + 1}/${count}`)
      await ready()
      completedSwitches++
    }
    const originalRequests = [...requests.entries()].filter(([url]) => scenario === 'models' ? url.endsWith('.glb') : url.endsWith('.webp'))
    expect(originalRequests).toHaveLength(count)
    expect(originalRequests.every(([, requests]) => requests === 1)).toBe(true)
    if (scenario === 'stickers') expect(requests.get('/stickers/outlines.json')).toBe(1)
    stage = 'rapid-cached-reselection'
    for (let index = 0; index < 20; index++) await activateNext()
    await expectUI(page.locator('.bottom-counter')).toHaveText(`${120 % count + 1}/${count}`)
    await ready()
    expect([...requests.entries()]).toEqual([...requests.entries()].map(([url]) => [url, 1]))
    stage = 'context-loss-and-restore'
    await page.evaluate(() => {
      const gl = document.querySelector<HTMLCanvasElement>('[data-testid="card-showcase-canvas"]')!.getContext('webgl2')!
      const extension = gl.getExtension('WEBGL_lose_context')
      if (!extension) throw new Error('Context-loss extension unavailable')
      ;(window as unknown as { qaRestore: () => void }).qaRestore = () => extension.restoreContext()
      extension.loseContext()
    })
    await expectUI(page.getByRole('region', { name: 'Bản xem thay thế' })).toBeVisible()
    await page.evaluate(() => (window as unknown as { qaRestore: () => void }).qaRestore())
    await expectUI(page.getByRole('region', { name: 'Bản xem thay thế' })).toHaveCount(0, { timeout: 20_000 })
    await ready()
    await page.screenshot({ path: path.join(output, `${scenario}-restored-390x844.png`) })
    await context.tracing.stop({ path: path.join(output, 'assets-trace.zip') })
    expect(errors).toEqual([])
    result = 'passed'; stage = 'completed'
  } finally {
    clearTimeout(watchdog)
    await report()
    if (result !== 'passed' && browser) for (const context of browser.contexts()) {
      for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {})
      await context.tracing.stop({ path: path.join(output, 'failure-trace.zip') }).catch(() => {})
    }
    await browser?.close(); vite.kill()
    await catalogApi.close()
    console.log(`Showcase assets QA: ${output}`)
  }
}, assetsTimeoutMs + 10_000)
