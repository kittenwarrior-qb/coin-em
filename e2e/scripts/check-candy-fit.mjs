import { chromium } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base = new URL(process.argv[2])
if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw Error('Owned loopback fixture required')
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-candy-fit-'))
const browser = await chromium.launch()
const results = []
try {
  for (const [width,height] of [[320,400],[320,568],[390,844],[430,932],[519,1100],[844,390],[1440,900]]) {
    const page = await browser.newPage({viewport:{width,height}})
    await page.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort())
    for (const scale of [1,1.5]) {
      await page.goto(new URL('/qa-screens.html?screen=lobby&theme=candy-clouds',base).href)
      await page.getByTestId('screen-qa-fixture').waitFor()
      await page.evaluate(() => document.fonts.ready)
      if (scale !== 1) await page.locator('.brand-home-action').evaluateAll((buttons,scale) => buttons.forEach(b=>b.style.fontSize=`${parseFloat(getComputedStyle(b).fontSize)*scale}px`),scale)
      const failures = await page.evaluate(() => {
        const failures=[]
        for (const b of document.querySelectorAll('.brand-home-action')) {
          const r=b.getBoundingClientRect()
          const children=[...b.children].map(e=>e.getBoundingClientRect())
          for (const c of children) if (c.left<r.left+12 || c.right>r.right-12 || c.top<r.top-1 || c.bottom>r.bottom+1) failures.push(`unsafe-content:${b.textContent}`)
          if (children[0].right>children[1].left-4 || children[1].right>children[2].left-4) failures.push(`overlap:${b.textContent}`)
        }
        return failures
      })
      results.push({width,height,screen:'home',scale,failures})
      if (scale===1 || failures.length) await page.screenshot({path:path.join(output,`home-${width}x${height}-${scale}.png`)})
    }
    for (const count of [6,10]) for (const phase of ['emotion-card','reflection-card']) {
      await page.goto(new URL(`/qa-board.html?count=${count}&phase=${phase}&theme=candy-clouds`,base).href)
      await page.getByTestId('qa-fixture').waitFor()
      await page.waitForTimeout(800)
      const failures=await page.evaluate(()=>{
        const area=document.querySelector('[data-ui-chrome="table-card-area"]').getBoundingClientRect()
        const failures=[]
        for(const slot of document.querySelectorAll('[data-ui-card-size]')){
          const r=slot.getBoundingClientRect()
          if(r.left<area.left-1||r.right>area.right+1||r.top<area.top-1||r.bottom>area.bottom+1) failures.push('card-slot-clipped')
        }
        for (const side of document.querySelectorAll('.game-player-side')) {
          const tokens=[...side.querySelectorAll('.brand-player-token')].map(e=>e.getBoundingClientRect())
          for(let i=1;i<tokens.length;i++) if(tokens[i].top<tokens[i-1].bottom-1) failures.push('player-token-overlap')
        }
        if(document.scrollingElement.scrollWidth>innerWidth+1||document.scrollingElement.scrollHeight>innerHeight+1) failures.push('document-overflow')
        return failures
      })
      results.push({width,height,screen:phase,count,failures})
      if(width===390||failures.length)await page.screenshot({path:path.join(output,`board-${count}-${phase}-${width}x${height}.png`)})
    }
    await page.close()
  }
} finally {await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({synthetic:true,results},null,2))
const failures=results.filter(r=>r.failures.length)
console.log(JSON.stringify({output,cases:results.length,failures}))
process.exitCode=failures.length?1:0
