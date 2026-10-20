import {chromium}from'@playwright/test'
import {mkdtemp,writeFile}from'node:fs/promises'
import os from'node:os'
import path from'node:path'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
const kawaii=process.argv.includes('--kawaii')
function previewUrl(query){const url=new URL(query,base);if(kawaii){url.searchParams.set('home','kawaii');url.searchParams.set('study','refined')}return url.href}
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback only')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-ab-no-scroll-flows-'))
const browser=await chromium.launch(),checks=[],failures=[]
async function bounds(page,label){const problems=await page.locator('dialog[open]').evaluate(d=>{
 const box=d.getBoundingClientRect(),problems=[]
 if(box.top<0||box.bottom>innerHeight+1)problems.push('dialog outside viewport')
 for(const el of [d,...d.querySelectorAll('.cp-dialog-body,.cp-compose,textarea,.cp-message-area,.cp-friendly-chat,.cp-conversation,.cp-chat-editor')])if(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)problems.push({node:el.className,client:[el.clientWidth,el.clientHeight],scroll:[el.scrollWidth,el.scrollHeight]})
 for(const el of d.querySelectorAll('button,textarea,select,input')){const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(r.top<box.top-1||r.bottom>box.bottom+1)problems.push({control:el.textContent,bottom:r.bottom})}
 return problems
});checks.push(label);if(problems.length)failures.push({label,problems})}
try{
 for(const[width,height]of[[320,400],[390,844],[568,320],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height}})
  await page.route('**/*',r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort())
  await page.goto(previewUrl('/candy-prototypes.html?panel=chat'));await page.locator('dialog[open]').waitFor()
  for(const state of ['ready','disabled','invite','muted','offline','pending','error']){
   await page.getByRole('button',{name:'Quản lý chat',exact:true}).click();await page.locator('dialog select').selectOption(state);await page.getByRole('button',{name:'Trở về chat',exact:true}).click();await bounds(page,`chat-${state}-${width}x${height}`)
   if(state!=='disabled'&&state!=='invite'){
    const write=page.getByRole('button',{name:'Soạn tin',exact:true});if(await write.isVisible())await write.click();const send=page.getByRole('button',{name:'Gửi mẫu',exact:true})
    if(state!=='ready'&&!await send.isDisabled())failures.push({label:'unsafe send enabled',state,width,height})
    const back=page.getByRole('button',{name:'Về tin nhắn',exact:true});if(await back.isVisible())await back.click()
   }else if(await page.locator('textarea').count())failures.push({label:'compose available before admission',state,width,height})
  }
  await page.getByRole('button',{name:'Quản lý chat',exact:true}).click();await page.locator('dialog select').selectOption('ready');await page.getByRole('button',{name:'Trở về chat',exact:true}).click()
  let write=page.getByRole('button',{name:'Soạn tin',exact:true});if(await write.isVisible())await write.click();await page.getByLabel('Tin nhắn mẫu',{exact:true}).fill('Tin thử không có link.');await page.getByRole('button',{name:'Gửi mẫu',exact:true}).click()
  if(!await page.locator('.cp-chat-bubble').getByText('Tin thử không có link.',{exact:true}).count())failures.push({label:'message missing',width,height})
  await bounds(page,`chat-send-${width}x${height}`)
  write=page.getByRole('button',{name:'Soạn tin',exact:true});if(await write.isVisible())await write.click();await page.getByLabel('Tin nhắn mẫu',{exact:true}).fill('https://example.com');await page.getByRole('button',{name:'Gửi mẫu',exact:true}).click();if(!await page.getByText('Bản thử không nhận link hoặc thông tin liên hệ.',{exact:true}).count())failures.push({label:'link preview rejection missing',width,height})
  await page.keyboard.press('Escape')
  await page.goto(previewUrl('/candy-prototypes.html?layout=A&phase=reflection-card'));await page.locator('.cp-card').first().click();await page.getByRole('button',{name:'Chọn thẻ mẫu',exact:true}).click()
  await page.getByRole('button',{name:'Chọn bố cục bàn chơi',exact:true}).click();await page.locator('.cp-settings-choice').nth(1).click();await page.keyboard.press('Escape');if(await page.locator('.cp-card.selected').count()!==1)failures.push({label:'selection lost',width,height})
  await page.goto(previewUrl('/candy-prototypes.html?panel=gift'));await page.getByRole('button',{name:'Chọn số lượng',exact:true}).click();await page.getByRole('button',{name:'Xác nhận mẫu',exact:true}).click();if(await page.locator('.cp-wallet b').first().textContent()!=='1')failures.push({label:'wallet mismatch',width,height})
  await page.close()
 }
 // Simulated visible viewport after keyboard opening; not a physical-device test.
 for(const panel of ['chat','response']){
  const page=await browser.newPage({viewport:{width:390,height:844}})
  await page.goto(previewUrl(`/candy-prototypes.html?panel=${panel}`))
  await page.locator('dialog[open]').waitFor();if(panel==='chat'){const write=page.getByRole('button',{name:'Soạn tin',exact:true});if(await write.isVisible())await write.click()}
  await page.locator('textarea').fill('Nội dung dài để kiểm tra không có vùng cuộn khi bàn phím đang mở trên điện thoại.');await page.locator('textarea').focus()
  await page.setViewportSize({width:390,height:268});await page.waitForTimeout(100);await bounds(page,`${panel}-keyboard-390x268`)
  await page.screenshot({path:path.join(output,`${panel}-keyboard.png`)});await page.close()
 }
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks,failures},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1
