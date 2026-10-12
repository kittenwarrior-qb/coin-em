import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const base = process.argv[2]
if (!base?.startsWith('http://127.0.0.1:')) throw new Error('Local fixture URL required')
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/design/a1-scroll-qa')
await mkdir(output, { recursive:true })
const browser = await chromium.launch()
const results = []
try {
  for (const [name,url,selector] of [
    ['ended','/qa-board.html?phase=ended&count=10','[aria-label="Hành trình kết thúc"]'],
    ['waiting','/qa-screens.html?screen=waiting','.screen-panel'],
    ['history','/qa-screens.html?screen=history&stress=1','[data-testid="history-log-scroll"]'],
    ['inventory','/qa-screens.html','[data-testid="inventory-scroll"]'],
  ]) {
    const page = await browser.newPage({viewport:{width:320,height:400}})
    await page.goto(base+url)
    await page.waitForTimeout(1600)
    if (name === 'ended') await page.waitForFunction(() => {
      const panel = document.querySelector('[aria-label="Hành trình kết thúc"]')
      return panel && [...panel.children].every(el => Number(getComputedStyle(el).opacity) > .99)
    }, undefined, {timeout:15000})
    if (name === 'inventory') {
      await page.getByRole('button',{name:'Cài đặt',exact:true}).click()
      await page.getByRole('button',{name:'Bộ thẻ',exact:true}).click()
      await page.waitForTimeout(700)
    }
    const scroll = page.locator(selector)
    if (name === 'ended' && await scroll.evaluate(el=>el.scrollTop) > 1) throw new Error('Ending autofocus jumped past the heading')
    const box = await scroll.boundingBox()
    await page.mouse.move(box.x+box.width/2, Math.min(390,box.y+box.height/2))
    await page.mouse.wheel(0,-5000)
    await page.waitForTimeout(200)
    const top = await scroll.evaluate(el=>el.scrollTop)
    await page.screenshot({path:path.join(output,`gesture-${name}-top.png`)})
    await page.mouse.wheel(0,5000)
    await page.waitForTimeout(300)
    const bottom = await scroll.evaluate(el=>({top:el.scrollTop,max:el.scrollHeight-el.clientHeight}))
    await page.screenshot({path:path.join(output,`gesture-${name}-bottom.png`)})
    if (top > 1 || bottom.max <= 0 || Math.abs(bottom.top-bottom.max)>2) throw new Error(`${name}: ${JSON.stringify({top,bottom})}`)
    results.push({name,width:320,height:400,top,bottom})
    await page.close()
  }
  await writeFile(path.join(output,'gestures.json'),JSON.stringify({synthetic:true,physicalDevice:false,results},null,2))
  console.log(JSON.stringify({passed:true,cases:results.length}))
} finally { await browser.close() }
