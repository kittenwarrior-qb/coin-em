import {chromium,expect} from '@playwright/test'
import {mkdtemp,writeFile,readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
if(base.origin!=='http://127.0.0.1:5183')throw Error('Owned local UI fixture only')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-kawaii-motion-'))
const browser=await chromium.launch(),results=[]
const cards=JSON.parse(await readFile(new URL('../../fe/src/test/fixtures/pdfCatalog.json',import.meta.url),'utf8')).filter(card=>!card.archived).map(card=>({...card,reviewed:true}))
const version=`catalog-${createHash('sha256').update(JSON.stringify(cards)).digest('hex')}`
try{
 for(const reducedMotion of ['no-preference','reduce'])for(const [width,height] of [[390,844],[568,320],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion}),page=await context.newPage(),errors=[]
  // Only public catalog HTTP is synthetic; the mounted components and PDF images are real.
  await page.route('**/api/catalog/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).pathname.endsWith('/active')?{version}:{version,cards})}))
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(new URL('/qa-screens.html?screen=lobby&theme=candy-clouds',base).href)
  const join=page.getByTestId('btn-join-room')
  await join.waitFor()
  for(const delay of [70,180,400]){
   await page.waitForTimeout(delay)
   expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2&&document.documentElement.scrollWidth<=innerWidth+2)).toBe(true)
  }
  await join.hover()
  await page.waitForTimeout(120)
  const hover=await join.evaluate(el=>({shine:getComputedStyle(el,'::after').animationName,opacity:Number(getComputedStyle(el,'::after').opacity),icon:getComputedStyle(el.querySelector('svg')).transform}))
  expect(hover.shine).toBe(reducedMotion==='reduce'?'none':'kawaii-button-sheen')
  if(reducedMotion==='reduce'){expect(hover.opacity).toBe(0);expect(hover.icon).toBe('none')}
  else{expect(hover.opacity).toBeGreaterThan(0);expect(hover.icon).not.toBe('none')}
  await page.waitForTimeout(500)
  expect(await join.evaluate(el=>Number(getComputedStyle(el,'::after').opacity))).toBe(0)
  await page.mouse.move(width-2,height-2)
  await page.getByRole('button',{name:'Cài đặt',exact:true}).click()
  const menu=page.getByRole('dialog',{name:'Menu',exact:true})
  await menu.waitFor()
  await page.waitForTimeout(360)
  const menuMotion=await menu.locator('.theme-a-menu-actions>.cartoon-control').evaluateAll(nodes=>nodes.map(el=>({animation:getComputedStyle(el).animationName,delay:getComputedStyle(el).animationDelay})))
  expect(menuMotion.length).toBeGreaterThanOrEqual(3)
  expect(menuMotion.every(row=>row.animation===(reducedMotion==='reduce'?'none':'kawaii-menu-reveal'))).toBe(true)
  if(reducedMotion!=='reduce')expect(menuMotion[1].delay).toBe('0.035s')
  if(width===390){
   await page.getByRole('button',{name:'Bộ thẻ',exact:true}).click()
   const catalog=page.getByRole('dialog',{name:'Bộ thẻ',exact:true})
   const first=catalog.getByTestId('inventory-scroll').locator('button').first()
   await first.waitFor();await page.waitForTimeout(400);await first.click()
   const fold=page.locator('[data-card-motion=fold]')
   await fold.waitFor();await page.waitForTimeout(450)
   expect(await fold.evaluate(el=>getComputedStyle(el).opacity)).toBe('1')
   const flipper=fold.locator(':scope>div').first()
   await flipper.click();await page.waitForTimeout(450)
   const turned=await flipper.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m11)
   expect(turned).toBeCloseTo(-1,2)
   await flipper.click();await page.waitForTimeout(450)
   expect(await flipper.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m11)).toBeCloseTo(1,2)
   await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Xem thẻ',exact:true}).waitFor({state:'detached'})
   await catalog.getByRole('button',{name:'Đóng',exact:true}).click();await catalog.waitFor({state:'detached'})
  }
  await page.getByRole('button',{name:'Đóng',exact:true}).click()
  await menu.waitFor({state:'detached'})
  await page.getByTestId('btn-create-room').click()
  const create=page.getByRole('dialog',{name:'Tạo phòng',exact:true})
  await create.waitFor();await page.waitForTimeout(400)
  expect(await create.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1})).toBe(true)
  expect(await create.getByRole('button',{name:'Tiếp tục',exact:true}).isDisabled()).toBe(true)
  await page.getByTestId('input-username-create').fill('QA chuyển động')
  await page.waitForTimeout(60)
  expect(await create.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m11)).toBeCloseTo(1,3)
  expect(errors).toEqual([])
  await page.screenshot({path:path.join(output,`${width}-${reducedMotion}.png`)})
  results.push({width,height,reducedMotion,hover,menuMotion,errors})
  await context.close()
 }
}finally{await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify(results,null,2))}
console.log(JSON.stringify({passed:results.length,output}))
