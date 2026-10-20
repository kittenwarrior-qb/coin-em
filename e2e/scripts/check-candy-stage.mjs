import { chromium } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base = new URL(process.argv[2])
if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw Error('Owned loopback fixture required')
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-candy-stage-'))
const browser = await chromium.launch()
const results=[]
try {
  for(const [width,height] of [[390,844],[320,568],[844,390]]) for(const count of [6,10]) {
    const page=await browser.newPage({viewport:{width,height}})
    await page.route('**/*',r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort())
    let reference=null
    for(const phase of ['night','emotion-card','reflection-card','story-telling','hug-action','give-coins','reward']) {
      await page.goto(new URL(`/qa-board.html?count=${count}&phase=${phase}&theme=candy-clouds`,base).href)
      await page.getByTestId('candy-stage-scroll').waitFor()
      await page.evaluate(()=>document.fonts.ready)
      await page.waitForTimeout(300)
      const state=await page.evaluate(()=>{
        const stage=document.querySelector('.candy-stage-scroll'),header=document.querySelector('.brand-board-heading')
        const h=header.getBoundingClientRect(),s=stage.getBoundingClientRect()
        const initialHeader=h.top
        stage.scrollTop=stage.scrollHeight
        const last=[...stage.querySelectorAll('[data-player-token-id]')].at(-1)
        const l=last.getBoundingClientRect()
        const failures=[]
        if(stage.scrollWidth>stage.clientWidth+1) failures.push('stage-horizontal-overflow')
        for(const token of stage.querySelectorAll('[data-player-token-id]')) {
          const r=token.getBoundingClientRect()
          if(r.left<s.left-1||r.right>s.right+1)failures.push('seat-outside-stage-width')
        }
        if(l.top<s.top-1||l.bottom>s.bottom+1) failures.push('last-seat-unreachable')
        if(Math.abs(header.getBoundingClientRect().top-initialHeader)>1) failures.push('header-moved')
        if(document.querySelector('.game-board-scroll').scrollTop!==0) failures.push('outer-scrolled')
        if(document.scrollingElement.scrollHeight>innerHeight+1||document.scrollingElement.scrollWidth>innerWidth+1) failures.push('document-overflow')
        const excess=stage.scrollHeight-stage.clientHeight
        stage.scrollTop=0
        return {header:[h.top,h.height],stage:[s.top,s.height],excess,failures}
      })
      const layout=[...state.header,...state.stage]
      if(reference&&layout.some((v,i)=>Math.abs(v-reference[i])>1))state.failures.push('phase-layout-jump')
      reference=layout
      if(height===844&&state.excess>1)state.failures.push('unnecessary-stage-scroll')
      if(phase==='reflection-card') {
        const box=await page.locator('.candy-stage-scroll').boundingBox()
        await page.mouse.move(box.x+box.width-8,box.y+box.height/2)
        await page.mouse.wheel(0,2000)
        await page.waitForTimeout(180)
        const wheel=await page.evaluate(()=>({stage:document.querySelector('.candy-stage-scroll').scrollTop,outer:document.querySelector('.game-board-scroll').scrollTop,header:document.querySelector('.brand-board-heading').getBoundingClientRect().top,doc:document.scrollingElement.scrollTop}))
        if(state.excess>1&&wheel.stage===0)state.failures.push('wheel-not-reaching-stage')
        if(wheel.outer||wheel.doc||Math.abs(wheel.header-state.header[0])>1)state.failures.push('wheel-moved-shell')
        await page.mouse.wheel(0,-2000)
        await page.waitForTimeout(180)
        await page.screenshot({path:path.join(output,`${count}-${width}x${height}.png`)})
      }
      results.push({width,height,count,phase,...state})
    }
    await page.close()
  }
} finally {await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({synthetic:true,results},null,2))
const failures=results.filter(r=>r.failures.length)
console.log(JSON.stringify({output,cases:results.length,failures}))
process.exitCode=failures.length?1:0
