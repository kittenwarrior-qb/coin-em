import { test, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile, mkdir, cp, symlink, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect as expectUI } from '../../../e2e/node_modules/@playwright/test/index.mjs'
import { createIsolatedServer } from '../helpers/isolatedServer'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' }

test.each(['/', '/emcoin/'])('production PWA %s caches only public guide and defers update for another admitted tab', async base => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-pwa-browser-qa-'))
  const buildRoot = path.join(output, 'build')
  const sourceRoot = await mkdtemp(path.join(os.tmpdir(), 'emcoin-pwa-build-source-'))
  const frontendRoot = path.join(sourceRoot, 'frontend')
  const server = await createIsolatedServer()
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  let nextVersion = false
  let networkDown = false
  let stage = 'build', result = 'failed'
  const errors: string[] = []
  let cachePaths: string[] = []
  try {
    // Run the unchanged production optimizer against its own root/dist, never a
    // shared checkout or arbitrary external pruning target. Do not copy .env.
    await mkdir(frontendRoot)
    for (const directory of ['src', 'public', 'pwa']) await cp(path.join(root, 'fe', directory), path.join(frontendRoot, directory), { recursive: true })
    for (const filename of ['vite.config.ts', 'package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
      await cp(path.join(root, 'fe', filename), path.join(frontendRoot, filename))
    }
    await symlink(path.join(root, 'fe/node_modules'), path.join(frontendRoot, 'node_modules'), 'junction')
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), 'build'], {
        cwd: frontendRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'production', VITE_API_URL: server.url, VITE_BASE_URL: base, VITE_USE_HASH_ROUTE: base === '/' ? 'false' : 'true' },
      })
      let logs = ''
      const timeout = setTimeout(() => { child.kill(); reject(new Error('Owned PWA build timed out')) }, 60_000)
      child.stdout.on('data', chunk => { logs += chunk.toString() }); child.stderr.on('data', chunk => { logs += chunk.toString() })
      child.once('error', error => { clearTimeout(timeout); reject(error) })
      child.once('exit', code => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(`Owned PWA build failed ${code}: ${logs.slice(-1500)}`)) })
    })
    await cp(path.join(frontendRoot, 'dist'), buildRoot, { recursive: true })
    server.httpServer.on('request', async (req, res) => {
      const url = new URL(req.url ?? '/', server.url)
      if (url.pathname.startsWith('/socket.io')) return
      // Chromium's offline emulation may not cover a restarted worker target.
      // The owned loopback fixture also drops HTTP connections: no online escape.
      if (networkDown) { req.socket.destroy(); return }
      try {
        const relative = decodeURIComponent(url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname.slice(1))
        const requested = path.resolve(buildRoot, relative || 'index.html')
        if (path.relative(buildRoot, requested).startsWith('..')) { res.writeHead(403); res.end(); return }
        let filename = requested, body: Buffer
        try { body = await readFile(filename) } catch {
          if (path.extname(relative)) { res.writeHead(404); res.end(); return }
          filename = path.join(buildRoot, 'index.html'); body = await readFile(filename)
        }
        if (relative === 'sw.js' && nextVersion) {
          // A controlled new worker version, same compiled app/public assets; not a production rollout.
          body = Buffer.from(body.toString().replace(/"version":"([a-f0-9]+)"/, '"version":"qa-next-$1"'))
        }
        res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(body)
      } catch { if (!res.headersSent) res.writeHead(500); res.end() }
    })
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false })
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      return url.origin === server.url ? route.continue() : route.abort()
    })
    const publicURL = `${server.url}${base}${base === '/' ? 'about' : '#/about'}`
    const publicPage = await context.newPage()
    publicPage.on('pageerror', error => errors.push(error.message))
    stage = 'initial-install'
    await publicPage.goto(publicURL, { waitUntil: 'domcontentloaded' })
    await publicPage.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 20_000 })
    const manifest = await publicPage.evaluate(async () => {
      const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!
      return (await fetch(link.href)).json()
    })
    expect(manifest.scope).toBe(base); expect(manifest.start_url).toBe(base)
    const inspectCache = () => publicPage.evaluate(async () => {
      const entries = []
      for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) entries.push(new URL(request.url).pathname)
      return entries.sort()
    })
    cachePaths = await inspectCache()
    expect(cachePaths).toEqual([`${base}logo.svg`, `${base}manifest.webmanifest`, `${base}offline.html`].sort())
    stage = 'admitted-tab-update-deferral'
    const guest = await context.newPage()
    guest.on('pageerror', error => errors.push(error.message))
    await guest.goto(`${server.url}${base}`, { waitUntil: 'domcontentloaded' })
    await guest.getByTestId('btn-create-room').click()
    await guest.getByTestId('input-username-create').fill('PwaBrowserQA')
    await guest.getByTestId('btn-confirm-create').click()
    await expectUI(guest.getByTestId('waiting-room')).toBeVisible()
    nextVersion = true
    await publicPage.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update() })
    const updateButton = publicPage.getByRole('button', { name: 'Cập nhật và tải lại', exact: true })
    await expectUI(updateButton).toBeVisible({ timeout: 20_000 })
    const oldWorker = await publicPage.evaluate(() => navigator.serviceWorker.controller!.scriptURL)
    await updateButton.click()
    await expectUI(publicPage.getByRole('status').filter({ hasText: 'Chưa cập nhật:' })).toBeVisible()
    await expectUI(guest.getByTestId('waiting-room')).toBeVisible()
    expect(await publicPage.evaluate(() => !!(navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL))).toBe(true)
    expect(await publicPage.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())!.waiting)).toBe(true)
    await guest.close()
    stage = 'explicit-safe-update'
    await Promise.all([publicPage.waitForNavigation({ waitUntil: 'domcontentloaded' }), updateButton.click()])
    await expectUI.poll(() => publicPage.evaluate(async () => !(await navigator.serviceWorker.getRegistration())!.waiting)).toBe(true)
    await expectUI(publicPage.getByRole('button', { name: 'Cập nhật và tải lại', exact: true })).toHaveCount(0)
    expect(await publicPage.evaluate(() => navigator.serviceWorker.controller!.scriptURL)).toBe(oldWorker)
    const cacheNames = await publicPage.evaluate(() => caches.keys())
    expect(cacheNames).toHaveLength(1); expect(cacheNames[0]).toContain('-qa-next-')
    cachePaths = await inspectCache()
    expect(cachePaths).toEqual([`${base}logo.svg`, `${base}manifest.webmanifest`, `${base}offline.html`].sort())
    stage = 'offline-public-guide'
    networkDown = true
    await context.setOffline(true)
    await publicPage.goto(`${server.url}${base}game`, { waitUntil: 'domcontentloaded' })
    await expectUI(publicPage.getByRole('heading', { name: 'Hướng dẫn EmCoin', exact: true })).toBeVisible()
    await expectUI(publicPage.getByText('Mỗi lượt sử dụng 60 Coin, gồm 20 Coin Đỏ, 20 Coin Xanh và 20 Coin Vàng.', { exact: true })).toBeVisible()
    expect(await publicPage.locator('script').count()).toBe(0)
    expect(await publicPage.locator('#root').count()).toBe(0)
    const geometry = await publicPage.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, width: document.querySelector('main')!.getBoundingClientRect().width }))
    expect(geometry.overflow).toBe(false); expect(geometry.width).toBeLessThanOrEqual(430)
    await publicPage.screenshot({ path: path.join(output, 'offline-guide-390x844.png'), fullPage: true })
    stage = 'cache-eviction'
    await publicPage.evaluate(async () => { for (const name of await caches.keys()) if (name.startsWith('emcoin-public-guide-')) await caches.delete(name) })
    expect(await publicPage.evaluate(() => caches.keys())).toEqual([])
    const response = await publicPage.goto(`${server.url}${base}game`, { waitUntil: 'domcontentloaded' })
    expect(response!.status()).toBe(503)
    expect(response!.fromServiceWorker()).toBe(true)
    await expectUI(publicPage.getByText('Hướng dẫn ngoại tuyến chưa có. Hãy kết nối mạng để mở EmCoin.', { exact: true })).toBeVisible()
    networkDown = false; await context.setOffline(false)
    await publicPage.goto(publicURL, { waitUntil: 'domcontentloaded' })
    await expectUI.poll(() => publicPage.evaluate(() => !!document.getElementById('root'))).toBe(true)
    expect(errors).toEqual([])
    await context.tracing.stop({ path: path.join(output, 'trace.zip') })
    result = 'passed'; stage = 'completed'
  } finally {
    if (result !== 'passed' && browser) for (const context of browser.contexts()) {
      for (const [index, page] of context.pages().entries()) await page.screenshot({ path: path.join(output, `failure-${index}.png`) }).catch(() => {})
      await context.tracing.stop({ path: path.join(output, 'failure-trace.zip') }).catch(() => {})
    }
    await browser?.close(); await server.close()
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ version: 'pwa-public-guide-qa/v1', result, stage, base,
      browser: browser?.version(), output, cachePaths, errors, backend: 'production handlers / isolated temp root / mocked Redis',
      workerUpdate: 'controlled version change of compiled worker, identical app/assets', physicalDevice: false, installationPromptVerified: false }, null, 2))
    console.log(`PWA browser QA: ${output}`)
    const cleanupRoot = path.resolve(sourceRoot)
    if (path.dirname(cleanupRoot) !== path.resolve(os.tmpdir()) || !path.basename(cleanupRoot).startsWith('emcoin-pwa-build-source-')) throw new Error('UNSAFE_OWNED_SOURCE_CLEANUP')
    await rm(cleanupRoot, { recursive: true, force: true })
  }
})
