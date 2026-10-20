import {chromium} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import path from 'node:path'
const base=new URL(process.argv[2]||'http://127.0.0.1:5186')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned production preview only')
const browser=await chromium.launch(),results=[]
const output=path.resolve('docs/qa/kawaii-live-20261020')
try{for(const [width,height] of [[390,844],[1440,900]]){
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await context.newPage(),errors=[]
 // Only a protocol bootstrap shim: no remote service, room creation or gameplay mutation.
 await page.routeWebSocket('**/socket.io/**',socket=>{socket.onMessage(message=>{if(typeof message!=='string')return;if(message.startsWith('40'))socket.send('40{"sid":"qa-kawaii-only"}');if(message.startsWith('42'))socket.send('42["rooms_list",[]]')});socket.send('0{"sid":"qa-kawaii-only","upgrades":[],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}')})
 await page.route('**/*',route=>new URL(route.request().url()).origin===base.origin?route.continue():route.abort())
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(new URL('/?theme=candy-clouds',base).href)
 await page.getByTestId('btn-join-room').waitFor({timeout:60000})
 await page.waitForTimeout(1000)
 const state=await page.evaluate(()=>({theme:document.documentElement.dataset.uiTheme,home:!!document.querySelector('.kawaii-home'),overflow:document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2,broken:[...document.images].filter(img=>img.complete&&!img.naturalWidth).map(img=>img.getAttribute('src'))}))
 await page.screenshot({path:path.join(output,`production-home-${width}.png`),animations:'disabled'})
 results.push({width,height,...state,errors})
 await context.close()
}}finally{await browser.close()}
await writeFile(path.join(output,'production-smoke.json'),JSON.stringify({protocolBootstrapSimulated:true,results},null,2));console.log(JSON.stringify(results,null,2))
if(results.some(row=>row.errors.length||row.overflow||row.broken.length||!row.home))process.exitCode=1
