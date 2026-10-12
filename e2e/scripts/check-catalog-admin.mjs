import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const { pdfCatalogDraft } = createRequire(import.meta.url)('../../be/dist/catalog/pdfDraft.js')
const base = process.argv[2]
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base ?? '')) throw new Error('Owned loopback preview required')
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/qa/catalog-admin')
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
  for (const theme of ['emotion-orbit', 'kindness-workshop']) for (const [width, height] of [[320, 400], [430, 932], [1280, 900]])
    for (const mode of ['list', 'edit', 'uncertain', 'stale']) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
      const errors = [], commands = []
      let cards = pdfCatalogDraft(), revision = 1
      page.on('pageerror', error => errors.push(error.message))
      try {
        await page.route('**/admin/api/**', async route => {
          const url = new URL(route.request().url())
          const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
          if (url.pathname.endsWith('/overview')) return send({ rooms: [], analytics: { version: 'operational-analytics/v1',
            scope: 'this-process-since-start', persistent: false, http: { completed: 0, clientErrors: 0, serverErrors: 0,
              durationBuckets: [10,50,100,250,500,1000,5000,null].map(upperBoundMs => ({ upperBoundMs, count: 0 })) } } })
          if (url.pathname.endsWith('/catalog')) return send({ revision, active: false, cards })
          if (url.pathname.endsWith('/catalog/readiness')) return send({ revision, ready: false, issues: [], missingCategories: [], snapshots: [] })
          if (url.pathname.endsWith('/catalog/save')) {
            const command = route.request().postDataJSON(); commands.push(command)
            if (mode === 'stale') return send({ error: 'CATALOG_REVISION_CONFLICT' }, 409)
            if (mode === 'uncertain' && commands.length === 1) return send({ error: 'CATALOG_UNAVAILABLE' }, 503)
            cards = cards.map(card => card.id === command.card.id ? command.card : card); revision++
            return send({ success: true, id: command.card.id, revision, replayed: false })
          }
          throw new Error('Unexpected admin mutation')
        })
        await page.goto(`${base}/admin?theme=${theme}`)
        await page.getByRole('button', { name: 'Quản lý bộ thẻ', exact: true }).click()
        await expect(page.getByText('100 thẻ · bản nháp 1', { exact: true })).toBeVisible()
        if (mode !== 'list') {
          await page.getByLabel('Tìm thẻ', { exact: true }).fill('Hung hăng')
          await page.getByRole('button', { name: 'CX-011 · Hung hăng', exact: true }).click()
          await page.getByLabel('Định nghĩa', { exact: true }).fill('Nội dung QA giả lập, không phát hành.')
          await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
          if (mode === 'uncertain') {
            await page.getByRole('button', { name: 'Thử lại đúng bản lưu', exact: true }).click()
            if (commands.length !== 2 || JSON.stringify(commands[0]) !== JSON.stringify(commands[1])) throw new Error('Uncertain intent drift')
          }
          if (mode === 'stale') await expect(page.getByRole('status')).toContainText('Catalog đã thay đổi')
          else await expect(page.getByRole('status')).toContainText('Đã lưu bản nháp')
          await page.getByAltText('Mặt trước Hung hăng').scrollIntoViewIfNeeded()
          await page.waitForFunction(() => [...document.images].filter(image => image.alt.includes('Hung hăng')).every(image => image.complete && image.naturalWidth > 0))
        }
        const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
        if (overflowX || errors.length) throw new Error('Admin layout/page error')
        await page.evaluate(() => { const banner = document.createElement('p'); banner.textContent = 'QA local · API admin giả lập · không phải dữ liệu production'; document.body.prepend(banner) })
        await page.screenshot({ path: path.join(output, `${theme}-${width}-${mode}.png`), fullPage: true })
        results.push({ theme, width, height, mode, result: 'passed', overflowX, commands: commands.length })
      } catch (error) { results.push({ theme, width, height, mode, result: 'failed', error: error.message, errors }) }
      finally { await page.close() }
    }
} finally { await browser.close() }
await writeFile(path.join(output, 'report.json'), JSON.stringify({
  scope: 'synthetic intercepted admin API; actual frontend/PDF artwork; not authentication/durable SQLite/production evidence', results,
}, null, 2))
console.log(JSON.stringify({ cases: results.length, failures: results.filter(item => item.result !== 'passed') }))
if (results.some(item => item.result !== 'passed')) process.exitCode = 1
