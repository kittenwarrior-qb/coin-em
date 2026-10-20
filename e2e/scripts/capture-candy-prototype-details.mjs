import { chromium } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Loopback only')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-ab-details-'))
const browser=await chromium.launch(),results=[]
try{
  for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]]){
    const page=await browser.newPage({viewport:{width,height}})
    await page.route('**/*',r=>new URL(r.request().url()).origin===base.origin?r.continue():r.abort())
    for(const panel of ['menu','settings','card','player','gift','journal','guide']){
      await page.goto(new URL('/candy-prototypes.html?layout=B&count=10&phase=reflection-card',base).href)
      if(panel==='settings')await page.locator('.cp-mobile-layout').click()
      else if(panel==='card')await page.locator('.cp-card').first().click()
      else if(panel==='player')await page.getByRole('button',{name:'Xem Người 2',exact:true}).click()
      else if(panel==='gift'){
        await page.getByRole('button',{name:'Xem Người 2',exact:true}).click()
        await page.getByRole('button',{name:'Tặng Coin mẫu',exact:true}).click()
      }else if(panel==='journal')await page.getByRole('button',{name:'Nhật ký',exact:true}).click()
      else {
        await page.getByRole('button',{name:'Mở menu',exact:true}).click()
        if(panel==='guide')await page.locator('.cp-menu').getByRole('button',{name:'Hướng dẫn',exact:true}).click()
      }
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));document.activeElement?.blur()})
      const state=await page.locator('dialog').evaluate(d=>{const b=d.getBoundingClientRect();return{open:d.open,contained:b.top>=0&&b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight,horizontal:d.scrollWidth>d.clientWidth+1}})
      if(!state.open||!state.contained||state.horizontal)throw Error(JSON.stringify({panel,width,height,state}))
      await page.screenshot({path:path.join(output,`${panel}-${width}x${height}.png`)})
      await page.keyboard.press('Escape')
      if(await page.locator('dialog').evaluate(d=>d.open))throw Error('Escape failed')
      results.push({panel,width,height,...state})
    }
    await page.close()
  }
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify(results,null,2))
console.log(JSON.stringify({output,checks:results.length,failures:0}))
