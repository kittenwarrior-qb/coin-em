import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const origin='http://127.0.0.1:5183'
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-entry-'))
const browser=await chromium.launch(),checks=[]
try{
 for(const [width,height]of [[310,558],[320,400],[390,844],[568,320],[1280,800]])for(const reducedMotion of ['no-preference','reduce'])for(const panel of ['create','join']){
  const page=await browser.newPage({viewport:{width,height},reducedMotion})
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort())
  await page.goto(`${origin}/candy-prototypes.html?screen=home&home=kawaii&brand=coin&study=refined&panel=${panel}`)
  const dialog=page.locator('dialog[open]');await dialog.waitFor();await page.evaluate(()=>document.fonts.ready)
  await dialog.evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))})
  const problems=await page.evaluate(()=>{
   const found=[]
   for(const e of [document.documentElement,document.body,...document.querySelectorAll('dialog[open],dialog[open] .cp-dialog-body,.kw-entry-form,.kw-entry-rounds')])if(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2)found.push(e.className)
   const dialog=document.querySelector('dialog[open]'),b=dialog.getBoundingClientRect()
   if(b.bottom-document.querySelector('.kw-entry-form').getBoundingClientRect().bottom>32)found.push('Excess empty dialog height')
   for(const e of dialog.querySelectorAll('button,input,select')){const r=e.getBoundingClientRect();if(r.left<b.left||r.right>b.right||r.top<b.top||r.bottom>b.bottom)found.push(e.outerHTML.slice(0,100))}
   const input=document.querySelector('.kw-entry-field').getBoundingClientRect(),rounds=document.querySelector('.kw-entry-rounds')?.getBoundingClientRect(),submit=document.querySelector('.kw-entry-submit').getBoundingClientRect()
   if(rounds&&(rounds.top-input.bottom>25||submit.top-rounds.bottom>25))found.push('Stretched field spacing')
   return found
  });assert.deepEqual(problems,[],`${width}x${height} ${panel}`)
  const submit=page.locator('.kw-entry-submit'),input=page.locator('.kw-entry-input input')
  assert.equal(await submit.isDisabled(),true);await input.fill('   ');assert.equal(await submit.isDisabled(),true)
  if(width===390&&reducedMotion==='no-preference')await page.screenshot({path:path.join(output,`${panel}-empty.png`),animations:'disabled'})
  await input.fill(panel==='create'?'Bạn':'THU123');assert.equal(await submit.isEnabled(),true)
  if(panel==='create'){
   const select=page.getByLabel('Số lượt chơi',{exact:true})
   assert.deepEqual(await select.locator('option').evaluateAll(es=>es.map(e=>Number(e.value))),[1,2,3,4,5,6,7,8,9,10])
   await select.selectOption('1');await select.selectOption('10');await select.selectOption('3')
  }
  if(reducedMotion==='no-preference'&&(width===390||width===568||width===1280)){await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:path.join(output,`${panel}-filled-${width}x${height}.png`),animations:'disabled'})}
  await input.focus();await page.keyboard.press('Enter');await page.locator('.cp-phone[data-screen=waiting]').waitFor();await page.locator('dialog[open]').waitFor({state:'hidden'})
  assert.equal(await page.evaluate(()=>scrollY),0)
  checks.push({width,height,reducedMotion,panel,passed:true});await page.close()
 }
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures:0},null,2))
