import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Local QA URL required')
const allRounds = process.argv.includes('--all-rounds')
const output = path.resolve(allRounds ? 'docs/design/all-rounds-theme-qa' : 'docs/design/gameplay-theme-qa')
await mkdir(output, { recursive: true })
const phases = ['role-reveal', 'night', 'healer-turn', 'silencer-turn', 'situation-card', 'emotion-card', 'story-telling', 'group-response', 'reflection-card', 'reflection-sharing', 'selfcare-card', 'hug-action', 'guess-silencer', 'reveal-silencer', 'give-coins', 'reward', 'ended']
const cases = []
if (allRounds) {
  for (const theme of ['emotion-orbit', 'kindness-workshop']) for (let round = 1; round <= 10; round++)
    for (const phase of phases) for (const [width, height] of [[320,400],[430,932]])
      cases.push({ theme, phase, round, count: 6 + (round - 1) % 5, viewer: ['narrator','sender','healer','silencer'][(round - 1) % 4], width, height })
} else for (const theme of ['emotion-orbit', 'kindness-workshop'])
  for (const phase of phases)
    for (const viewer of ['narrator', 'sender', 'healer', 'silencer'])
      for (const [width, height] of [[320, 400], [430, 932]]) cases.push({ theme, phase, viewer, width, height })
const browser = await chromium.launch()
const results = []
let cursor = 0
try {
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < cases.length) {
      const item = cases[cursor++]
      const page = await browser.newPage({ viewport: { width: item.width, height: item.height } })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      try {
        await page.goto(`${base}/qa-board.html?count=${item.count ?? 10}&round=${item.round ?? 1}&phase=${item.phase}&viewer=${item.viewer}&theme=${item.theme}`)
        await page.waitForFunction(theme => document.documentElement.dataset.uiTheme === theme, item.theme)
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(item.phase === 'role-reveal' ? 1600 : 600)
        await page.waitForFunction(() => [...document.images].filter(img => img.getAttribute('src')).every(img => img.complete), null, { timeout: 10000 })
        const state = await page.evaluate(async () => {
          const clippedLabels = []
          for (const surface of document.querySelectorAll('[data-cartoon-surface="pill"]')) {
            const label = surface.querySelector(':scope > span:not([data-cartoon-badge])')
            if (!label || !surface.getBoundingClientRect().width) continue
            const range = document.createRange(); range.selectNodeContents(label)
            const ink = range.getBoundingClientRect(), box = surface.getBoundingClientRect()
            if (ink.left < box.left - 2 || ink.right > box.right + 2 || ink.top < box.top - 2 || ink.bottom > box.bottom + 2) clippedLabels.push(label.textContent.trim())
          }
          const unreachable = []
          const top = [...document.querySelectorAll('[role="dialog"]')].at(-1) ?? document.querySelector('.game-board-scroll')
          if (top) for (const control of top.querySelectorAll('button,input,[data-player-token-id]')) {
            if (!control.getBoundingClientRect().width) continue
            for (let parent = control.parentElement; parent; parent = parent.parentElement) {
              if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) {
                const r = control.getBoundingClientRect(), b = parent.getBoundingClientRect()
                parent.scrollTop += r.top - b.top - Math.max(0, (parent.clientHeight - r.height) / 2)
              }
            }
            await new Promise(resolve => requestAnimationFrame(resolve))
            const r = control.getBoundingClientRect()
            let upper = 0, lower = innerHeight
            for (let parent = control.parentElement; parent; parent = parent.parentElement) if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) {
              const b = parent.getBoundingClientRect(); upper = Math.max(upper, b.top); lower = Math.min(lower, b.bottom)
            }
            if (r.top < upper - 2 || r.bottom > lower + 2) unreachable.push(control.getAttribute('aria-label') || control.textContent.trim())
          }
          return { clippedLabels, unreachable, overflowX: document.documentElement.scrollWidth > innerWidth,
            legacyControls: document.querySelectorAll('[data-control-theme="legacy"]').length,
            brokenImages: [...document.images].filter(img => img.complete && !img.naturalWidth).map(img => img.src) }
        })
        if (item.width === 430 && item.viewer === 'sender') {
          await page.evaluate(() => document.querySelectorAll('[role="dialog"], [role="dialog"] *, .game-board-scroll').forEach(el => { if (el.scrollHeight > el.clientHeight) el.scrollTop = 0 }))
          await page.screenshot({ path: path.join(output, `${item.theme}-${item.phase}.png`) })
        }
        results.push({ ...item, ...state, errors })
      } catch (error) { results.push({ ...item, errors: [...errors, error.message] }) }
      finally { await page.close() }
    }
  }))
  const failures = results.filter(r => r.errors.length || r.clippedLabels?.length || r.unreachable?.length || r.overflowX || r.legacyControls || r.brokenImages?.length)
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ synthetic: true, backendConnected: false, cases: results.length, failures, results }, null, 2))
  console.log(JSON.stringify({ cases: results.length, failed: failures.length, failures, output }))
  process.exitCode = failures.length ? 1 : 0
} finally { await browser.close() }
