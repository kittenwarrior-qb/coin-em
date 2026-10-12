import { chromium } from '@playwright/test'
import { mkdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(root, 'docs/design/menu-a-studies')
const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Pass an isolated local Vite URL')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const variant of ['a1', 'a2', 'a3']) {
    for (const [width, height] of [[430, 760], [320, 568], [390, 400]]) {
      const page = await browser.newPage({ viewport: { width, height } })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}/qa-menu-studies.html?variant=${variant}`, { waitUntil: 'networkidle' })
      const menu = page.getByRole('dialog', { name: 'Menu', exact: true })
      await menu.waitFor()
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(350)
      if (variant === 'a1') {
        const badge = await menu.locator('[data-cartoon-badge="pill"]').evaluate(el => {
          const style = getComputedStyle(el)
          return { image: style.backgroundImage, radius: style.borderRadius, color: style.backgroundColor }
        })
        if (badge.image !== 'none' || badge.radius !== '8px' || badge.color !== 'rgb(250, 229, 236)') throw new Error(`Badge not restored: ${JSON.stringify(badge)}`)
      }
      for (const name of ['Bộ thẻ', variant === 'a1' ? 'Mở Bộ thẻ 3d trong tab mới' : 'Bộ thẻ 3D', 'Hướng dẫn']) {
        const control = menu.getByRole('button', { name, exact: true })
        await control.scrollIntoViewIfNeeded()
        if (!await control.isEnabled()) throw new Error('Disabled preview control')
      }
      const exit = menu.getByRole('button', { name: 'Thoát game', exact: true })
      await exit.scrollIntoViewIfNeeded()
      const footer = await exit.boundingBox()
      if (footer.y < 0 || footer.y + footer.height > height + 1) throw new Error('Footer unreachable')
      await page.screenshot({ path: path.join(output, `${variant}-${width}x${height}-footer.png`) })
      await menu.getByRole('button', { name: 'Bộ thẻ', exact: true }).scrollIntoViewIfNeeded()
      // Static approval image, not a keyboard-focus-state screenshot.
      await page.evaluate(() => document.activeElement?.blur())
      if (width === 430) await page.screenshot({ path: path.join(output, `${variant}.png`) })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      if (overflow || errors.length) throw new Error(JSON.stringify({ overflow, errors }))
      results.push({ variant, width, height, footerReachable: true, overflow, errors })
      await page.close()
    }
  }
  const gallery = await browser.newPage({ viewport: { width: 1360, height: 900 } })
  await gallery.goto(`${base}/qa-menu-studies.html`, { waitUntil: 'networkidle' })
  for (const frame of gallery.frames().slice(1)) {
    await frame.getByRole('dialog', { name: 'Menu', exact: true }).waitFor()
    await frame.evaluate(() => document.fonts.ready)
    await frame.evaluate(() => document.activeElement?.blur())
  }
  await gallery.waitForTimeout(400)
  await gallery.screenshot({ path: path.join(output, 'comparison.png'), fullPage: true })
  try { await access(path.join(root, 'fe/dist/qa-menu-studies.html')); throw new Error('Study entry leaked into production') }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  const report = { previewOnly: true, backendConnected: false, browser: browser.version(), results }
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ output, checks: results.length, passed: true }))
} finally { await browser.close() }
