import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-board-qa-'))
const server = spawn(process.execPath, [path.join(root, 'fe/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '0', '--clearScreen', 'false'],
  { cwd: path.join(root, 'fe'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
let browser
const results = []
try {
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Isolated Vite startup timed out')), 20000)
    let text = ''
    const receive = chunk => {
      text += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '')
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+\//)
      if (match) { clearTimeout(timeout); resolve(match[0]) }
    }
    server.stdout.on('data', receive); server.stderr.on('data', receive)
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Isolated Vite exited: ${code}`)) })
  })
  browser = await chromium.launch({ headless: true })
  for (const [width, height] of [[320, 568], [360, 640], [390, 844], [430, 932], [768, 1024], [1280, 720], [1440, 900], [844, 390], [390, 400]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}qa-board.html?count=10&phase=give-coins`, { waitUntil: 'networkidle' })
    await page.getByTestId('qa-fixture').waitFor()
    await page.getByTestId('btn-open-give-coin-picker').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.getByRole('button', { name: 'Đóng trao Coin' }).click()
    await page.getByTestId('give-coin-dialog').waitFor({ state: 'detached' })
    // Popup teardown traverses history asynchronously; do not open the next
    // popup until its same-route sentinel has been consumed.
    await page.waitForFunction(() => !history.state?.__emcoinPopup)
    const layout = await page.evaluate(() => {
      const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right } }
      const panel = document.getElementById('game-panel')
      const tokens = [...document.querySelectorAll('[data-player-avatar-id]')].map(element => box(element))
      const action = document.querySelector('[data-testid="btn-open-give-coin-picker"]')
      const scroll = document.querySelector('[data-testid="players-grid"]')
      const scrollBox = box(scroll)
      const reachable = r => r.x >= -1 && r.right <= innerWidth + 1 && r.y >= scrollBox.y - 1 && r.bottom <= scrollBox.y + scroll.scrollHeight + 1
      const overlap = tokens.some((a, i) => tokens.slice(i + 1).some(b => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y))
      return { panel: box(panel), tokens, action: box(action), overflowX: document.documentElement.scrollWidth > innerWidth,
        tenSlotsReachable: tokens.length === 10 && tokens.every(reachable), avatarOverlap: overlap,
        actionReachable: reachable(box(action)), centered: Math.abs(box(panel).x - (innerWidth - box(panel).width) / 2) <= 1,
        allTokensInViewport: tokens.every(r => r.x >= -1 && r.y >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1),
        actionInViewport: action.getBoundingClientRect().bottom <= innerHeight && action.getBoundingClientRect().top >= 0 }
    })
    await page.screenshot({ path: path.join(output, `${width}x${height}.png`) })
    let everySlotScrolledIntoView = true
    for (const token of await page.locator('[data-player-avatar-id]').all()) {
      await token.scrollIntoViewIfNeeded()
      const r = await token.boundingBox()
      const scroll = await page.getByTestId('players-grid').boundingBox()
      everySlotScrolledIntoView &&= r.y >= scroll.y - 1 && r.y + r.height <= scroll.y + scroll.height + 1
    }
    await page.getByTestId('btn-open-give-coin-picker').click()
    await page.getByTestId('give-coin-dialog').waitFor()
    await page.waitForTimeout(300)
    const modal = await page.getByTestId('give-coin-dialog').boundingBox()
    const dialogFits = modal.y >= -1 && modal.y + modal.height <= height + 1
    await page.getByTestId('give-coin-dialog-scroll').evaluate(element => { element.scrollTop = element.scrollHeight })
    const confirm = await page.getByRole('button', { name: 'Chọn người nhận', exact: true }).boundingBox()
    const confirmReachable = confirm.y >= 0 && confirm.y + confirm.height <= height + 1
    await page.screenshot({ path: path.join(output, `${width}x${height}-coin.png`) })
    await page.getByRole('button', { name: 'Đóng trao Coin' }).click()
    await page.getByTestId('give-coin-dialog').waitFor({ state: 'detached' })
    await page.waitForFunction(() => !history.state?.__emcoinPopup)
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.locator('[data-cartoon-badge="pill"]').waitFor()
    await page.waitForTimeout(300)
    const badgeAnchored = await page.locator('[data-cartoon-badge="pill"]').evaluate(badge => {
      const surface = badge.parentElement.getBoundingClientRect()
      const r = badge.getBoundingClientRect()
      return r.x > surface.x && r.right <= surface.right + 20 && r.y >= surface.y - 24 && r.bottom < surface.y + surface.height
    })
    await page.screenshot({ path: path.join(output, `${width}x${height}-menu.png`) })
    const menu = page.getByRole('dialog', { name: 'Menu', exact: true })
    const exit = menu.getByRole('button', { name: 'Thoát game', exact: true })
    await exit.scrollIntoViewIfNeeded()
    const exitBox = await exit.boundingBox()
    const menuBox = await menu.boundingBox()
    if (exitBox.y < menuBox.y || exitBox.y + exitBox.height > Math.min(height, menuBox.y + menuBox.height) + 1) throw new Error('Menu exit unreachable after scrolling')
    const closeBox = await menu.getByRole('button', { name: 'Đóng', exact: true }).boundingBox()
    if (closeBox.width < 44 || closeBox.height < 44) throw new Error('Menu close target too small')
    await page.screenshot({ path: path.join(output, `${width}x${height}-menu-footer.png`) })
    const themedControls = await page.locator('[data-control-theme="mint-blush"]').evaluateAll(buttons => buttons.map(button => {
      const image = button.querySelector('img')
      const pill = button.querySelector('[data-cartoon-surface="pill"]')
      return { src: image?.getAttribute('src'), decoded: Boolean(image?.complete && image.naturalWidth === (pill ? 260 : 100) && image.naturalHeight === (pill ? 99 : 100)), ink: getComputedStyle(button).color }
    }))
    if (!themedControls.length || themedControls.some(control => !control.decoded || !/^\/cartoon\/buttons\/themes\/(sky-pink-a1|mint-blush-(v2|a1|organic-v1))\//.test(control.src ?? '') || control.ink !== 'rgb(32, 85, 127)')) throw new Error('A controls missing, undecoded or wrong label ink')
    if (await page.locator('.cartoon-control[data-control-theme="legacy"]').count()) throw new Error('Unmigrated control in A menu')
    const tableImage = await page.locator('.game-table-surface').evaluate(table => table.style.backgroundImage)
    const backdropImage = await page.locator('#game-panel').evaluate(panel => panel.style.backgroundImage)
    if (!tableImage.includes('sky-pink-a1/table.webp') || !backdropImage.includes('sky-pink-a1/backdrop.webp')) throw new Error('Old table/backdrop still active')
    // Enter keyboard modality before asserting :focus-visible (mouse focus need not show it).
    await page.keyboard.press('Tab')
    const dialogControl = page.getByRole('dialog').locator('[data-control-theme="mint-blush"]').first()
    await dialogControl.focus()
    const focusColor = await dialogControl.evaluate(button => getComputedStyle(button).outlineColor)
    if (focusColor !== 'rgb(36, 95, 143)') throw new Error(`Unexpected theme focus: ${focusColor}`)
    await page.getByRole('button', { name: 'Hướng dẫn', exact: true }).click()
    const rules = page.getByTestId('coin-rules-guide')
    await rules.waitFor()
    await page.waitForFunction(() => {
      const article = document.querySelector('[data-testid="coin-rules-guide"]')
      const overlay = article?.closest('.fixed')
      return overlay && getComputedStyle(overlay).opacity === '1'
    })
    const guideFits = await rules.evaluate(element => {
      const r = element.getBoundingClientRect()
      return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1
    })
    await rules.evaluate(element => { element.scrollTop = element.scrollHeight })
    const completeRulesReachable = await rules.evaluate(element => {
      const viewport = element.getBoundingClientRect(), last = element.lastElementChild.getBoundingClientRect()
      return last.top >= viewport.top - 1 && last.bottom <= viewport.bottom + 1
    })
    await page.screenshot({ path: path.join(output, `${width}x${height}-rules.png`) })
    await page.getByRole('button', { name: 'Minh họa gốc' }).click()
    const originalTutorialPreserved = await page.locator('img[src="/tutorial/1.webp"]').count() === 1
    results.push({ width, height, ...layout, everySlotScrolledIntoView, dialogFits, confirmReachable, badgeAnchored, themedControls, tableImage, backdropImage, focusColor, guideFits, completeRulesReachable, originalTutorialPreserved, errors })
    await page.close()
  }
  const report = { version: 'board-shell-qa/v1', synthetic: true, browser: browser.version(), output,
    backendConnected: false, physicalDevice: false, results }
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  try { await access(path.join(root, 'fe/dist/qa-board.html')); throw new Error('QA entry leaked into production build') }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  console.log(JSON.stringify(report, null, 2))
  if (!process.argv.includes('--baseline') && results.some(row => row.overflowX || !row.tenSlotsReachable || !row.everySlotScrolledIntoView || row.avatarOverlap || !row.actionReachable || !row.centered || row.panel.width > 430 || !row.dialogFits || !row.confirmReachable || !row.badgeAnchored || !row.guideFits || !row.completeRulesReachable || !row.originalTutorialPreserved || row.errors.length)) process.exitCode = 1
} finally {
  await browser?.close()
  server.kill('SIGTERM') // Only the child this run created; no shared process/data cleanup.
}
