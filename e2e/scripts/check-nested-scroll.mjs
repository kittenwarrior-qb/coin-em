import { chromium } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base = new URL(process.argv[2])
if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw Error('Owned loopback fixture required')
const output = await mkdtemp(path.join(os.tmpdir(),'emcoin-nested-scroll-'))
const browser = await chromium.launch()
const results=[]
try {
  for(const theme of (process.argv.includes('--candy-only')?['candy-clouds']:['emotion-orbit','kindness-workshop','candy-clouds'])) for(const [width,height] of [[320,400],[390,844],[844,390]]) {
    const page=await browser.newPage({viewport:{width,height}})
    await page.route('**/*',route=>new URL(route.request().url()).origin===base.origin?route.continue():route.abort())
    await page.route('**/api/catalog/active',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:'web-card-baseline/v1'})}))
    await page.goto(new URL(`/qa-screens.html?theme=${theme}`,base).href)
    await page.getByRole('button',{name:'Cài đặt',exact:true}).click()
    await page.getByRole('dialog',{name:'Menu',exact:true}).waitFor()
    for(const close of ['escape','back']) for(const [button,title] of [['Giao diện','Chọn giao diện'],['Hướng dẫn','Hướng dẫn'],['Bộ thẻ','Bộ thẻ']]) {
      const label=`${theme}-${width}x${height}-${title}-${close}`
      try {
        await page.getByRole('dialog',{name:'Menu',exact:true}).getByRole('button',{name:button,exact:true}).click()
        const dialog=page.getByRole('dialog',{name:title,exact:true})
        await dialog.waitFor()
        await page.waitForTimeout(500)
        const before=await page.evaluate(()=>({w:document.scrollingElement.scrollWidth,h:document.scrollingElement.scrollHeight,focusInTop:!!document.activeElement.closest('[role="dialog"][aria-modal="true"]')}))
        if(before.w>width+1||before.h>height+1||!before.focusInTop)throw Error(`Nested geometry/focus ${JSON.stringify(before)}`)
        if(close==='back')await page.goBack()
        else await page.keyboard.press('Escape')
        await dialog.waitFor({state:'hidden'})
        await page.getByRole('dialog',{name:'Menu',exact:true}).waitFor()
        await page.getByRole('dialog',{name:'Menu',exact:true}).getByRole('button',{name:button,exact:true}).waitFor({state:'visible'})
        await page.waitForFunction(text=>document.activeElement.textContent.trim().includes(text),button)
        results.push({theme,width,height,title,close,result:'passed'})
      }catch(error){results.push({theme,width,height,title,close,result:'failed',error:error.message});await page.screenshot({path:path.join(output,`${label}.png`)});break}
    }
    await page.goto(new URL(`/qa-screens.html?theme=${theme}`,base).href)
    await page.getByTestId('btn-create-room').click()
    const input=page.getByRole('textbox').first()
    await input.fill('QA keyboard draft')
    await page.setViewportSize({width,height:300})
    await page.waitForTimeout(500)
    const form=await page.evaluate(()=>({h:document.scrollingElement.scrollHeight,w:document.scrollingElement.scrollWidth,input:document.activeElement.tagName}))
    const text=await input.inputValue()
    const dialog=page.getByRole('dialog',{name:'Tạo phòng',exact:true})
    await dialog.locator('[data-ui-surface="modal"]').evaluate(el=>{el.scrollTop=el.scrollHeight})
    const submit=dialog.getByRole('button',{name:'Tạo phòng',exact:true})
    const submitReachable=await submit.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight+1&&!!hit&&(el===hit||el.contains(hit))})
    const passed=form.h<=301&&form.w<=width+1&&text==='QA keyboard draft'&&submitReachable
    results.push({theme,width,height,title:'focused-form-shrink',result:passed?'passed':'failed',geometry:form,submitReachable})
    if(!passed)await page.screenshot({path:path.join(output,`${theme}-${width}x${height}-form.png`)})
    await page.setViewportSize({width,height})
    if(await input.inputValue()!=='QA keyboard draft')throw Error('Draft lost on restore')
    await page.close()
  }
}finally{await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify({synthetic:true,keyboard:'viewport simulation only',results},null,2))}
const failures=results.filter(item=>item.result!=='passed')
console.log(JSON.stringify({output,cases:results.length,failed:failures.length,failures}))
process.exitCode=failures.length?1:0
