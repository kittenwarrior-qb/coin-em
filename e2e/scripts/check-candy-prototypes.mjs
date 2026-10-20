import { chromium } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base = new URL(process.argv[2] || 'http://127.0.0.1:5183')
if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw Error('Loopback only')
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-ab-prototypes-'))
const browser = await chromium.launch()
const failures = [], checks = []
try {
  for (const [width,height] of [[390,844],[320,568],[844,390],[1440,900]]) for (const layout of ['A','B']) for (const count of [6,10]) {
    const page = await browser.newPage({viewport:{width,height}})
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.route('**/*',r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort())
    await page.goto(new URL(`/candy-prototypes.html?layout=${layout}&count=${count}&phase=reflection-card`,base).href)
    await page.locator('.cp-card').first().waitFor()
    await page.evaluate(()=>document.fonts.ready)
    for (let step=0;step<17;step++) {
      if (width>650 && height>500) await page.locator('.cp-tools select').last().selectOption(String(step))
      else {
        await page.locator('.cp-mobile-layout').click()
        await page.getByLabel('Bước mô phỏng').selectOption(String(step))
        await page.getByRole('button',{name:'Đóng',exact:true}).click()
      }
      const state = await page.evaluate(()=>{
        const root=document.documentElement, stage=document.querySelector('.cp-scroll'), phone=document.querySelector('.cp-phone'),dock=document.querySelector('.cp-dock')
        const bounds=phone.getBoundingClientRect(),d=dock.getBoundingClientRect()
        const last=stage.querySelector('.cp-bottom-player .cp-player')||[...stage.querySelectorAll('.cp-player')].at(-1)
        stage.scrollTop=stage.scrollHeight
        const lastBounds=last.getBoundingClientRect(),s=stage.getBoundingClientRect()
        const reachable=lastBounds.bottom<=s.bottom+1&&lastBounds.top>=s.top-1
        const excess=stage.scrollHeight-stage.clientHeight
        stage.scrollTop=0
        return {overflow:root.scrollHeight>innerHeight+1||root.scrollWidth>innerWidth+1, horizontal:stage.scrollWidth>stage.clientWidth+1, players:document.querySelectorAll('.cp-scroll .cp-player').length, reachable, excess, dockOutside:d.bottom>bounds.bottom+1, height:innerHeight}
      })
      if(state.overflow||state.horizontal||state.players!==count||state.dockOutside||!state.reachable) failures.push({width,height,layout,count,step,state})
      checks.push({width,height,layout,count,step,...state})
    }
    // Cards and selection survive an in-board layout change; dialog closes with Escape.
    const fixedBefore=await page.evaluate(()=>({heading:document.querySelector('.cp-heading').getBoundingClientRect().top,dock:document.querySelector('.cp-dock').getBoundingClientRect().top}))
    const bounds=await page.locator('.cp-scroll').boundingBox()
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2)
    await page.mouse.wheel(0,10000)
    await page.waitForTimeout(150)
    const fixedAfter=await page.evaluate(()=>({heading:document.querySelector('.cp-heading').getBoundingClientRect().top,dock:document.querySelector('.cp-dock').getBoundingClientRect().top,rootScroll:document.scrollingElement.scrollTop}))
    if(fixedAfter.rootScroll||Math.abs(fixedBefore.heading-fixedAfter.heading)>1||Math.abs(fixedBefore.dock-fixedAfter.dock)>1)failures.push({width,height,layout,count,reason:'wheel moved shell',fixedBefore,fixedAfter})
    await page.mouse.wheel(0,-10000)
    await page.waitForTimeout(150)
    await page.locator('.cp-dock .cp-action.outline').click() // ended -> reward
    if(width>650 && height>500) await page.locator('.cp-tools select').last().selectOption('8')
    else {await page.locator('.cp-mobile-layout').click();await page.getByLabel('Bước mô phỏng').selectOption('8');await page.keyboard.press('Escape')}
    await page.locator('.cp-card').first().click()
    await page.getByRole('button',{name:'Chọn thẻ mẫu',exact:true}).click()
    await page.locator('.cp-mobile-layout').click()
    await page.locator('.cp-settings-choice').nth(layout==='A'?1:0).click()
    await page.keyboard.press('Escape')
    if(await page.locator('.cp-card.selected').count()!==1) failures.push({width,height,layout,count,reason:'selection lost on switch'})
    // Restore desired layout for screenshot.
    await page.locator('.cp-mobile-layout').click()
    await page.locator('.cp-settings-choice').nth(layout==='A'?0:1).click()
    await page.keyboard.press('Escape')
    const broken=await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));document.activeElement?.blur();return [...document.images].filter(img=>!img.naturalWidth).map(img=>img.src)})
    if(broken.length) failures.push({width,height,layout,count,broken})
    await page.screenshot({path:path.join(output,`${layout}-${count}-${width}x${height}.png`)})
    if(errors.length) failures.push({width,height,layout,count,errors})
    await page.close()
  }
  // Coin simulation: balance, journal, zero-balance guard; settings persistence; home/waiting.
  const page=await browser.newPage({viewport:{width:390,height:844}})
  await page.goto(new URL('/candy-prototypes.html?layout=B&phase=give-coins',base).href)
  await page.getByRole('button',{name:'Tặng Coin',exact:true}).click()
  await page.getByRole('button',{name:'Xác nhận mẫu',exact:true}).click()
  if(await page.locator('.cp-wallet b').first().textContent()!=='1') failures.push({reason:'coin balance'})
  await page.getByRole('button',{name:'Nhật ký',exact:true}).click()
  if(!await page.locator('.cp-dialog').getByText('Tặng mẫu 1 Coin Xanh cho Người 2').count()) failures.push({reason:'journal'})
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'Tặng Coin',exact:true}).click()
  await page.locator('.cp-coin-options button').nth(2).click()
  if(!await page.getByRole('button',{name:'Xác nhận mẫu',exact:true}).isDisabled()) failures.push({reason:'zero balance guard'})
  await page.keyboard.press('Escape')
  for(const screen of ['home','waiting']) {
    await page.goto(new URL(`/candy-prototypes.html?screen=${screen}`,base).href)
    await page.screenshot({path:path.join(output,`${screen}-390x844.png`)})
  }
  await page.close()
} finally {await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks,failures},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures},null,2))
if(failures.length) process.exitCode=1
