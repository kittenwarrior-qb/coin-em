import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Local preview URL required')
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/design/brand-theme-qa')
await mkdir(output, { recursive: true })
const cases = []
for (const theme of ['emotion-orbit', 'kindness-workshop'])
  for (const [width, height] of [[320, 400], [430, 932], [1280, 900]])
    for (const name of ['lobby', 'menu', 'create', 'join', 'guide', 'inventory', 'loading', 'waiting', 'history', 'role-reward', 'ntg-reward', 'guess-picker', 'board', 'give-coins', 'ended'])
      cases.push({ theme, width, height, name })
const browser = await chromium.launch()
const results = []
try {
  let cursor = 0
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < cases.length) {
      const item = cases[cursor++]
      const page = await browser.newPage({ viewport: { width: item.width, height: item.height } })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      try {
        const board = ['board', 'give-coins', 'ended'].includes(item.name)
        const screen = ['menu', 'create', 'join', 'inventory'].includes(item.name) ? 'lobby' : item.name
        await page.goto(base + (board ? '/qa-board.html?count=' + (item.name === 'board' ? 6 : 10) + '&viewer=sender&phase=' + (item.name === 'board' ? 'hug-action' : item.name) : '/qa-screens.html?stress=1&screen=' + screen) + '&theme=' + item.theme)
        await page.waitForFunction(theme => document.documentElement.dataset.uiTheme === theme, item.theme)
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(650)
        if (['menu', 'inventory'].includes(item.name)) {
          await page.getByRole('button', { name: 'Cài đặt', exact: true }).click()
          if (item.name === 'inventory') await page.getByRole('button', { name: 'Bộ thẻ', exact: true }).click()
        }
        if (['create', 'join'].includes(item.name)) await page.getByTestId(item.name === 'create' ? 'btn-create-room' : 'btn-join-room').click()
        if (item.name === 'guide') await page.getByRole('button', { name: 'Hướng dẫn', exact: true }).click()
        await page.waitForTimeout(400)
        await page.waitForFunction(() => [...document.images].filter(img => img.getAttribute('src') && img.loading !== 'lazy').every(img => img.complete), null, {timeout:20000})
        const state = await page.evaluate(() => ({
          appliedTheme: document.documentElement.dataset.uiTheme,
          overflowX: document.documentElement.scrollWidth > innerWidth,
          legacyControls: document.querySelectorAll('[data-control-theme="legacy"]').length,
          brokenImages: [...document.images].filter(img => img.complete && !img.naturalWidth).map(img => img.src),
          primary: getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim(),
        }))
        // Only real scroll ancestors can make a dialog action reachable.
        const unreachable = await page.evaluate(async () => {
          const failures = []
          const dialogs = [...document.querySelectorAll('[role="dialog"]')]
          const top = dialogs.at(-1) ?? document.querySelector('.brand-home')
          if (!top) return failures
          for (const el of top.querySelectorAll('button, input')) {
            if (!el.getBoundingClientRect().width) continue
            if (top.classList.contains('brand-home')) el.scrollIntoView({ block: 'center' })
            for (let p = el.parentElement; p; p = p.parentElement) {
              if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) {
                const r = el.getBoundingClientRect(), b = p.getBoundingClientRect()
                p.scrollTop += r.top - b.top - Math.max(0, (p.clientHeight - r.height) / 2)
              }
            }
            await new Promise(resolve => requestAnimationFrame(resolve))
            const r = el.getBoundingClientRect()
            let lower = innerHeight, upper = 0
            for (let p = el.parentElement; p; p = p.parentElement) {
              if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowY)) {
                const b = p.getBoundingClientRect()
                upper = Math.max(upper, b.top); lower = Math.min(lower, b.bottom)
              }
            }
            if (r.top < upper - 2 || r.bottom > lower + 2) failures.push(el.textContent?.trim() || el.getAttribute('aria-label') || el.tagName)
          }
          return failures
        })
        if (item.width === 430) {
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.evaluate(() => document.querySelectorAll('[role="dialog"], [role="dialog"] *').forEach(el => { if (el.scrollHeight > el.clientHeight) el.scrollTop = 0 }))
          await page.screenshot({ path: path.join(output, item.theme + '-' + item.name + '.png') })
        }
        results.push({ ...item, ...state, unreachable, errors })
      } catch (error) { results.push({ ...item, errors: [...errors, error.message] }) }
      finally { await page.close() }
    }
  }))
  const failures = results.filter(r => r.errors.length || r.overflowX || r.legacyControls || r.brokenImages?.length || r.unreachable?.length || r.appliedTheme !== r.theme)
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ synthetic: true, backendConnected: false, cases: results.length, failures, results }, null, 2))
  console.log(JSON.stringify({ cases: results.length, failed: failures.length, failures, output }))
  process.exitCode = failures.length ? 1 : 0
} finally { await browser.close() }
