import { chromium } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const base = new URL(process.argv[2])
if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw Error('Owned loopback fixture required')
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-overlay-reach-'))
const browser = await chromium.launch()
const results = []
let active = {}
try {
  for (const theme of (process.argv.includes('--candy-only') ? ['candy-clouds'] : ['emotion-orbit', 'kindness-workshop', 'candy-clouds'])) {
    for (const [width,height] of [[320,400], [390,844], [844,390]]) {
      const page = await browser.newPage({ viewport: { width,height } })
      await page.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort())
      for (const screen of ['menu','create','join','guide','history','give-picker','role-reward','ntg-reward','guess-picker','night-confirm','phase-confirm','muted','reflection-confirm','card-preview']) {
        active = {theme,width,height,screen}
        const home = ['menu','create','join','guide'].includes(screen)
        await page.goto(new URL(`/qa-screens.html?stress=1&screen=${home ? 'lobby' : screen}&theme=${theme}`,base).href)
        await page.getByTestId('screen-qa-fixture').waitFor()
        await page.evaluate(() => document.fonts.ready)
        if (screen === 'menu') await page.getByRole('button',{name:'Cài đặt',exact:true}).click()
        if (['create','join'].includes(screen)) await page.getByTestId(`btn-${screen}-room`).click()
        if (screen === 'guide') await page.getByRole('button',{name:'Hướng dẫn',exact:true}).click()
        await page.waitForTimeout(600)
        const checked = await page.evaluate(async () => {
          const failures = [], scrolls = new Set()
          const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(el => !el.closest('[inert],[aria-hidden="true"]'))
          let buttons = 0
          for (const dialog of dialogs) for (const el of dialog.querySelectorAll('button,input,select,textarea')) {
            const first = el.getBoundingClientRect()
            if (!first.width || !first.height || getComputedStyle(el).visibility === 'hidden') continue
            buttons++
            for (let p = el.parentElement; p; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) {
              const r = el.getBoundingClientRect(), b = p.getBoundingClientRect()
              p.scrollTop += r.top - b.top - Math.max(0,(p.clientHeight-r.height)/2)
              if (p.scrollHeight > p.clientHeight + 1) scrolls.add(p)
            }
            await new Promise(resolve => requestAnimationFrame(resolve))
            const r = el.getBoundingClientRect()
            let top=0,bottom=innerHeight,left=0,right=innerWidth
            for (let p=el.parentElement;p;p=p.parentElement) {
              const s=getComputedStyle(p),b=p.getBoundingClientRect()
              if (/(auto|scroll|hidden|clip)/.test(s.overflowY)) { top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom) }
              if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { left=Math.max(left,b.left);right=Math.min(right,b.right) }
            }
            if (r.top<top-2 || r.bottom>bottom+2 || r.left<left-2 || r.right>right+2) failures.push({text:el.getAttribute('aria-label')||el.textContent?.trim().slice(0,60),rect:[r.top,r.bottom,r.left,r.right],clip:[top,bottom,left,right]})
          }
          return {buttons,dialogs:dialogs.length,scrollRegions:scrolls.size,failures}
        })
        results.push({...active,...checked})
        if (checked.failures.length) await page.screenshot({path:path.join(output,`${theme}-${width}x${height}-${screen}.png`)})
      }
      await page.close()
    }
  }
} catch(error) { results.push({...active,failures:[error.message]}) }
finally {await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({synthetic:true,results},null,2))
const failures=results.filter(result=>result.failures.length)
console.log(JSON.stringify({output,cases:results.length,failed:failures.length,failures}))
process.exitCode=failures.length?1:0
