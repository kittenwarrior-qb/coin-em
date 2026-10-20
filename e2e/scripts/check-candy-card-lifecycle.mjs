import {chromium} from '@playwright/test'
import {mkdtemp,writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
const kawaii=process.argv.includes('--kawaii')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback only')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-card-lifecycle-'))
const browser=await chromium.launch(),checks=[],failures=[]
try{
 for(const reducedMotion of ['no-preference','reduce'])for(const method of ['close','escape','choose']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion})
  await page.route('**/*',r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort())
  const label=`open-flip-${method}-${reducedMotion}`
  try{
   await page.goto(new URL(`/candy-prototypes.html?screen=home&home=${kawaii?'kawaii&study=refined':'table'}&panel=inventory`,base).href)
   await page.locator('.cp-real-inventory button').first().waitFor()
   await page.waitForFunction(expected=>{const images=[...document.querySelectorAll('.cp-real-inventory img')];return images.length===expected&&images.every(image=>image.complete&&image.naturalWidth>0)},kawaii?3:6)
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))})
   if(method==='close'&&reducedMotion==='no-preference')await page.screenshot({path:path.join(output,'inventory.png'),animations:'disabled'})
   await page.locator('.cp-real-inventory button').first().click()
   const preview=page.locator('.cp-real-preview')
   await preview.waitFor()
   const name=await preview.evaluate(e=>getComputedStyle(e).animationName)
   assert.equal(name,reducedMotion==='reduce'?'none':'cp-preview-open')
   await preview.evaluate(async e=>Promise.all(e.getAnimations().map(a=>a.finished)))
   await page.getByRole('button',{name:'Lật thẻ',exact:true}).click()
   await page.locator('.cp-card-flipper').evaluate(async e=>Promise.all(e.getAnimations().map(a=>a.finished)))
   assert.equal(await preview.getAttribute('data-face'),'back')
   if(method==='close')await page.getByRole('button',{name:'Đóng',exact:true}).click()
   if(method==='escape')await page.keyboard.press('Escape')
   if(method==='choose')await page.getByRole('button',{name:'Chọn thẻ mẫu',exact:true}).click()
   await page.locator('dialog[open]').waitFor({state:'hidden'})
   assert.equal(await page.locator('.cp-real-preview').count(),0)
   await page.getByRole('button',{name:'Mở menu',exact:true}).click()
   await page.locator(kawaii?'.kw-menu':'.cp-menu-single').waitFor()
   checks.push(label)
  }catch(error){failures.push({label,message:error.message})}
  await page.close()
 }
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks,failures},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1
