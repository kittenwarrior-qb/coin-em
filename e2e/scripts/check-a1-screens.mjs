import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Local fixture URL required')
const output = path.join(root, 'docs/design/a1-screen-qa')
await mkdir(output, { recursive: true })
const phases = ['role-reveal', 'night', 'healer-turn', 'silencer-turn', 'situation-card', 'emotion-card', 'story-telling', 'group-response', 'reflection-card', 'reflection-sharing', 'selfcare-card', 'hug-action', 'guess-silencer', 'reveal-silencer', 'give-coins', 'reward', 'ended']
const cases = []
for (const [width, height] of [[320, 568], [430, 932], [1280, 900]]) {
  for (const phase of phases) for (const viewer of ['narrator', 'sender']) cases.push({ name: `${phase}-${viewer}`, width, height, url: `/qa-board.html?phase=${phase}&count=10&viewer=${viewer}`, fixture: 'qa-fixture' })
  for (const screen of ['loading', 'lobby', 'waiting', 'history']) cases.push({ name: screen, width, height, url: `/qa-screens.html?screen=${screen}`, fixture: 'screen-qa-fixture' })
  for (const [screen, action, label] of [['lobby', 'btn-create-room', 'Tạo phòng'], ['lobby', 'btn-join-room', 'Tham gia'], ['lobby', 'lobby-menu', 'Menu'], ['waiting', 'waiting-player-QA người 1', 'Thông tin'], ['waiting', 'btn-leave-room', 'Thoát']]) cases.push({ name: `${screen}-${action}`, width, height, url: `/qa-screens.html?screen=${screen}`, fixture: 'screen-qa-fixture', action, label })
  for (const viewer of ['narrator', 'sender']) cases.push({ name: `offline-${viewer}`, width, height, url: `/qa-board.html?phase=give-coins&count=10&viewer=${viewer}&offline=1`, fixture: 'qa-fixture' })
}
const browser = await chromium.launch({ headless: true })
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
        await page.goto(base + item.url, { waitUntil: 'domcontentloaded' })
        await page.getByTestId(item.fixture).waitFor()
        await page.evaluate(() => document.fonts.ready)
        if (item.action) {
          await page.getByTestId(item.action).click()
          await page.getByRole('dialog').waitFor()
        }
        await page.waitForTimeout(450)
        if (item.name.startsWith('role-reveal')) {
          await page.waitForFunction(() => {
            const panel = document.querySelector('[aria-label="Vai trò của bạn"]')
            if (!panel) return true // Narrator may not have a private role panel.
            const face = [...panel.querySelectorAll('img')].find(img => img.alt.endsWith(' - back'))
            if (!face?.complete || !face.naturalWidth) return false
            const transform = getComputedStyle(face.parentElement.parentElement).transform
            return transform !== 'none' && new DOMMatrixReadOnly(transform).m11 < -0.999
          }, undefined, { timeout: 12000 })
        }
        const state = await page.evaluate(() => ({
          theme: document.documentElement.dataset.uiTheme,
          overflow: document.documentElement.scrollWidth > innerWidth,
          legacy: [...document.querySelectorAll('[data-control-theme="legacy"]')].length,
          panels: [...document.querySelectorAll('[data-ui-panel="a1"]')].map(el => ({ label: el.getAttribute('aria-label'), background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderColor })),
        }))
        if (state.theme !== 'mint-blush' || state.overflow || state.legacy || errors.length) throw new Error(JSON.stringify({ ...item, ...state, errors }))
        const finishing = await page.evaluate(() => ({
          staleInk: [...document.querySelectorAll('[data-ui-ink="primary"]')].some(el => getComputedStyle(el).color !== 'rgb(32, 85, 127)'),
          flatBadge: [...document.querySelectorAll('[data-ui-badge], [data-ui-pill], .cartoon-pill-badge')].some(el => !getComputedStyle(el).borderImageSource.includes('/pill-')),
          flatRoom: [...document.querySelectorAll('[data-ui-surface="room"]')].some(el => !getComputedStyle(el).borderImageSource.includes('/pill-')),
        }))
        if (Object.values(finishing).some(Boolean)) throw new Error(`Incomplete A1 chrome ${item.name}: ${JSON.stringify(finishing)}`)
        const stale = await page.locator('[data-ui-chrome="header"] .text-white, [data-ui-chrome="header"] .text-white\\/70, [data-ui-chrome="role-label"]').evaluateAll(nodes => nodes.some(el => getComputedStyle(el).color !== 'rgb(32, 85, 127)'))
        if (stale) throw new Error(`Unreadable old heading ink: ${item.name}`)
        const nativeCircles = await page.locator('[data-ui-chrome="phase-nav"] > button, button[data-ui-chrome="circle"]').evaluateAll(nodes => nodes.map(el => getComputedStyle(el).backgroundImage))
        if (nativeCircles.some(image => !image.includes('sky-pink-a1/circle-sky.png'))) throw new Error(`Unskinned native circle: ${item.name}`)
        if (item.width === 430) await page.screenshot({ path: path.join(output, `${item.name}.png`) })
        results.push({ ...item, ...state, errors })
      } finally { await page.close() }
    }
  }))
  results.sort((a,b) => a.name.localeCompare(b.name) || a.width - b.width)
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ synthetic: true, backendConnected: false, browser: browser.version(), cases: results.length, results }, null, 2))
  console.log(JSON.stringify({ passed: true, output, cases: results.length }))
} finally { await browser.close() }
