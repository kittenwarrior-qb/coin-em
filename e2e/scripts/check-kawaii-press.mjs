import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const base='http://127.0.0.1:5183'
const refined=process.argv.includes('--refined')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-kawaii-press-'))
const browser=await chromium.launch(),checks=[]
try{
 for(const touch of [false,true])for(const reducedMotion of ['no-preference','reduce']){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:touch,isMobile:touch,reducedMotion})
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort())
  await page.goto(`${base}/candy-prototypes.html?screen=home&home=kawaii&brand=coin${refined?'&study=refined':''}`)
  await page.evaluate(()=>document.fonts.ready)
  const button=page.getByRole('button',{name:'Tạo phòng',exact:true})
  const b=await button.boundingBox()
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2)
  assert.equal(await button.evaluate(e=>getComputedStyle(e).transform),'none','Hover must not lift or resize the button')
  const sheen=await button.evaluate(e=>{const s=getComputedStyle(e,'::before');return{name:s.animationName,iterations:s.animationIterationCount}})
  if(reducedMotion==='reduce')assert.equal(sheen.name,'none')
  else if(!touch){assert.equal(sheen.name,'kw-button-sheen');assert.equal(sheen.iterations,'1')}
  await button.evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))})
  assert.equal(await button.evaluate(e=>getComputedStyle(e,'::before').opacity),'0','Highlight must settle instead of looping or remaining active')
  if(!touch){
   await page.mouse.down()
   await page.waitForFunction(reduced=>{
    const e=document.querySelector('.kw-home-actions>.kw-pink'),t=getComputedStyle(e).transform
    if(reduced)return t==='none'
    const m=new DOMMatrixReadOnly(t)
    return Math.abs(m.m42-1)<.01
   },reducedMotion==='reduce')
   const transform=await button.evaluate(e=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return{x:m.m11,y:m.m22,dx:m.m41,dy:m.m42}})
   assert.equal(transform.x,1);assert.equal(transform.y,1);assert.equal(transform.dx,0)
   assert.ok(transform.dy>=0&&transform.dy<=1.01,'Press is at most one pixel, never a bounce')
   await page.mouse.move(1,1);await page.mouse.up()
  }
  if(touch)await button.tap();else await button.click()
  await page.locator('dialog[open]').waitFor()
  if(touch)await page.getByRole('button',{name:'Đóng',exact:true}).tap();else await page.keyboard.press('Escape')
  await page.locator('dialog[open]').waitFor({state:'hidden'})
  assert.equal(await button.evaluate(e=>getComputedStyle(e).outlineStyle),'none','Pointer return must not look selected')
  await page.keyboard.press('Tab');await button.focus()
  assert.equal(await button.evaluate(e=>getComputedStyle(e).outlineWidth),'2px')
  await page.keyboard.press('Enter');await page.locator('dialog[open]').waitFor()
  await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'})
  assert.equal(await button.evaluate(e=>getComputedStyle(e).outlineWidth),'2px','Keyboard return must retain focus guidance')
  if(touch)await button.tap();else await button.click()
  await page.locator('dialog[open]').waitFor()
  await page.getByRole('button',{name:'Đóng',exact:true}).click()
  await page.locator('dialog[open]').waitFor({state:'hidden'})
  assert.equal(await button.evaluate(e=>getComputedStyle(e).outlineStyle),'none','Switching from keyboard to pointer must clear only the ring')
  assert.equal(await page.evaluate(()=>scrollY),0)
  if(refined){
   const menu=page.getByRole('button',{name:'Mở menu',exact:true})
   if(touch)await menu.tap();else await menu.click()
   await page.locator('.kw-menu').waitFor()
   if(touch)await page.getByRole('button',{name:'Đóng',exact:true}).tap();else await page.keyboard.press('Escape')
   await page.locator('dialog[open]').waitFor({state:'hidden'})
   assert.equal(await menu.evaluate(e=>getComputedStyle(e).outlineStyle),'none')
   await page.keyboard.press('Tab');await menu.focus()
   assert.equal(await menu.evaluate(e=>getComputedStyle(e).outlineWidth),'2px')
   await page.mouse.click(190,100)
  }
  if(!touch&&reducedMotion==='no-preference')await page.screenshot({path:path.join(output,'pointer-return.png'),animations:'disabled'})
  checks.push({touch,reducedMotion,passed:true})
  await page.close()
 }
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks},null,2))
console.log(JSON.stringify({output,checks},null,2))
