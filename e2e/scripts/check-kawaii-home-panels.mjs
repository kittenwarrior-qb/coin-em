import {chromium} from '@playwright/test'
import {readFile,mkdtemp,writeFile} from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'
const base='http://127.0.0.1:5183'
const catalog=JSON.parse(await readFile(new URL('../../fe/src/test/fixtures/pdfCatalog.json',import.meta.url),'utf8')).filter(c=>!c.archived)
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-home-panels-'))
const browser=await chromium.launch(),checks=[],failures=[]
async function audit(page,label){
 const problems=await page.evaluate(()=>{
  const found=[],root=document.querySelector('dialog[open]'),b=root.getBoundingClientRect()
  for(const e of [document.documentElement,document.body,root,...root.querySelectorAll('.cp-dialog-body,.kw-menu,.cp-panel-fill,.kw-help-content,.cp-real-inventory')])if(e.clientHeight&&(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2))found.push({element:e.className,size:[e.clientWidth,e.clientHeight],scroll:[e.scrollWidth,e.scrollHeight]})
  for(const e of root.querySelectorAll('button,input,select')){const r=e.getBoundingClientRect();if(r.width&&r.height&&(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1||r.top<0||r.bottom>innerHeight))found.push({control:e.textContent})}
  return found
 });checks.push(label);if(problems.length)failures.push({label,problems})
}
async function close(page){if(await page.locator('dialog[open]').count()){await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'})}}
async function open(page,name){await close(page);await page.getByRole('button',{name:'Mở menu',exact:true}).click();if(name!=='Menu')await page.locator('.kw-menu').getByRole('button',{name,exact:true}).click()}
async function capture(page,name){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.activeElement?.blur()});await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'})}
try{
 for(const [width,height]of [[310,558],[320,400],[390,844],[568,320],[1280,800]])for(const reducedMotion of ['no-preference','reduce']){
  const page=await browser.newPage({viewport:{width,height},reducedMotion}),prefix=`${width}x${height}-${reducedMotion}`
  page.on('pageerror',e=>failures.push({label:prefix,message:e.message}))
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort())
  await page.goto(`${base}/candy-prototypes.html?screen=home&home=kawaii&brand=coin&study=refined`)
  await page.evaluate(()=>document.fonts.ready)
  const photo=width===390&&reducedMotion==='no-preference'
  await open(page,'Menu');await audit(page,`${prefix}-menu`);if(photo)await capture(page,'menu')
  await open(page,'Giao diện');await audit(page,`${prefix}-settings`)
  for(const layout of ['A','B']){const button=page.locator('dialog[open]').getByRole('button',{name:new RegExp(`${layout} ·`)});await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.cp-phone').getAttribute('data-layout'),layout)}
  if(photo)await capture(page,'settings')
  await page.getByRole('button',{name:'Mô phỏng',exact:true}).click();await audit(page,`${prefix}-simulation`);if(photo)await capture(page,'simulation')
  await open(page,'Hướng dẫn')
  for(let i=0;i<4;i++){await audit(page,`${prefix}-guide-${i+1}`);if(photo)await capture(page,`guide-${i+1}`);if(i<3)await page.getByRole('button',{name:'Hướng dẫn sau',exact:true}).click()}
  assert.equal(await page.getByRole('button',{name:'Hướng dẫn sau',exact:true}).isDisabled(),true)
  await open(page,'Hỗ trợ');await audit(page,`${prefix}-support`);if(photo)await capture(page,'support')
  await page.getByRole('button',{name:'Xem hướng dẫn',exact:true}).click();assert.equal(await page.locator('.kw-help-content h3').textContent(),'Duyệt ván mẫu')
  for(const category of ['role','situation','emotion','reflection','selfcare']){
   await open(page,'Bộ thẻ');await page.getByLabel('Loại thẻ',{exact:true}).selectOption(category)
   await page.locator('.cp-real-inventory button').first().waitFor();await audit(page,`${prefix}-inventory-${category}`)
   const cards=catalog.filter(c=>c.category===category)
   assert.match(await page.locator('.kw-catalog-meta').textContent(),new RegExp(`^${cards.length} thẻ`))
   if(photo)await capture(page,`inventory-${category}`)
   const next=page.getByRole('button',{name:'Bộ thẻ sau',exact:true})
   if(await next.isEnabled()){
    const before=await page.locator('.cp-real-inventory button').first().getAttribute('data-card-id')
    await next.click();await audit(page,`${prefix}-inventory-next-${category}`)
    assert.notEqual(await page.locator('.cp-real-inventory button').first().getAttribute('data-card-id'),before)
    await page.getByRole('button',{name:'Bộ thẻ trước',exact:true}).click()
    assert.equal(await page.locator('.cp-real-inventory button').first().getAttribute('data-card-id'),before)
   }
   const first=page.locator('.cp-real-inventory button').first(),id=await first.getAttribute('data-card-id'),card=cards.find(c=>c.id===id)
   assert.ok(card)
   await first.click();await page.locator('.cp-real-preview').waitFor();await audit(page,`${prefix}-card-front-${category}`)
   assert.equal(await page.locator('.cp-flip-face:not(.cp-flip-back) img').getAttribute('src'),card.frontImageUrl)
   await page.getByRole('button',{name:'Lật thẻ',exact:true}).click();assert.equal(await page.locator('.cp-real-preview').getAttribute('data-face'),'back')
   assert.equal(await page.locator('.cp-flip-back img').getAttribute('src'),card.backImageUrl)
   if(photo&&category==='reflection')await capture(page,'card-back')
  }
  await close(page);assert.equal(await page.evaluate(()=>scrollY),0);await page.close()
 }
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks,failures},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1
