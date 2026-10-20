import {chromium} from '@playwright/test'
import {mkdtemp,writeFile} from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
const crafted=process.argv.includes('--crafted')
const refined=process.argv.includes('--refined')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback only')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-kawaii-pair-'))
const browser=await chromium.launch(),checks=[],failures=[]
async function audit(page,label){
 const problems=await page.evaluate(()=>{
  const found=[]
  for(const e of [document.documentElement,document.body,...document.querySelectorAll('.cp-phone,.kw-home,.kw-home-core,.kw-home-actions,dialog[open],dialog[open] .cp-dialog-body,.kw-menu')]){
   if(e.clientHeight&&(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2))found.push({element:e.className,size:[e.clientWidth,e.clientHeight],scroll:[e.scrollWidth,e.scrollHeight]})
  }
  const root=document.querySelector('dialog[open]')||document.querySelector('.cp-phone'),r=root.getBoundingClientRect()
  for(const e of root.querySelectorAll('button,input,select')){const b=e.getBoundingClientRect();if(b.width&&b.height&&(b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1))found.push({button:e.textContent,bounds:[b.x,b.y,b.width,b.height]})}
  for(const button of root.querySelectorAll('.kw-button')){
   const b=button.getBoundingClientRect(),label=button.querySelector('.kw-button-label'),icon=button.querySelector('.kw-button-icon'),l=label.getBoundingClientRect(),i=icon.getBoundingClientRect(),svg=icon.querySelector('svg')
   if(Math.abs((l.left+l.right-b.left-b.right)/2)>1)found.push({button:label.textContent,error:'Label off button centreline'})
   if(l.left<i.right&&l.right>i.left&&l.top<i.bottom&&l.bottom>i.top)found.push({button:label.textContent,error:'Icon overlaps label'})
   if(label.scrollWidth>label.clientWidth+1)found.push({button:label.textContent,error:'Label does not fit'})
   if(!svg.classList.contains('kw-action-icon')||svg.getAttribute('viewBox')!=='0 0 24 24'||getComputedStyle(svg).strokeWidth!=='2px')found.push({button:label.textContent,error:'Inconsistent icon system'})
  }
  return found
 })
 checks.push(label);if(problems.length)failures.push({label,problems})
}
async function capture(page,name){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.activeElement?.blur()});await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'})}
async function iconFeedback(page,scope){
 await page.keyboard.press('Tab')
 for(const button of await page.locator(`${scope}>.kw-button`).all()){
  await button.focus()
  const names=await button.locator('.kw-action-icon,.kw-icon-detail').evaluateAll(elements=>elements.map(e=>getComputedStyle(e).animationName))
  assert.equal(names.some(name=>name!=='none'),false,'Icons must not bounce, rotate or animate on focus')
  assert.equal(await button.evaluate(e=>getComputedStyle(e).outlineWidth),'2px','Keyboard focus must remain visible')
 }
 await page.evaluate(()=>document.activeElement?.blur())
}
try{
 for(const brand of (crafted||refined?['coin']:['coin','type']))for(const [width,height]of [[310,558],[320,400],[320,568],[390,844],[430,932],[568,320],[844,390],[1024,768],[1440,900]])for(const reducedMotion of ['no-preference','reduce']){
  const page=await browser.newPage({viewport:{width,height},reducedMotion})
  await page.route('**/*',r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort())
  page.on('pageerror',e=>failures.push({label:`runtime-${width}x${height}`,message:e.message}))
  await page.goto(new URL(`/candy-prototypes.html?screen=home&home=kawaii&brand=${brand}${crafted?'&study=crafted':refined?'&study=refined':''}`,base).href)
  await page.evaluate(()=>document.fonts.ready)
  await audit(page,`${brand}-home-${width}x${height}-${reducedMotion}`)
  if(refined){
   for(const tool of await page.locator('.cp-topbar .cp-circle').all())assert.equal(await tool.evaluate(e=>getComputedStyle(e).borderTopLeftRadius),'12px')
   assert.equal(await page.locator('.kw-home-actions').evaluate(e=>getComputedStyle(e).animationName),reducedMotion==='reduce'?'none':'kw-refined-arrive')
   assert.equal(await page.locator('.kw-button-surface').first().evaluate(e=>getComputedStyle(e).opacity),'0.28')
  }
  assert.equal(await page.getByRole('img',{name:'EmCoin',exact:true}).count(),1)
  if(brand==='type') assert.equal((await page.locator('.kw-wordmark-lettering tspan').allTextContents()).join(''),'EmCoin')
  assert.equal(await page.locator('.kw-original-brand').count(),brand==='coin'?1:0)
  if(brand==='coin')assert.match(await page.locator('.kw-original-brand').getAttribute('href'),/original-brand\.svg$/)
  assert.equal(await page.locator('.kw-logo-cards,.kw-logo-reaction').count(),0)
  if(brand==='type'){
  const lettering=await page.locator('.kw-wordmark-lettering text').evaluate(e=>{const b=e.getBBox();return{x:b.x,y:b.y,width:b.width,height:b.height,font:getComputedStyle(e).fontFamily}})
  assert.match(lettering.font,/CPQuicksand/)
  assert.ok(lettering.x>=0&&lettering.x+lettering.width<=400&&lettering.y>=0&&lettering.y+lettering.height<=315,'Wordmark must fit its vector canvas')
  }
  assert.equal(await page.locator('.kw-home-actions>button').count(),2)
  assert.match(await page.locator('.kw-home-actions .kw-button-surface').first().evaluate(e=>getComputedStyle(e).borderImageSource),/prototypes\/kawaii\/button-teal\.png/)
  assert.equal(await page.locator('.kw-wordmark').evaluate(e=>getComputedStyle(e).animationName),'none')
  if(crafted){
   assert.equal(await page.getByRole('button',{name:'Logo EmCoin',exact:true}).isDisabled(),true)
   assert.equal(await page.locator('.kw-home-actions').evaluate(e=>getComputedStyle(e).animationName),'none')
  }else{
  const logo=page.getByRole('button',{name:'Chạm để logo EmCoin chuyển động',exact:true})
  await logo.click();assert.equal(await logo.getAttribute('data-reaction'),'1')
  await logo.focus();await page.keyboard.press('Enter');assert.equal(await logo.getAttribute('data-reaction'),'2')
  await logo.evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));e.blur()})
  }
  await iconFeedback(page,'.kw-home-actions')
  if(reducedMotion==='no-preference'&&(width===390||width===310||height===320))await capture(page,`${brand}-home-${width}x${height}`)
  for(const label of ['Tìm phòng','Tạo phòng']){
   await page.getByRole('button',{name:label,exact:true}).click();await page.locator('dialog[open]').waitFor();await audit(page,`${brand}-${label}-${width}x${height}-${reducedMotion}`)
   await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'})
   assert.equal(await page.getByRole('button',{name:label,exact:true}).evaluate(e=>getComputedStyle(e).outlineStyle),'none','Pointer-opened dialog must not leave a selected-looking outline on return')
  }
  await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.locator('.kw-menu').waitFor();await audit(page,`${brand}-menu-${width}x${height}-${reducedMotion}`)
  assert.equal(await page.locator('.kw-menu-emblem').count(),0)
  assert.equal(await page.locator('.kw-menu>button').count(),4)
  assert.equal(await page.locator('dialog .cp-pager').count(),0)
  await iconFeedback(page,'.kw-menu')
  if(reducedMotion==='no-preference'&&(width===390||width===310||height===320))await capture(page,`${brand}-menu-${width}x${height}`)
  for(const name of ['Bộ thẻ','Hướng dẫn','Giao diện','Hỗ trợ']){
   await page.locator('.kw-menu').getByRole('button',{name,exact:true}).click();await page.locator('dialog[open]').waitFor();await audit(page,`${brand}-${name}-${width}x${height}-${reducedMotion}`)
   await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});await page.getByRole('button',{name:'Mở menu',exact:true}).click()
  }
  await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.locator('dialog[open]').waitFor({state:'hidden'})
  await page.mouse.wheel(0,400)
  assert.equal(await page.evaluate(()=>scrollY),0)
  await page.close()
 }
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({study:crafted?'crafted-static':refined?'refined-motion':'kawaii-motion',checks,failures},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1
