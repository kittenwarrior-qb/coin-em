import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const base = process.argv[2]
assert.ok(base?.startsWith('http://127.0.0.1:'))
const output = 'D:/Desktop/coinem/docs/design/menu-harmony-qa'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const [width, height] of [[320,400], [320,568], [430,932], [1280,900], [844,390]]) {
    for (const context of ['home', 'room']) {
      const page = await browser.newPage({ viewport: { width, height } })
      await page.goto(`${base}/qa-menu-studies.html?variant=a1&direction=sky-pink&context=${context}`)
      const menu = page.getByRole('dialog', { name: 'Menu', exact: true })
      await menu.waitFor()
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] img')].every(img => img.complete && img.naturalWidth))
      await page.waitForTimeout(350)
      assert.ok(await menu.evaluate(el => el.classList.contains('theme-a-menu--harmonized')))
      for (const name of ['Bộ thẻ', 'Mở Bộ thẻ 3d trong tab mới', 'Hướng dẫn', context === 'home' ? 'Hỗ trợ' : 'Thoát game']) {
        const button = menu.getByRole('button', { name, exact: true })
        await button.scrollIntoViewIfNeeded()
        const box = await button.boundingBox()
        assert.ok(box && box.y >= 0 && box.y + box.height <= height, name)
        const src = await button.locator('img').first().getAttribute('src')
        assert.ok(src.includes(name.startsWith('Mở') ? 'pill-blush.png' : 'pill-sky-v2.png'))
      }
      const badge = await menu.locator('.cartoon-pill-badge').evaluate(el => ({ material: getComputedStyle(el).borderImageSource, color: getComputedStyle(el).color }))
      assert.equal(badge.material, 'none')
      assert.equal(badge.color, 'rgb(135, 61, 90)')
      assert.ok(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      await menu.locator('.theme-a-menu-panel').evaluate(el => el.scrollTop = 0)
      await page.screenshot({ path: `${output}/${context}-${width}-${height}.png` })
      await menu.getByRole('button', { name: 'Đóng', exact: true }).click()
      await menu.waitFor({ state: 'hidden' })
      results.push({ width, height, context, passed: true })
      await page.close()
    }
  }
  console.log(JSON.stringify({ cases: results.length, passed: true }))
} finally { await browser.close() }
