import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const base = process.argv[2] ?? 'http://127.0.0.1:5173'
if (!base.startsWith('http://127.0.0.1:')) throw new Error('Local preview only')
const output = 'docs/design/theme-dialog-qa'
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
  for (const theme of ['emotion-orbit', 'kindness-workshop']) {
    for (const [width, height] of [[320, 260], [320, 400], [430, 660]]) {
      for (const screen of ['night-confirm', 'phase-confirm', 'muted', 'reflection-confirm', 'success-toast', 'card-preview']) {
        for (const pending of ['night-confirm', 'phase-confirm', 'card-preview'].includes(screen) ? [false, true] : [false]) {
          const page = await browser.newPage({ viewport: { width, height } })
          const errors = []
          page.on('pageerror', e => errors.push(e.message))
          await page.goto(`${base}/qa-screens.html?theme=${theme}&screen=${screen}${pending ? '&pending=1' : ''}`)
          await page.waitForFunction(t => document.documentElement.dataset.uiTheme === t, theme)
          await page.evaluate(() => document.fonts.ready)
          await page.waitForTimeout(900)
          await page.waitForFunction(() => [...document.images].every(img => !img.getAttribute('src') || img.complete), undefined, { timeout: 15000 })
          const issues = await page.evaluate(async () => {
            const issues = []
            for (const img of document.images) if (img.getAttribute('src') && !img.naturalWidth) issues.push('image did not load: ' + img.src)
            if (document.documentElement.scrollWidth > innerWidth) issues.push('document horizontal overflow')
            const dialog = document.querySelector('[role="dialog"]')
            for (const button of dialog?.querySelectorAll('button') ?? []) {
              for (let p = button.parentElement; p; p = p.parentElement) {
                if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) {
                  const r = button.getBoundingClientRect(), b = p.getBoundingClientRect()
                  p.scrollTop += r.top - b.top - (p.clientHeight - r.height) / 2
                }
              }
              await new Promise(resolve => requestAnimationFrame(resolve))
              const r = button.getBoundingClientRect()
              let top = 0, bottom = innerHeight
              for (let p = button.parentElement; p; p = p.parentElement) {
                if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowY)) {
                  const b = p.getBoundingClientRect(); top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom)
                }
              }
              if (r.left < -2 || r.right > innerWidth + 2 || r.top < top - 2 || r.bottom > bottom + 2) issues.push('unreachable: ' + (button.textContent || button.getAttribute('aria-label')))
            }
            return issues
          })
          if (pending) {
            if (!(await page.getByRole('dialog').getAttribute('aria-busy'))) issues.push('missing busy state')
            if (await page.getByRole('dialog').locator('button:enabled').count()) issues.push('pending action enabled')
            await page.keyboard.press('Escape')
            if (!(await page.getByRole('dialog').count())) issues.push('pending dialog dismissed')
          }
          if (width === 430 && !pending) {
            await page.evaluate(() => document.querySelectorAll('[role="dialog"]').forEach(el => { el.scrollTop = 0 }))
            await page.screenshot({ path: `${output}/${theme}-${screen}.png` })
          }
          results.push({ theme, width, height, screen, pending, issues, errors })
          await page.close()
        }
      }
    }
  }
} finally { await browser.close() }
const failures = results.filter(r => r.issues.length || r.errors.length)
await writeFile(`${output}/report.json`, JSON.stringify({ synthetic: true, backendConnected: false, cases: results.length, failures, results }, null, 2))
console.log(JSON.stringify({ cases: results.length, failures }))
process.exitCode = failures.length ? 1 : 0
