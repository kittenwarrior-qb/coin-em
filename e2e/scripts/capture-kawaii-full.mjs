import {chromium} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'

const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback only')
const output=path.resolve('docs/design/kawaii-full-prototype-20261020')
await mkdir(output,{recursive:true})
const browser=await chromium.launch()
const page=await browser.newPage({viewport:{width:390,height:844}})
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
await page.route('**/*',route=>new URL(route.request().url()).origin===base.origin?route.continue():route.abort())
const captures=[]
async function capture(name,query){
 await page.goto(new URL(`/candy-kawaii.html?${query}`,base).href)
 await page.locator('.cp-phone').waitFor()
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})))})
 await page.waitForTimeout(350)
 await page.screenshot({path:path.join(output,`${name}.png`),animations:'disabled'})
 captures.push(name)
}
try{
 await capture('home','screen=home')
 await capture('waiting','screen=waiting&count=10')
 await page.getByRole('button',{name:'Thiết lập',exact:true}).click()
 await page.screenshot({path:path.join(output,'waiting-settings.png'),animations:'disabled'})
 for(const layout of ['A','B']){
  await page.goto(new URL(`/candy-kawaii.html?screen=board&layout=${layout}&count=10&phase=role-reveal`,base).href)
  await page.locator('.cp-arena').waitFor()
  for(let index=0;index<17;index++){
   await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})))})
   await page.waitForTimeout(350)
   await page.screenshot({path:path.join(output,`board-${layout}-${String(index+1).padStart(2,'0')}.png`),animations:'disabled'})
   if(index<16)await page.locator('.cp-dock .cp-action').last().click()
  }
 }
 for(const panel of ['menu','settings','chat','chat-settings','chat-join','safety','report','journal','card','inventory','gift','player','avatar','guide','join','create','response','guess','role','connection','leave','confirm','support'])await capture(`panel-${panel}`,`screen=board&layout=B&count=10&panel=${panel}`)
 await writeFile(path.join(output,'capture-report.json'),JSON.stringify({captures,boards:34,errors},null,2))
 console.log(JSON.stringify({output,errors}))
 if(errors.length)process.exitCode=1
}finally{await browser.close()}
