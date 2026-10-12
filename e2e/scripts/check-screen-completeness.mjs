import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Local QA URL required')
const output = path.resolve('docs/design/screen-completeness-qa')
await mkdir(output, { recursive: true })
const fixtureScreens = ['night-confirm','phase-confirm','muted','reflection-confirm','success-toast','card-preview','give-picker']
const interactions = ['support','profile','quit','guide-art', 'inventory-situation','inventory-emotion','inventory-reflection','inventory-selfcare','inventory-preview']
const routes = ['about','about/cards','about/story', ...(process.argv.includes('--without-3d') ? [] : ['cards']), 'admin']
const cases = []
const publicOnly = process.argv.includes('--public-only')
for (const theme of ['emotion-orbit','kindness-workshop'])
  for (const [width,height] of [[320,400],[430,932],[1280,900]])
    for (const screen of publicOnly ? routes : [...fixtureScreens,...interactions,...routes]) cases.push({theme,width,height,screen})
const browser = await chromium.launch()
const results = []
let cursor = 0
try {
  await Promise.all(Array.from({length:3}, async () => {
    while (cursor < cases.length) {
      const item = cases[cursor++]
      const page = await browser.newPage({viewport:{width:item.width,height:item.height}})
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      try {
        // A full-page image must show off-screen content too. Use the app's real
        // reduced-motion preference, rather than deleting reveal styles for QA.
        if (routes.includes(item.screen)) await page.emulateMedia({reducedMotion:'reduce'})
        // Read-only login presentation: no real admin credentials or privileged data.
        if (item.screen === 'admin') await page.route('**/admin/api/**', route => route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'QA login required'})}))
        const fixture = ['profile','quit'].includes(item.screen) ? 'waiting' : fixtureScreens.includes(item.screen) ? item.screen : 'lobby'
        await page.goto(`${base}${routes.includes(item.screen) ? '/' + item.screen + '?theme=' : '/qa-screens.html?screen=' + fixture + '&theme='}${item.theme}`)
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(700)
        if (item.screen === 'profile') await page.locator('[data-testid="waiting-player-QA người 1"]').click()
        if (item.screen === 'quit') await page.getByTestId('btn-leave-room').click()
        if (item.screen === 'guide-art') {
          await page.getByRole('button',{name:'Hướng dẫn',exact:true}).click()
          await page.getByRole('button',{name:'Minh họa gốc',exact:true}).click()
        }
        if (item.screen === 'support' || item.screen.startsWith('inventory-')) {
          await page.getByRole('button',{name:'Cài đặt',exact:true}).click()
          await page.getByRole('button',{name:item.screen === 'support' ? 'Hỗ trợ' : 'Bộ thẻ',exact:true}).click()
          const tab = {'inventory-situation':'Tình huống','inventory-emotion':'Cảm xúc','inventory-reflection':'Phản tư','inventory-selfcare':'Bí kíp'}[item.screen]
          if (tab) await page.getByRole('button',{name:tab,exact:true}).click()
          if (item.screen === 'inventory-preview') await page.locator('[data-testid="inventory-scroll"] button').first().click()
        }
        await page.waitForTimeout(500)
        if (routes.includes(item.screen)) {
          // Trigger real intersection/lazy-image behavior before a full-page capture.
          const height = await page.evaluate(() => document.documentElement.scrollHeight)
          for (let y=0;y<height;y+=item.height*.75) { await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(100) }
          await page.waitForTimeout(800)
          await page.evaluate(() => window.scrollTo(0,0))
        }
        // Capture loaded images, not the blank slots from an arbitrary short delay.
        await page.waitForFunction(() => [...document.images].filter(i => i.getAttribute('src') && i.loading !== 'lazy').every(i => i.complete), null, {timeout:20000})
        const state = await page.evaluate(async () => {
          const failures = []
          const dialog = [...document.querySelectorAll('[role="dialog"]')].at(-1)
          for (const control of dialog?.querySelectorAll('button,input') ?? []) {
            if (!control.getBoundingClientRect().width) continue
            control.scrollIntoView({block:'nearest'})
            await new Promise(resolve => requestAnimationFrame(resolve))
            const r = control.getBoundingClientRect()
            let upper=0,lower=innerHeight
            for (let p=control.parentElement;p;p=p.parentElement) if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowY)) {
              const b=p.getBoundingClientRect(); upper=Math.max(upper,b.top); lower=Math.min(lower,b.bottom)
            }
            if (r.top < upper-2 || r.bottom > lower+2) failures.push(control.getAttribute('aria-label') || control.textContent.trim())
          }
          document.querySelectorAll('[role="dialog"], [role="dialog"] *').forEach(el => { if(el.scrollHeight>el.clientHeight)el.scrollTop=0 })
          window.scrollTo(0,0)
          return {unreachable:failures,overflowX:document.documentElement.scrollWidth>innerWidth,
            brokenImages:[...document.images].filter(i=>i.getAttribute('src')&&i.complete&&!i.naturalWidth).map(i=>i.src)}
        })
        if (item.width === 430) await page.screenshot({path:path.join(output,`${item.theme}-${item.screen.replaceAll('/','-')}.png`),fullPage:routes.includes(item.screen)})
        results.push({...item,...state,errors})
      } catch(error) { results.push({...item,errors:[...errors,error.message]}) }
      finally {await page.close()}
    }
  }))
} finally {await browser.close()}
const failures=results.filter(r=>r.errors.length||r.overflowX||r.brokenImages?.length||r.unreachable?.length)
await writeFile(path.join(output,publicOnly ? 'public-report.json' : 'report.json'),JSON.stringify({synthetic:true,backendConnected:false,admin:'mocked 401 login only',cases:results.length,failures,results},null,2))
console.log(JSON.stringify({cases:results.length,failures}))
process.exitCode=failures.length?1:0
