import {chromium} from '@playwright/test'
import {mkdtemp,writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback only')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-home-studies-'))
const browser=await chromium.launch(),checks=[],failures=[]
async function audit(page,label){
 const problems=await page.evaluate(()=>{
  const problems=[]
  for(const e of [document.documentElement,document.body,...document.querySelectorAll('.cp-phone,.cp-home-study,.cp-home-composition,.cp-home-play,.cp-ricimi-home,.cp-ricimi-core,.cp-ricimi-actions,.cp-menu-single,dialog[open],dialog[open] .cp-dialog-body')]){
   if(e.clientHeight&& (e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2))problems.push({node:e.className,size:[e.clientWidth,e.clientHeight],scroll:[e.scrollWidth,e.scrollHeight]})
  }
  const root=document.querySelector('dialog[open]')||document.querySelector('.cp-phone'),box=root.getBoundingClientRect()
  for(const e of root.querySelectorAll('button,input,select')){const r=e.getBoundingClientRect();if(r.width&&r.height&&(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1))problems.push({control:e.textContent,bounds:[r.x,r.y,r.width,r.height]})}
  return problems
 })
 checks.push(label);if(problems.length)failures.push({label,problems})
}
try{
 for(const [width,height]of [[310,558],[320,400],[390,844],[430,932],[568,320],[844,390],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height}})
  await page.route('**/*',r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort())
  for(const home of ['ricimi','table','cloud','friends','cards']){
   await page.goto(new URL(`/candy-prototypes.html?screen=home&home=${home}`,base).href)
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))})
   await audit(page,`${home}-${width}x${height}`)
   if(width===390||width===310||height===320)await page.screenshot({path:path.join(output,`${home}-${width}x${height}.png`),animations:'disabled'})
   for(const name of ['Tìm phòng','Tạo phòng']){
    await page.getByRole('button',{name:new RegExp(name)}).click();await audit(page,`${home}-${name}-${width}x${height}`);await page.keyboard.press('Escape')
   }
   await page.getByRole('button',{name:'Mở menu',exact:true}).click();await audit(page,`${home}-menu-${width}x${height}`)
   assert.equal(await page.locator('.cp-menu-single>button').count(),4)
   assert.equal(await page.locator('dialog .cp-pager').count(),0)
   if(home==='cloud'&&width===390)await page.screenshot({path:path.join(output,'home-menu.png'),animations:'disabled'})
   await page.keyboard.press('Escape')
  }
  await page.goto(new URL('/candy-prototypes.html?panel=menu',base).href);await page.locator('dialog[open]').waitFor();await audit(page,`game-menu-${width}x${height}`)
  assert.equal(await page.locator('.cp-menu-single>button').count(),9)
  if(width===390)await page.screenshot({path:path.join(output,'game-menu.png'),animations:'disabled'})
  for(let i=0;i<9;i++){
   await page.locator('.cp-menu-single>button').nth(i).click();await page.locator('dialog[open]').waitFor();await audit(page,`menu-target-${i}-${width}x${height}`)
   await page.keyboard.press('Escape');await page.getByRole('button',{name:'Mở menu',exact:true}).click()
  }
  await page.close()
 }
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks,failures},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1
