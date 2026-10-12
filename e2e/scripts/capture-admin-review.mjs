import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Local QA URL required')
const output = path.resolve('docs/design/screen-completeness-qa')
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const results = []
// Explicit synthetic public-schema examples; no admin password/cookie/real room data.
const overview = {
  rooms: [{ id: 'QA-WAITING', status: 'waiting', seats: 5, revision: 2 },
    { id: 'QA-PLAYING', status: 'playing', seats: 10, revision: 12 }],
  analytics: { version: 'operational-analytics/v1', scope: 'this-process-since-start', persistent: false,
    http: { completed: 17, clientErrors: 2, serverErrors: 1,
      durationBuckets: [10, 50, 100, 250, 500, 1000, 5000, null].map((upperBoundMs, i) => ({ upperBoundMs, count: i ? 0 : 17 })) } },
}
try {
  for (const theme of ['emotion-orbit', 'kindness-workshop'])
    for (const [width, height] of [[320, 400], [430, 932], [1280, 900]])
      for (const screen of ['admin-overview', 'admin-close', 'admin-unavailable']) {
        const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        try {
          await page.route('**/admin/api/**', route => {
            if (!route.request().url().endsWith('/overview')) throw new Error('Capture must not submit any admin mutation')
            return route.fulfill({ status: screen === 'admin-unavailable' ? 503 : 200,
              contentType: 'application/json', headers: { 'cache-control': 'no-store' },
              body: JSON.stringify(screen === 'admin-unavailable' ? { error: 'ADMIN_UNAVAILABLE' } : overview) })
          })
          await page.goto(`${base}/admin?theme=${theme}`)
          if (screen === 'admin-unavailable') await expect(page.getByRole('alert')).toContainText('chưa được cấu hình')
          else {
            await expect(page.getByRole('heading', { name: 'Vận hành máy chủ' })).toBeVisible()
            await expect(page.getByText('Không phải số người truy cập.', { exact: false })).toBeVisible()
            if (screen === 'admin-close') await page.getByRole('button', { name: 'Đóng phòng QA-PLAYING', exact: true }).click()
          }
          await page.evaluate(() => {
            const label = document.createElement('div')
            label.textContent = 'QA quản trị · Số liệu giả lập, không phải dữ liệu thật'
            label.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:1000;background:#fff;color:#253358;font:11px system-ui;text-align:center;padding:3px'
            document.body.append(label)
          })
          await page.evaluate(() => document.fonts.ready)
          await page.waitForTimeout(450)
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
          if (screen === 'admin-close') {
            const dialog = page.getByRole('dialog', { name: 'Đóng phòng?', exact: true })
            await expect(dialog).toBeVisible()
            await dialog.getByRole('button', { name: 'Hủy', exact: true }).scrollIntoViewIfNeeded()
            await expect(dialog.getByRole('button', { name: 'Hủy', exact: true })).toBeInViewport({ ratio: 1 })
          }
          if (width === 430) await page.screenshot({ path: path.join(output, `${theme}-${screen}.png`), fullPage: screen !== 'admin-close' })
          expect(errors).toEqual([])
          results.push({ theme, width, height, screen, passed: true })
        } catch (error) { results.push({ theme, width, height, screen, passed: false, error: error.message, errors }) }
        finally { await page.close() }
      }
} finally { await browser.close() }
const failures = results.filter(result => !result.passed)
await writeFile(path.join(output, 'admin-review-report.json'), JSON.stringify({ synthetic: true, backendConnected: false,
  authCookieProof: false, productionAnalyticsProof: false, cases: results.length, failures, results }, null, 2))
console.log(JSON.stringify({ cases: results.length, failures }))
process.exitCode = failures.length ? 1 : 0
