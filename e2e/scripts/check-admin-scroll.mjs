import { chromium } from '@playwright/test'
import { mkdtemp,readFile,writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
const base=new URL(process.argv[2])
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback fixture required')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-admin-scroll-'))
const cards=JSON.parse(await readFile(new URL('../../fe/src/test/fixtures/pdfCatalog.json',import.meta.url),'utf8'))
const overview={rooms:[],analytics:{version:'operational-analytics/v1',scope:'this-process-since-start',persistent:false,http:{completed:0,clientErrors:0,serverErrors:0,durationBuckets:[10,50,100,250,500,1000,5000,null].map(upperBoundMs=>({upperBoundMs,count:0}))}}}
const browser=await chromium.launch(),results=[]
const diagnose=process.argv.includes('--diagnose')
let active={}
async function inspect(page,selector){return page.locator(selector).evaluate(async section=>{
  const failures=[]
  for(const el of section.querySelectorAll('button,input,select,textarea')){
    const initial=el.getBoundingClientRect()
    if(!initial.width||!initial.height||el.closest('[hidden]'))continue
    for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),r=el.getBoundingClientRect(),b=p.getBoundingClientRect();if(/auto|scroll/.test(s.overflowY))p.scrollTop+=r.top-b.top-Math.max(0,(p.clientHeight-r.height)/2);if(/auto|scroll/.test(s.overflowX))p.scrollLeft+=r.left-b.left-Math.max(0,(p.clientWidth-r.width)/2)}
    await new Promise(resolve=>requestAnimationFrame(resolve))
    const r=el.getBoundingClientRect();let top=0,bottom=innerHeight,left=0,right=innerWidth
    for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom)}if(/auto|scroll|hidden|clip/.test(s.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right)}}
    if(r.top<top-2||r.bottom>bottom+2||r.left<left-2||r.right>right+2)failures.push({text:el.getAttribute('aria-label')||el.textContent.trim().slice(0,60),rect:[r.top,r.bottom,r.left,r.right],clip:[top,bottom,left,right]})
  }
  if(document.scrollingElement.scrollHeight>innerHeight+1)failures.push({error:'document-overflow',rootHeight:document.scrollingElement.scrollHeight,layout:['body','.admin-page','.admin-content','.admin-topbar','.admin-sidebar','.admin-workspace'].map(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {selector,height:r.height,top:r.top,bottom:r.bottom,overflow:s.overflow,position:s.position}})})
  return failures
})}
try{
  for(const theme of (diagnose?['emotion-orbit']:['emotion-orbit','kindness-workshop']))for(const [width,height]of (diagnose?[[390,360]]:[[1440,900],[1440,400],[1024,568],[390,844],[390,360]])){
    active={theme,width,height}
    const page=await browser.newPage({viewport:{width,height}})
    await page.route('**/*',route=>new URL(route.request().url()).origin===base.origin?route.continue():route.abort())
    await page.route('**/admin/api/**',route=>{
      const url=new URL(route.request().url())
      const body=url.pathname==='/admin/api/overview'?overview:url.pathname==='/admin/api/catalog'?{revision:1,active:false,cards}:{}
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
    })
    await page.goto(new URL(`/admin?theme=${theme}`,base).href)
    await page.getByRole('navigation',{name:'Quản trị EmCoin'}).getByRole('button',{name:'Bộ thẻ',exact:true}).click()
    await page.locator('.admin-table tbody tr').first().waitFor()
    if(diagnose)console.log(JSON.stringify(await page.evaluate(()=>({before:{height:document.scrollingElement.scrollHeight,scroll:scrollY},root:{children:[...document.getElementById('root').children].map(el=>el.tagName+'.'+el.className),height:document.getElementById('root').getBoundingClientRect().height,overflow:getComputedStyle(document.getElementById('root')).overflow},bodyChildren:[...document.body.children].map(el=>({tag:el.tagName,height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top})),htmlStyle:getComputedStyle(document.documentElement).cssText}))))
    const tableFailures=await inspect(page,'.admin-catalog')
    results.push({theme,width,height,screen:'catalog',failures:tableFailures})
    if(tableFailures.length||height<=400)await page.screenshot({path:path.join(output,`${theme}-${width}x${height}-catalog.png`)})
    await page.locator('.admin-table tbody tr').first().getByRole('button').click()
    for(const tab of ['Thông tin','Nội dung','Hình ảnh']){
      await page.getByRole('tab',{name:tab,exact:true}).click()
      const failures=await inspect(page,'.admin-catalog')
      results.push({theme,width,height,screen:tab,failures})
      if(failures.length||height<=400)await page.screenshot({path:path.join(output,`${theme}-${width}x${height}-${tab}.png`)})
    }
    await page.close()
  }
}catch(error){results.push({...active,screen:'fixture',failures:[error.message]})}
finally{await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify({synthetic:true,admin:'mocked metadata only, no login/save/publish/server mutation',results},null,2))}
const failures=results.filter(result=>result.failures.length)
console.log(JSON.stringify({output,cases:results.length,failed:failures.length,failures}))
process.exitCode=failures.length?1:0
