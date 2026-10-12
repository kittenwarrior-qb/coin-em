import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const browser = await chromium.launch()
const results = []
const output = 'docs/design/theme-dialog-qa'
await mkdir(output, { recursive: true })
try {
  for (const theme of ['emotion-orbit', 'kindness-workshop']) {
    for (const [width, height] of [[320, 400], [430, 660], [430, 932]]) {
      const page = await browser.newPage({ viewport: { width, height } })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.goto(`http://127.0.0.1:5173/qa-board.html?count=10&phase=give-coins&viewer=narrator&offline=1&theme=${theme}`)
      await page.waitForFunction(t => document.documentElement.dataset.uiTheme === t, theme)
      await page.waitForTimeout(900)
      const issues = []
      for (const id of ['btn-prev-phase', 'btn-next-phase']) {
        const button = page.getByTestId(id)
        if (await button.count() !== 1 || await button.isEnabled()) issues.push(`${id} not locked offline`)
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) issues.push('horizontal overflow')
      if (height === 660) await page.screenshot({ path: `${output}/${theme}-offline.png` })
      results.push({ theme, width, height, issues, errors })
      await page.close()
    }
  }
} finally { await browser.close() }
const failures = results.filter(r => r.issues.length || r.errors.length)
await writeFile(`${output}/offline-report.json`, JSON.stringify({ synthetic: true, backendConnected: false, results, failures }, null, 2))
console.log(JSON.stringify({ cases: results.length, failures }))
process.exitCode = failures.length ? 1 : 0
