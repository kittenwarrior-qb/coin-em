import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const output = 'docs/design/prototype-refinement-qa'
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
  for (const theme of ['emotion-orbit', 'kindness-workshop']) for (const [width, height] of [[320,400],[430,660],[430,932]]) {
    for (const screen of ['menu','board-6','board-10','give-picker']) {
      const page = await browser.newPage({ viewport: { width, height } })
      const errors = []; page.on('pageerror', e => errors.push(e.message))
      const board = screen.startsWith('board-')
      await page.goto('http://127.0.0.1:5173/' + (board ? `qa-board.html?phase=give-coins&viewer=healer&count=${screen.slice(6)}` : `qa-screens.html?screen=${screen === 'menu' ? 'lobby' : screen}`) + '&theme=' + theme)
      await page.waitForFunction(t => document.documentElement.dataset.uiTheme === t, theme)
      await page.evaluate(() => document.fonts.ready)
      if (board) await page.getByRole('button', { name: 'Đóng trao Coin', exact: true }).click()
      if (screen === 'menu') await page.getByRole('button', { name: 'Cài đặt', exact: true }).click()
      if (screen === 'give-picker') await page.getByRole('button', { name: 'QA người 2', exact: true }).click()
      await page.waitForTimeout(800)
      await page.waitForFunction(() => [...document.images].every(img => !img.getAttribute('src') || img.complete), undefined, { timeout: 15000 })
      const issues = await page.evaluate(() => {
        const issues = []
        if (document.documentElement.scrollWidth > innerWidth) issues.push('horizontal overflow')
        for (const img of document.images) if (img.getAttribute('src') && !img.naturalWidth) issues.push('broken image: ' + img.src)
        if (document.querySelector('.game-shell')) {
          const bg = getComputedStyle(document.querySelector('.game-shell')).backgroundImage
          if (!bg.includes('board-backdrop-v1')) issues.push('Home background still used in gameplay')
          if (document.querySelectorAll('.brand-player-name').length !== document.querySelectorAll('[data-player-token-id]').length) issues.push('missing player name treatment')
          if (document.querySelectorAll('[data-ui-chrome="avatar-frame"]').length !== document.querySelectorAll('[data-player-token-id]').length) issues.push('missing player rim')
          if (document.querySelectorAll('.brand-coin-wallet [data-ui-coin-icon]').length !== 3) issues.push('missing theme wallet icons')
        }
        return issues
      })
      // Scroll to reach every dialog action, checking the real scroll containers.
      for (const button of await page.locator('[role="dialog"] button').all()) {
        await button.scrollIntoViewIfNeeded()
        const box = await button.boundingBox()
        if (box && (box.x < -2 || box.x + box.width > width + 2 || box.y < -2 || box.y + box.height > height + 2)) issues.push('unreachable dialog action: ' + await button.textContent())
      }
      await page.evaluate(() => document.querySelectorAll('[role="dialog"], [role="dialog"] *').forEach(el => { if (el.scrollHeight > el.clientHeight) el.scrollTop = 0 }))
      if (width === 430 && height === 932) {
        await page.screenshot({ path: `${output}/${theme}-${screen}.png` })
        if (screen === 'board-10') {
          await page.locator('[data-player-token-id]').last().scrollIntoViewIfNeeded()
          await page.screenshot({ path: `${output}/${theme}-board-10-bottom.png` })
        }
      }
      results.push({ theme, width, height, screen, issues, errors }); await page.close()
    }
  }
} finally { await browser.close() }
const failures = results.filter(r => r.issues.length || r.errors.length)
await writeFile(`${output}/report.json`, JSON.stringify({ synthetic: true, cases: results.length, failures, results }, null, 2))
console.log(JSON.stringify({ cases: results.length, failures }))
process.exitCode = failures.length ? 1 : 0
