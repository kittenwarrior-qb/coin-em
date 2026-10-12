import { chromium } from '@playwright/test'
import { mkdir, readdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
const root=path.resolve('docs/design/brand-prototypes-v1')
for(const [group,folder] of [['screens','brand-theme-qa'],['gameplay','gameplay-theme-qa'],['extra','screen-completeness-qa']]) {
  const dest=path.join(root,'all-screen-live',group)
  await mkdir(dest,{recursive:true})
  for(const file of await readdir(path.resolve('docs/design',folder))) if(file.endsWith('.png')) await copyFile(path.resolve('docs/design',folder,file),path.join(dest,file))
}
const browser=await chromium.launch()
try {
  const page=await browser.newPage({viewport:{width:1100,height:1050}})
  for(const theme of ['emotion-orbit','kindness-workshop'])for(const [group,pages] of [['screens',2],['gameplay',3],['extra',3]])for(let index=0;index<pages;index++) {
    await page.goto(`http://127.0.0.1:5174/all-screen-review.html?theme=${theme}&group=${group}&contact=1&page=${index}`)
    await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth))
    await page.screenshot({path:path.join(root,`audit-${theme}-${group}-${index}.png`),fullPage:true})
  }
}finally{await browser.close()}
console.log('Published screenshot collection and 16 contact sheets (synthetic/local presentation; 110 non-3D gallery entries).')
