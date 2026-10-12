import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Local QA URL required')
const output = path.resolve('docs/design/user-ready-ui-qa')
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
  for (const theme of ['emotion-orbit', 'kindness-workshop']) {
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(`${base}/qa-screens.html?screen=waiting&theme=${theme}`)
      await expect(page.getByTestId('player-count')).toHaveText('10 / 10')
      const roster = await page.getByTestId('player-list').evaluate(el => ({ height: el.clientHeight, scroll: el.scrollHeight }))
      expect(roster.height).toBeGreaterThan(400)
      await page.getByRole('button', { name: 'Chỉnh hồ sơ của QA người 1' }).focus()
      await page.keyboard.press('Enter')
      await expect(page.getByPlaceholder('Nhập tên')).toHaveValue('QA người 1')
      results.push({ theme, screen: 'waiting-density-keyboard', passed: true })

      await page.goto(`${base}/qa-board.html?count=10&phase=ended&theme=${theme}`)
      const ended = page.getByRole('dialog', { name: 'Hành trình kết thúc', exact: true })
      await expect(ended).toBeVisible()
      await page.waitForTimeout(1400)
      const leave = ended.getByRole('button', { name: 'Rời phòng', exact: true })
      await expect(leave).toBeInViewport({ ratio: 1 })
      await page.getByTestId('ended-content').evaluate(el => { el.scrollTop = el.scrollHeight })
      await expect(leave).toBeInViewport({ ratio: 1 })
      expect(await ended.locator('[data-ui-coin-icon]').count()).toBe(30)
      await page.screenshot({ path: path.join(output, `${theme}-ended-footer.png`) })
      results.push({ theme, screen: 'ending-stable-footer-coins', passed: true })

      // Controlled network failure for one original LOCAL owned face. No replacement art.
      let offline = true
      await page.route('**/cards/vai-tro/VT1.webp', route => offline ? route.abort('connectionfailed') : route.continue())
      await page.goto(`${base}/qa-screens.html?screen=lobby&theme=${theme}`)
      await page.getByRole('button', { name: 'Cài đặt', exact: true }).click()
      await page.getByRole('button', { name: 'Bộ thẻ', exact: true }).click()
      const face = page.getByAltText('role-VT1', { exact: true })
      await expect(face.locator('..').getByText('Ảnh thẻ chưa tải được.')).toBeVisible()
      await face.locator('..').click()
      const original = page.locator('img[src="/cards/vai-tro/VT1.webp"]').last()
      const retry = original.locator('..').getByRole('button', { name: 'Thử lại', exact: true })
      await expect(retry).toBeVisible()
      offline = false
      await retry.click()
      await expect(original).toHaveAttribute('src', '/cards/vai-tro/VT1.webp')
      await expect.poll(() => original.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
      await expect(retry).toHaveCount(0)
      await page.screenshot({ path: path.join(output, `${theme}-card-retry.png`) })
      results.push({ theme, screen: 'original-face-failure-retry', passed: true })
      expect(errors).toEqual([])
    } catch (error) { results.push({ theme, passed: false, error: error.message, errors }) }
    finally { await page.close() }
  }
} finally { await browser.close() }
const failures = results.filter(result => !result.passed)
await writeFile(path.join(output, 'report.json'), JSON.stringify({ synthetic: true, results, failures }, null, 2))
console.log(JSON.stringify({ results: results.length, failures }))
process.exitCode = failures.length ? 1 : 0
