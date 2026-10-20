import {chromium} from '@playwright/test'
import {mkdtemp,writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback only')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-kawaii-live-chat-'))
const browser=await chromium.launch(),checks=[],failures=[]
try{for(const [width,height] of [[320,400],[390,844],[568,320],[390,268],[1440,900]]){
 const page=await browser.newPage({viewport:{width,height}})
 async function audit(label){await page.waitForTimeout(300);const problems=await page.evaluate(()=>{
  const out=[],dialog=document.querySelector('[role=dialog]'),box=dialog.getBoundingClientRect()
  for(const el of [dialog,...dialog.querySelectorAll('[data-ui-surface=modal],[data-ui-modal-content],.kawaii-chat-body,.kawaii-chat-conversation,.kawaii-chat-state,textarea')])if(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)out.push({node:el.className,client:[el.clientWidth,el.clientHeight],scroll:[el.scrollWidth,el.scrollHeight]})
  for(const el of dialog.querySelectorAll('button,input,select,textarea')){const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(r.top<box.top-1||r.bottom>box.bottom+1||r.left<box.left-1||r.right>box.right+1)out.push({control:el.getAttribute('aria-label')||el.textContent,rect:r.toJSON()})}return out
 });checks.push(`${label}-${width}x${height}`);if(problems.length)failures.push({label,width,height,problems});if(width===390||problems.length)await page.screenshot({path:path.join(output,`${label}-${width}x${height}.png`),animations:'disabled'})}
 for(const state of ['ready','host','disabled','invite','muted','offline','pending','error']){
  await page.goto(new URL(`/qa-kawaii-chat.html?state=${state}`,base).href);await page.getByRole('dialog',{name:'Chat phòng',exact:true}).waitFor();await audit(`${state}-messages`)
  const dismiss=page.getByRole('button',{name:'Xem chat và bản nháp',exact:true});if(await dismiss.count())await dismiss.click()
  const write=page.getByRole('button',{name:'Soạn tin',exact:true})
  if(!await write.isDisabled()){
   await write.click();const input=page.getByLabel('Tin nhắn',{exact:true})
   const draft=state==='ready'?('W'.repeat(230)+'\n'.repeat(20)+'Xin chào, đây là bản nháp đầy đủ. '.repeat(12)).slice(0,500):'Nội dung thử để kiểm tra phần soạn thảo vẫn vừa màn hình khi có trạng thái mạng hoặc lỗi.'
   if(!await input.isDisabled())await input.fill(draft)
   await audit(`${state}-compose`)
   if(state==='ready'){
    const parts=[];for(let part=0;part<100;part++){parts.push(await input.inputValue());const next=page.getByRole('button',{name:'Phần tin sau',exact:true});if(await next.isDisabled())break;await next.click();await audit(`${state}-draft-part${part+2}`)}
    if(parts.join('')!==draft)failures.push({label:'draft-content-changed',width,height})
   }
  }
  await page.getByRole('button',{name:'Quản lý chat',exact:true}).click();await audit(`${state}-manage`)
  const safety=page.getByRole('button',{name:'An toàn',exact:true});if(!await safety.isDisabled()){await safety.click();await audit(`${state}-safety`)}
 }
 await page.close()
}}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks,failures},null,2));console.log(JSON.stringify({output,checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1
