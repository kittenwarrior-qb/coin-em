import {chromium} from '@playwright/test'
import {mkdtemp,writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback only')
const quick=process.argv.includes('--quick')
const friendlyOnly=process.argv.includes('--friendly-only')
const kawaii=process.argv.includes('--kawaii')
function previewUrl(query){const url=new URL(query,base);if(kawaii){url.searchParams.set('home','kawaii');url.searchParams.set('study','refined');url.searchParams.set('brand','coin')}return url.href}
const sizes=quick?[[310,558],[320,400],[390,844],[844,390]]:[[310,558],[320,400],[320,568],[390,844],[430,932],[568,320],[844,390],[1024,768],[1440,900]]
const panels=friendlyOnly?['chat','menu']:['menu','settings','chat','chat-settings','chat-join','safety','report','journal','card','inventory','gift','player','avatar','guide','join','create','response','guess','role','connection','leave','confirm','support']
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-ab-zero-scroll-'))
const browser=await chromium.launch(),checks=[],failures=[]
async function audit(page,label){
  await page.evaluate(()=>document.fonts.ready)
  const problems=await page.evaluate(()=>{
    const problems=[]
    const roots=[document.documentElement,document.body,...document.querySelectorAll('.cp-workbench,.cp-tools,.cp-phone,.cp-arena,.cp-round-board,.cp-focused-board,.cp-stage-content,.cp-roster-panel,.cp-roster,.cp-dialog[open],.cp-dialog[open] .cp-dialog-body,.cp-dialog[open] .cp-panel-fill,.cp-dialog[open] .cp-message-area,.cp-dialog[open] .cp-compose,.cp-dialog[open] .cp-friendly-chat,.cp-dialog[open] .cp-conversation,.cp-dialog[open] .cp-chat-editor,.cp-dialog[open] textarea')]
    for(const el of roots){const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)problems.push({node:el.className||el.tagName,scroll:[el.scrollWidth,el.scrollHeight],client:[el.clientWidth,el.clientHeight]})}
    const dialog=document.querySelector('dialog[open]'),root=dialog||document.querySelector('.cp-phone'),box=root.getBoundingClientRect()
    for(const el of root.querySelectorAll('button,input,select,textarea')){const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)problems.push({control:el.getAttribute('aria-label')||el.textContent?.slice(0,35),bounds:[r.x,r.y,r.width,r.height],root:[box.x,box.y,box.width,box.height]})}
    return problems
  })
  checks.push(label);if(problems.length)failures.push({label,problems})
}
async function capture(page,name){await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.activeElement?.blur()});await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'})}
try{
  const runSize=async([width,height])=>{
    const page=await browser.newPage({viewport:{width,height}})
    await page.route('**/*',r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort())
    page.on('pageerror',e=>failures.push({label:`runtime-${width}-${height}`,error:e.message}))
    for(const layout of (friendlyOnly?[]:['A','B']))for(const count of [6,10]){
      await page.goto(previewUrl(`/candy-prototypes.html?layout=${layout}&count=${count}&phase=role-reveal`))
      await page.locator('.cp-arena').waitFor();await page.waitForTimeout(80)
      for(let step=0;step<17;step++){
        await audit(page,`board-${layout}-${count}-${width}x${height}-phase${step}`)
        if(step===8&&count===10)await capture(page,`${layout}-${width}x${height}`)
        if(step<16)await page.locator('.cp-dock .cp-action').last().click()
      }
      const tabs=page.locator('.cp-board-tabs')
      if(await tabs.count()){
        await tabs.getByRole('button',{name:`Người chơi (${count})`,exact:true}).click();await audit(page,`roster-${layout}-${count}-${width}x${height}`)
        const visible=await page.locator('.cp-arena .cp-player').count()
        if(visible!==count){
          const next=page.locator('.cp-arena .cp-pager button').last();if(await next.count()){await next.click();await audit(page,`roster-page2-${layout}-${count}-${width}x${height}`);if(visible+await page.locator('.cp-arena .cp-player').count()!==count)failures.push({label:'missing paged players',width,height,layout,count})}else failures.push({label:'missing players',width,height,layout,count})
        }
      }
      const before=await page.evaluate(()=>({root:document.scrollingElement.scrollTop,arena:document.querySelector('.cp-arena').scrollTop}))
      await page.locator('.cp-arena').hover();await page.mouse.wheel(0,800);await page.waitForTimeout(60)
      const after=await page.evaluate(()=>({root:document.scrollingElement.scrollTop,arena:document.querySelector('.cp-arena').scrollTop}))
      if(JSON.stringify(before)!==JSON.stringify(after))failures.push({label:'wheel scrolled',width,height,layout,count,before,after})
    }
    for(const screen of (friendlyOnly?[]:['home','waiting'])){
      await page.goto(previewUrl(`/candy-prototypes.html?screen=${screen}`));await page.locator('.cp-phone').waitFor();await page.waitForTimeout(50);await audit(page,`${screen}-${width}x${height}`)
      if(screen==='waiting'){await page.getByRole('button',{name:'Thiết lập',exact:true}).click();await audit(page,`waiting-settings-${width}x${height}`)}
    }
    for(const panel of panels){
      await page.goto(previewUrl(`/candy-prototypes.html?layout=B&count=10&panel=${panel}`))
      try{await page.locator('dialog[open]').waitFor()}catch(error){throw new Error(`${panel}-${width}x${height}: ${error.message}; page=${await page.locator('body').innerText()}`)}await audit(page,`${panel}-${width}x${height}`)
      if(['chat','menu','gift','settings','card'].includes(panel))await capture(page,`${panel}-${width}x${height}`)
      if(panel==='settings'){await page.getByRole('button',{name:'Mô phỏng',exact:true}).click();await audit(page,`settings-tab2-${width}x${height}`)}
      if(panel==='chat'){const write=page.getByRole('button',{name:'Soạn tin',exact:true});if(await write.isVisible())await write.click();await page.getByLabel('Tin nhắn mẫu',{exact:true}).fill('Một tin nhắn dài dùng để kiểm tra phần soạn thảo có vừa màn hình và không bị cuộn bên trong.');await audit(page,`chat-compose-${width}x${height}`)}
      if(panel==='gift'){await page.getByRole('button',{name:'Chọn số lượng',exact:true}).click();await audit(page,`gift-step2-${width}x${height}`)}
      if(panel==='guide'||panel==='avatar'){await page.locator('.cp-pager button').last().click();await audit(page,`${panel}-page2-${width}x${height}`)}
      await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});if(await page.locator('dialog[open]').count())failures.push({label:'Escape failed',panel,width,height})
    }
    await page.close()
  }
  await Promise.all([0,1].map(async shard=>{for(let i=shard;i<sizes.length;i+=2)await runSize(sizes[i])}))
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks,failures},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1
