import { chromium } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const base = new URL(process.argv[2])
if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw Error('Owned loopback fixture required')
const baseline = process.argv.includes('--baseline')
const phases = process.argv.includes('--phases')
const phaseNames = ['role-reveal','night','healer-turn','silencer-turn','situation-card','emotion-card','story-telling','group-response','reflection-card','reflection-sharing','selfcare-card','hug-action','guess-silencer','reveal-silencer','give-coins','reward','ended']
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-viewport-scroll-'))
const browser = await chromium.launch()
const results = []
let active = {}
try {
  for (const theme of (process.argv.includes('--candy-only') ? ['candy-clouds'] : phases ? ['emotion-orbit','kindness-workshop','candy-clouds'] : ['emotion-orbit', 'kindness-workshop', 'candy-clouds', 'legacy'])) {
    for (const [width, height] of (phases ? [[320,400],[390,844],[1440,900]] : baseline ? [[390,844], [1440,900]] : [[320,400], [320,568], [390,844], [844,390], [1440,900]])) {
      const page = await browser.newPage({ viewport: { width, height } })
      await page.route('**/*', route => {
        const url = new URL(route.request().url())
        return url.origin === base.origin || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort()
      })
      for (const screen of (phases ? phaseNames.map(phase => `phase:${phase}`) : baseline ? ['lobby', 'menu'] : ['lobby', 'menu', 'create', 'join', 'waiting', 'history', 'give-picker', 'role-reward', 'night-confirm', 'card-preview', 'board', 'board-notice', 'admin'])) {
        active = { theme, width, height, screen }
        if (screen === 'admin') await page.route('**/admin/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rooms: [], analytics: { version: 'operational-analytics/v1', scope: 'this-process-since-start', persistent: false, http: { completed: 0, clientErrors: 0, serverErrors: 0, durationBuckets: [10,50,100,250,500,1000,5000,null].map(upperBoundMs => ({ upperBoundMs, count: 0 })) } } }) }))
        const url = screen === 'admin' ? `/admin?theme=${theme}` : screen.startsWith('phase:') ? `/qa-board.html?count=10&viewer=sender&phase=${screen.slice(6)}&theme=${theme}` : screen.startsWith('board') ? `/qa-board.html?count=10&phase=give-coins&theme=${theme}${screen === 'board-notice' ? '&notice=1' : ''}` : `/qa-screens.html?stress=1&screen=${['menu','create','join'].includes(screen) ? 'lobby' : screen}&theme=${theme}`
        await page.goto(new URL(url, base).href)
        if (screen === 'admin') await page.locator('.is-authenticated').waitFor()
        else await page.getByTestId(screen.startsWith('board') || phases ? 'qa-fixture' : 'screen-qa-fixture').waitFor()
        await page.evaluate(() => document.fonts.ready)
        if (screen === 'menu') await page.getByRole('button', { name: 'Cài đặt', exact: true }).click()
        if (screen === 'create' || screen === 'join') await page.getByTestId(`btn-${screen === 'create' ? 'create' : 'join'}-room`).click()
        await page.waitForTimeout(500)
        const checks = await page.evaluate(({ screen, height }) => {
          const root = document.scrollingElement
          const shell = document.querySelector('.screen-cartoon')
          const menu = document.querySelector('.theme-a-menu-panel')
          const failures = []
          if (root.scrollHeight > innerHeight + 1 || root.scrollWidth > innerWidth + 1) failures.push('document-overflow')
          const notice = document.querySelector('.game-viewport > [data-ui-chrome="transport"]')
          if (shell && Math.abs(shell.getBoundingClientRect().height + (notice?.getBoundingClientRect().height ?? 0) - innerHeight) > 1) failures.push('shell-not-viewport-height')
          if (menu && height >= 568 && menu.scrollHeight > menu.clientHeight + 1) failures.push('unnecessary-menu-scroll')
          const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(el => !el.closest('[inert],[aria-hidden="true"]'))
          for (const dialog of dialogs) {
            const r = dialog.getBoundingClientRect()
            if (r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1) failures.push('dialog-outside-viewport')
          }
          return { failures, root: [root.scrollWidth, root.scrollHeight], shellHeight: shell?.getBoundingClientRect().height,
            menu: menu ? [menu.clientHeight, menu.scrollHeight] : null, dialogs: dialogs.length, screen }
        }, { screen, height })
        if (['lobby','menu','board-notice'].includes(screen)) {
          await page.setViewportSize({width,height:Math.max(320,height-120)})
          const resizeOverflow = await page.evaluate(() => document.scrollingElement.scrollHeight > innerHeight+1 || document.scrollingElement.scrollWidth > innerWidth+1)
          if (resizeOverflow) checks.failures.push('overflow-after-viewport-resize')
          await page.setViewportSize({width,height})
        }
        const filename = `${theme}-${width}x${height}-${screen}.png`
        if (checks.failures.length || screen === 'menu' || screen === 'board') await page.screenshot({ path: path.join(output, filename) })
        results.push({ theme, width, height, ...checks, screenshot: filename })
      }
      await page.close()
    }
  }
} catch (error) { results.push({ ...active, failures: [error.message] }) }
finally { await browser.close() }
await writeFile(path.join(output, 'report.json'), JSON.stringify({ synthetic: true, results }, null, 2))
const failed = results.filter(result => result.failures.length)
console.log(JSON.stringify({ output, cases: results.length, failed: failed.length, failures: failed }))
process.exitCode = failed.length ? 1 : 0
