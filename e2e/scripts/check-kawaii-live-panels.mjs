import {chromium} from '@playwright/test'
import {mkdtemp,writeFile,readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback only')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-kawaii-live-panels-'))
const browser=await chromium.launch(),checks=[],failures=[]
const cards=JSON.parse(await readFile(new URL('../../fe/src/test/fixtures/pdfCatalog.json',import.meta.url),'utf8')).filter(card=>!card.archived).map(card=>({...card,reviewed:true}))
const version=`catalog-${createHash('sha256').update(JSON.stringify(cards)).digest('hex')}`
try{for(const [width,height] of [[320,400],[390,844],[568,320],[1440,900]]){
 const page=await browser.newPage({viewport:{width,height}})
 await page.route('**/api/catalog/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).pathname.endsWith('/active')?{version}:{version,cards})}))
 page.on('pageerror',error=>failures.push({width,height,runtime:error.message}))
 async function audit(label){
  await page.waitForTimeout(350)
  const problems=await page.evaluate(()=>{
   const issues=[]
   for(const root of document.querySelectorAll('[role=dialog]')){
    if(root.closest('[inert]')||root.getAttribute('aria-hidden')==='true')continue
    const b=root.getBoundingClientRect()
    if(b.width<1||b.height<1)continue
    if(b.top< -1||b.bottom>innerHeight+1||b.left< -1||b.right>innerWidth+1)issues.push({outside:root.getAttribute('aria-label'),rect:b.toJSON()})
    for(const el of [root,...root.querySelectorAll('[data-ui-surface=modal],[data-ui-modal-content],[data-testid=inventory-scroll],[data-testid=history-log-scroll],fieldset,.kawaii-chat-body')]){
     if(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)issues.push({node:el.className,client:[el.clientWidth,el.clientHeight],scroll:[el.scrollWidth,el.scrollHeight]})
    }
    for(const el of root.querySelectorAll('button,input,select,textarea')){const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(r.top<b.top-1||r.bottom>b.bottom+1||r.left<b.left-1||r.right>b.right+1)issues.push({control:el.getAttribute('aria-label')||el.textContent,rect:r.toJSON()})}
   }
   return issues
  });checks.push(`${label}-${width}x${height}`);if(problems.length)failures.push({label,width,height,problems})
  await page.screenshot({path:path.join(output,`${label}-${width}x${height}.png`),animations:'disabled'})
 }
 await page.goto(new URL('/qa-screens.html?theme=candy-clouds&screen=lobby&stress=1',base).href)
 await page.getByTestId('btn-create-room').click();await audit('create')
 await page.getByTestId('input-username-create').fill('QA người thử');await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await audit('create-decks')
 await page.getByRole('button',{name:'Đóng',exact:true}).last().click();await page.getByTestId('btn-join-room').click();await audit('join')
 await page.getByRole('button',{name:'Tên của bạn',exact:true}).click();await audit('join-name')
 await page.getByRole('button',{name:'Đóng',exact:true}).last().click();await page.getByRole('button',{name:'Cài đặt',exact:true}).click();await audit('menu')
 await page.getByRole('button',{name:'Bộ thẻ',exact:true}).click();await page.getByRole('dialog',{name:'Bộ thẻ',exact:true}).waitFor();await audit('catalog')
 await page.getByRole('button',{name:'Bộ thẻ sau',exact:true}).click();await audit('catalog-page2')
 await page.goto(new URL('/qa-screens.html?theme=candy-clouds&screen=lobby',base).href)
 await page.getByRole('button',{name:'Cài đặt',exact:true}).click();await page.getByRole('button',{name:'Giao diện',exact:true}).click();await audit('theme')
 await page.getByRole('button',{name:'Bố cục bàn chơi',exact:true}).click();await audit('layouts')
 await page.goto(new URL('/qa-screens.html?theme=candy-clouds&screen=waiting',base).href)
 await page.getByRole('button',{name:'Chỉnh hồ sơ của QA người 1',exact:true}).click();await audit('profile')
 await page.getByRole('button',{name:'Chân dung',exact:true}).click();await audit('avatars')
 await page.getByRole('button',{name:'Màu nền',exact:true}).click();await audit('profile-colors')
 await page.goto(new URL('/qa-screens.html?theme=candy-clouds&screen=lobby',base).href)
 await page.getByRole('button',{name:'Hướng dẫn',exact:true}).click();await audit('guide')
 await page.getByRole('button',{name:'Luật Coin sau',exact:true}).click();await audit('guide-page2')
 for(const screen of ['history','give-picker','night-confirm','phase-confirm','card-preview']){
  await page.goto(new URL(`/qa-screens.html?theme=candy-clouds&screen=${screen}&stress=1`,base).href);await page.getByTestId('screen-qa-fixture').waitFor();await audit(screen)
 }
 await page.close()
}}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks,failures},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1
