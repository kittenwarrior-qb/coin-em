import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Local fixture URL required')
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/design/a1-scroll-qa')
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
  await Promise.all([[320,568], [320,400], [390,400], [844,390], [1280,720]].map(async ([width, height]) => {
    for (const name of ['ended', 'reveal-silencer', 'role-reveal', 'guess-silencer', 'reward', 'give-coins', 'waiting', 'history', 'menu', 'create', 'join', 'inventory', 'role-reward', 'ntg-reward', 'guess-picker']) {
      const page = await browser.newPage({ viewport: { width, height } })
      const screen = ['waiting', 'history', 'menu', 'create', 'join', 'inventory', 'role-reward', 'ntg-reward', 'guess-picker'].includes(name)
      await page.goto(base + (screen ? `/qa-screens.html?stress=1&screen=${['menu','create','join','inventory'].includes(name) ? 'lobby' : name}` : `/qa-board.html?count=10&phase=${name}&viewer=sender`))
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(1500)
      if (['menu','create','join','inventory'].includes(name)) {
        if (name === 'create' || name === 'join') await page.getByTestId(name === 'create' ? 'btn-create-room' : 'btn-join-room').click()
        else await page.getByRole('button', { name: 'Cài đặt', exact: true }).click()
        if (name === 'inventory') await page.getByRole('button', { name: 'Bộ thẻ', exact: true }).click()
        await page.waitForTimeout(700)
      }
      const checks = await page.evaluate(async () => {
        const targets = [...document.querySelectorAll('[role="dialog"] button, [role="dialog"] h2, [data-testid="history-log-scroll"] > div > div, [data-testid^="waiting-player-"], [aria-label="Bình chọn Người Im Lặng"] button, [data-testid="btn-start-game"], [data-testid="btn-leave-room"]')]
          .filter(el => el.getBoundingClientRect().width && getComputedStyle(el).visibility !== 'hidden')
        const failures = []
        for (const tab of document.querySelectorAll('[data-ui-chrome="inventory-tabs"] > button')) {
          const style = getComputedStyle(tab)
          if (!style.borderImageSource.includes('/pill-') || style.borderImageSlice !== '0 80 fill') failures.push({ text: 'Inventory tab material/endcaps', borderImageSource:style.borderImageSource, borderImageSlice:style.borderImageSlice })
        }
        for (const el of targets) {
          // Scroll only genuine user-scrollable ancestors; overflow:hidden must not mask a bug.
          const ancestors = []
          for (let p = el.parentElement; p; p = p.parentElement) {
            if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) ancestors.push(p)
          }
          for (const p of ancestors) {
            const r = el.getBoundingClientRect(), b = p.getBoundingClientRect()
            p.scrollTop += r.top - b.top - Math.max(0, (p.clientHeight - r.height) / 2)
          }
          await new Promise(resolve => requestAnimationFrame(resolve))
          const r = el.getBoundingClientRect()
          let top = 0, bottom = innerHeight, left = 0, right = innerWidth
          for (let p = el.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p), b = p.getBoundingClientRect()
            if (/(auto|scroll|hidden|clip)/.test(s.overflowY)) { top = Math.max(top,b.top); bottom = Math.min(bottom,b.bottom) }
            if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { left = Math.max(left,b.left); right = Math.min(right,b.right) }
          }
          if (r.top < top - 2 || r.bottom > bottom + 2 || r.left < left - 2 || r.right > right + 2) failures.push({ text: el.textContent?.trim().slice(0,70), top:r.top,bottom:r.bottom,clip:[top,bottom,left,right] })
        }
        return { targets: targets.length, failures, overflowX: document.documentElement.scrollWidth > innerWidth }
      })
      results.push({ name, width, height, ...checks })
      if (checks.failures.length || (width === 320 && height === 400)) await page.screenshot({ path:path.join(output, `after-${name}-${width}-${height}.png`) })
      await page.close()
    }
  }))
  await writeFile(path.join(output,'report.json'), JSON.stringify({ synthetic:true, results },null,2))
  const failures = results.filter(r=>r.failures.length || r.overflowX)
  console.log(JSON.stringify({ cases:results.length, failed:failures.length, failures }))
  process.exitCode = failures.length ? 1 : 0
} finally { await browser.close() }
