import { chromium, expect } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base = new URL(process.argv[2])
if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw Error('Owned loopback fixture required')
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-candy-switch-'))
const browser = await chromium.launch(), results = [], errors = []
try {
  for (const [width, height] of [[320,400], [390,844], [1440,900]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
    await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort())
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(new URL('/qa-screens.html?screen=lobby&theme=emotion-orbit', base).href)
    await page.getByTestId('screen-qa-fixture').waitFor()
    const select = async (label, back = false) => {
      await page.getByRole('button', { name: 'Cài đặt', exact: true }).click()
      await page.getByRole('button', { name: 'Giao diện', exact: true }).click()
      await page.getByRole('radio', { name: new RegExp(label) }).check()
      if (back) { await page.goBack(); await page.goBack() }
      else { await page.keyboard.press('Escape'); await page.keyboard.press('Escape') }
      await expect(page.getByRole('button', { name: 'Cài đặt', exact: true })).toBeFocused()
    }
    await select('Mây Kẹo', width !== 390)
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'candy-clouds')
    await expect(page.locator('#home-logo')).toHaveAttribute('src', '/logo.svg')
    expect(await page.evaluate(() => localStorage.getItem('emcoin.ui-theme.v1'))).toBe('candy-clouds')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'candy-clouds')
    await page.evaluate(() => document.fonts.ready)
    await page.locator('#home-logo').evaluate(image => image.decode())
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: path.join(output, `home-${width}x${height}.png`) })
    await select('Xưởng Tử Tế', width === 390)
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'kindness-workshop')
    await expect(page.locator('#home-logo')).toHaveAttribute('src', '/cartoon/ui/themes/kindness-workshop/logo-v2.webp')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'kindness-workshop')
    results.push({ width, height, result: 'passed', persistedCandy: true, returnedToWorkshop: true })
    await context.close()
  }
  expect(errors).toEqual([])
} finally {
  await browser.close()
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ synthetic: true, productionModified: false, results, errors }, null, 2))
  console.log(JSON.stringify({ output, results, errors }))
}
