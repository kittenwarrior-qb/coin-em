import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Local preview URL required')
const output = path.join(root, 'docs/design/a1-chrome-qa')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const [width, height] of [[320, 568], [430, 932], [1280, 900]]) {
    for (const route of ['/about', '/about/cards', '/about/story', '/cards', '/admin']) {
      const page = await browser.newPage({ viewport: { width, height } })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      // Read-only login-state fixture: no session credentials, real admin data or commands.
      await page.route('**/admin/api/**', request => request.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' }))
      await page.goto(base + route, { waitUntil: 'domcontentloaded' })
      await page.locator('main').waitFor()
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(500)
      if (route === '/admin') await page.getByLabel('Mật khẩu EmCoin', { exact: true }).waitFor()
      const controls = await page.locator('.primary-action,.secondary-action,.deck-tabs button,.site-menu-btn,.side-nav-button,.right-action-btn,.bottom-trigger').evaluateAll(nodes => nodes.map(el => ({ image: getComputedStyle(el).borderImageSource !== 'none' ? getComputedStyle(el).borderImageSource : getComputedStyle(el).backgroundImage, ink: getComputedStyle(el).color })))
      if (route !== '/admin' && (!controls.length || controls.some(el => !el.image.includes('/cartoon/buttons/themes/') || el.ink !== 'rgb(32, 85, 127)'))) throw new Error(`Unskinned route controls ${route}: ${JSON.stringify(controls)}`)
      const secondary = page.locator('.secondary-action').first()
      if (await secondary.count() && !(await secondary.evaluate(el => getComputedStyle(el).backgroundImage)).includes('pill-blush.png')) throw new Error('Secondary CTA must retain blush hierarchy')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      if (overflow || errors.length) throw new Error(JSON.stringify({ route, width, overflow, errors }))
      await page.screenshot({ path: path.join(output, `${route.slice(1).replaceAll('/', '-')}-${width}.png`) })
      results.push({ route, width, height, controls, overflow, errors })
      await page.close()
    }
  }
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ browser: browser.version(), adminMocked: true, physicalDevice: false, results }, null, 2))
  console.log(JSON.stringify({ output, passed: true, cases: results.length }))
} finally { await browser.close() }
