import { chromium, expect } from '../../e2e/node_modules/@playwright/test/index.mjs'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web')
const output=path.resolve(root,'../../docs/qa/native-foundation-20261013')
await mkdir(output,{recursive:true})
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'}
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost'), relative=decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
    const file=path.resolve(root,relative)
    if(!file.startsWith(root+path.sep))throw Error('Outside fixture')
    const body=await readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.end(body)
  }catch{res.statusCode=404;res.end('Not found')}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const base=`http://127.0.0.1:${server.address().port}`, browser=await chromium.launch(), errors=[]
const watchdog=setTimeout(()=>{void browser.close();server.close()},60000)
try {
 for(const width of [320,390]) {
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'})
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort())
  await context.addInitScript(()=>{window.__nativeWorkerCalls=0;if('serviceWorker' in navigator)navigator.serviceWorker.register=()=>{window.__nativeWorkerCalls++;throw Error('Unexpected worker registration')}})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  await page.goto(`${base}/#/about/story`)
  await expect(page.getByRole('heading',{name:'EmCoin là một vòng chơi cảm xúc, không phải một bài kiểm tra.',exact:true})).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading',{name:'Luật Coin trên web',exact:true})).toBeAttached()
  expect(await page.evaluate(()=>window.__nativeWorkerCalls)).toBe(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:path.join(output,`native-guide-${width}.png`)})
  await context.close()
 }
 expect(errors).toEqual([])
 await writeFile(path.join(output,'browser-report.json'),JSON.stringify({result:'passed',scope:'packaged hash-router Chromium smoke; not Android/iOS WebView',viewports:[320,390],productionRequestsAllowed:false,workerRegistrations:0,errors},null,2))
 console.log('Native packaged guide/hash reload and no-worker browser smoke passed; no device claim.')
}finally{clearTimeout(watchdog);await browser.close();await new Promise(resolve=>server.close(resolve))}
