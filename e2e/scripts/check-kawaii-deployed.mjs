// Read-only live UI smoke: real HTTPS/Socket.IO/catalog, no room writes or mocks.
import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
const base='https://app.emcoin.cloud'
const output=path.resolve('docs/qa/kawaii-deployed-20261020')
await mkdir(output,{recursive:true})
const browser=await chromium.launch(),results=[]
try {
 for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]]) {
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'})
  const page=await context.newPage(),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  const measure=async screen=>{
   await page.waitForTimeout(350)
   const state=await page.evaluate(()=>({theme:document.documentElement.dataset.uiTheme,
    overflow:document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2,
    broken:[...document.images].filter(img=>img.complete&&!img.naturalWidth).map(img=>img.getAttribute('src'))}))
   await page.screenshot({path:path.join(output,`${screen}-${width}.png`),animations:'disabled'})
   results.push({screen,width,height,...state,errors:[...errors]})
   expect(state.theme).toBe('candy-clouds');expect(state.overflow).toBe(false);expect(state.broken).toEqual([]);expect(errors).toEqual([])
  }
  // No query override and no stored preference: verify the actual default.
  await page.goto(base,{waitUntil:'networkidle'})
  await page.getByTestId('btn-join-room').waitFor({timeout:60000})
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})))})
  await measure('home')
  await page.getByTestId('btn-create-room').click()
  await page.getByRole('dialog',{name:'Tạo phòng'}).waitFor()
  await page.getByTestId('input-username-create').fill('QA giao diện')
  await measure('create-name')
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click()
  await measure('create-decks')
  await page.getByRole('button',{name:'Đóng',exact:true}).click()
  await page.getByRole('dialog').waitFor({state:'detached'})
  await page.getByTestId('btn-join-room').click()
  await page.getByRole('dialog',{name:'Tìm phòng'}).waitFor()
  await measure('join')
  await page.getByRole('button',{name:'Đóng',exact:true}).click()
  await page.getByRole('dialog').waitFor({state:'detached'})
  await page.getByRole('button',{name:'Cài đặt',exact:true}).click()
  await page.getByRole('dialog',{name:'Menu',exact:true}).waitFor()
  await measure('menu')
  await context.close()
 }
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage()
 await page.goto(`${base}/admin`,{waitUntil:'networkidle'})
 await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeVisible()
 await context.close()
} finally {
 await browser.close()
 await writeFile(path.join(output,'report.json'),JSON.stringify({base,realNetwork:true,roomMutations:false,results},null,2))
}
console.log(JSON.stringify({passed:results.length,evidence:output}))
