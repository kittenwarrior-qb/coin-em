import { test, expect, onTestFinished } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect as expectUI } from '../../../e2e/node_modules/@playwright/test/index.mjs'
import { startPublicCatalogFixture } from '../helpers/publicCatalogFixture'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

test.each(['unsupported-webgl', 'switches-context-loss', 'missing-texture'] as const)('existing card art lifecycle: %s', async scenario => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-showcase-browser-qa-'))
  const catalogApi = await startPublicCatalogFixture()
  const vite = spawn(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '0', '--clearScreen', 'false'], {
    cwd: path.join(root, 'fe'), env: catalogApi.env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  let stage = 'startup', result = 'failed', renderer: string | undefined
  let completedRoleCardSwitches = 0
  const errors: string[] = []
  let reportWritten = false
  const report = async () => {
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ version: 'showcase-lifecycle-qa/v2', scenario, result, stage, browser: browser?.version(), renderer,
      roleCardSwitches: completedRoleCardSwitches, errors, backendConnected: false, catalogApiConnected: true, physicalDevice: false,
      limitations: '100 existing role-card switches only; no100 model/deck switches, FPS/device budget or GPU memory-cap claim' }, null, 2))
    reportWritten = true
  }
  // Stop only our browser/child before Vitest's outer timeout; preserve the failing stage.
  const watchdog = setTimeout(() => { errors.push('Owned170s watchdog expired'); void browser?.close().catch(() => {}); vite.kill() }, 170_000)
  onTestFinished(async () => {
    clearTimeout(watchdog)
    if (!reportWritten) await report()
    vite.kill()
    await browser?.close()
    await catalogApi.close()
  })
  try {
    const base = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Owned showcase Vite timed out')), 20_000)
      let logs = ''
      const receive = (chunk: Buffer) => {
        logs += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '')
        const match = logs.match(/http:\/\/127\.0\.0\.1:\d+\//)
        if (match) { clearTimeout(timeout); resolve(match[0]) }
      }
      vite.stdout.on('data', receive); vite.stderr.on('data', receive)
      vite.once('error', error => { clearTimeout(timeout); reject(error) })
      vite.once('exit', code => { clearTimeout(timeout); reject(new Error(`Owned showcase Vite exited${code}`)) })
    })
    browser = await chromium.launch({ headless: true })
    const offlineCDN = async (context: Awaited<ReturnType<typeof browser.newContext>>) => context.route('**/*', route => {
      const url = new URL(route.request().url())
      return [new URL(base).origin, new URL(catalogApi.url).origin].includes(url.origin) ? route.continue() : route.abort()
    })
    if (scenario === 'unsupported-webgl') {
      const fallback = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
      await fallback.tracing.start({ screenshots: true, snapshots: true, sources: false })
      await fallback.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
          return type.startsWith('webgl') ? null : original.apply(this, [type, ...args] as Parameters<typeof original>)
        } as typeof original
      })
      await offlineCDN(fallback)
      const page = await fallback.newPage(); page.on('pageerror', error => errors.push(`fallback:${error.message}`))
      stage = 'unsupported-webgl'
      await page.goto(`${base}cards`, { waitUntil: 'domcontentloaded' })
      await expectUI(page.getByRole('region', { name: 'Bản xem thay thế' })).toBeVisible()
      await expectUI(page.getByRole('img', { name: 'VT1 — mặt trước' })).toHaveAttribute('src', '/card-showcase/role/01-vt1.webp')
      await expectUI(page.getByRole('img', { name: 'VT1 — mặt sau' })).toHaveAttribute('src', '/card-showcase/role/back.webp')
      await page.getByRole('button', { name: 'Bộ thẻ', exact: true }).click()
      await page.getByRole('button', { name: 'Nhân vật 3D', exact: true }).click()
      await expectUI(page.getByText('Chưa có hình thay thế được duyệt cho nhân vật này.', { exact: true })).toBeVisible()
      const noticeBox = await page.getByRole('status').boundingBox()
      const controlsBox = await page.locator('.right-actions').boundingBox()
      expect(noticeBox!.y).toBeGreaterThan(controlsBox!.y + controlsBox!.height)
      await page.screenshot({ path: path.join(output, 'unsupported-model-390x844.png') })
      stage = 'collecting-fallback-trace'
      await fallback.tracing.stop({ path: path.join(output, 'fallback-trace.zip') })
      await fallback.close()
    }
    if (scenario === 'switches-context-loss') {
      stage = 'normal-webgl'
      const graphics = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      // Keep DOM/network trace plus explicit final screenshots, not every software-rendered GPU frame.
      await graphics.tracing.start({ screenshots: false, snapshots: true, sources: false }); await offlineCDN(graphics)
      const normal = await graphics.newPage(); normal.on('pageerror', error => errors.push(`graphics:${error.message}`))
      await normal.goto(`${base}cards`, { waitUntil: 'domcontentloaded' })
      await expectUI(normal.getByTestId('card-showcase-canvas')).toBeVisible({ timeout: 20_000 })
      await expectUI(normal.getByText('Đang tải thẻ...', { exact: true })).toHaveCount(0, { timeout: 20_000 })
      await expectUI(normal.getByRole('region', { name: 'Bản xem thay thế' })).toHaveCount(0)
      renderer = await normal.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="card-showcase-canvas"]')!
        const gl = canvas.getContext('webgl2')!
        if (!gl) throw new Error('Actual WebGL2 unavailable on this runner')
        const debug = gl.getExtension('WEBGL_debug_renderer_info')
        return String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
      })
      stage = '100-role-card-switches'
      for (let index = 0; index < 100; index++) {
        await normal.getByRole('button', { name: 'Card kế tiếp', exact: true }).click()
        await expectUI(normal.locator('.bottom-counter')).toHaveText(`${(index + 1) % 7 + 1}/7`)
        await expectUI(normal.getByText('Đang tải thẻ...', { exact: true })).toHaveCount(0)
        await expectUI(normal.getByRole('region', { name: 'Bản xem thay thế' })).toHaveCount(0)
        completedRoleCardSwitches++
      }
      stage = 'context-loss-and-restore'
      await normal.evaluate(() => {
        const gl = document.querySelector<HTMLCanvasElement>('canvas')!.getContext('webgl2')!
        const extension = gl.getExtension('WEBGL_lose_context')
        if (!extension) throw new Error('Context-loss extension unavailable')
        ;(window as unknown as { qaRestore: () => void }).qaRestore = () => extension.restoreContext()
        extension.loseContext()
      })
      await expectUI(normal.getByRole('region', { name: 'Bản xem thay thế' })).toBeVisible()
      await normal.evaluate(() => { (window as unknown as { qaRestore: () => void }).qaRestore() })
      await expectUI(normal.getByRole('region', { name: 'Bản xem thay thế' })).toHaveCount(0, { timeout: 20_000 })
      await expectUI(normal.getByText('Đang tải thẻ...', { exact: true })).toHaveCount(0)
      await normal.screenshot({ path: path.join(output, 'restored-1280x900.png') })
      stage = 'collecting-graphics-trace'
      await graphics.tracing.stop({ path: path.join(output, 'graphics-trace.zip') })
      await graphics.close()
    }
    if (scenario === 'missing-texture') {
      stage = 'active-texture-failure'
      const missing = await browser.newContext({ viewport: { width: 390, height: 844 } }); await offlineCDN(missing)
      await missing.route('**/card-showcase/role/*', route => route.abort())
      const failed = await missing.newPage(); failed.on('pageerror', error => errors.push(`missing:${error.message}`))
      await failed.goto(`${base}cards`, { waitUntil: 'domcontentloaded' })
      await expectUI(failed.getByTestId('card-showcase-canvas')).toBeVisible({ timeout: 20_000 })
      await expectUI(failed.getByRole('status').filter({ hasText: 'Chưa tải được nội dung 3D' })).toBeVisible({ timeout: 20_000 })
      await expectUI(failed.getByRole('button', { name: 'Card kế tiếp', exact: true })).toBeEnabled()
      await failed.screenshot({ path: path.join(output, 'missing-texture-390x844.png') })
    }
    expect(errors).toEqual([])
    result = 'passed'; stage = 'completed'
  } finally {
    clearTimeout(watchdog)
    await report()
    if (result !== 'passed' && browser) for (const [index, context] of browser.contexts().entries()) {
      for (const [pageIndex, page] of context.pages().entries()) await page.screenshot({ path: path.join(output, `failure-${index}-${pageIndex}.png`) }).catch(() => {})
      await context.tracing.stop({ path: path.join(output, `failure-${index}-trace.zip`) }).catch(() => {})
    }
    await browser?.close(); vite.kill()
    await catalogApi.close()
    console.log(`Showcase browser QA: ${output}`)
  }
})
