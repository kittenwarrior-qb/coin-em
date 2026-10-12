import { chromium, expect } from '@playwright/test'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
const require = createRequire(import.meta.url)
const express = require('../../be/node_modules/express')
const { CatalogStore } = require('../../be/dist/catalog/CatalogStore.js')
const { pdfCatalogDraft } = require('../../be/dist/catalog/pdfDraft.js')
const { registerPublicCatalogApi } = require('../../be/dist/catalog/publicCatalogApi.js')
const base = process.argv[2]
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base ?? '')) throw new Error('Owned loopback preview required')
const output = path.resolve('docs/qa/public-catalog')
await mkdir(output, { recursive: true })
const store = new CatalogStore(':memory:')
store.seed(pdfCatalogDraft().map(card => ({ ...card, reviewed: true })))
const version = store.snapshot(1, randomUUID()).version
store.activate(version, 2, randomUUID())
const app = express(); registerPublicCatalogApi(app, () => store)
const server = createServer(app)
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const api = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch()
const results = []
try {
  for (const theme of ['emotion-orbit','kindness-workshop']) for (const [width,height] of [[320,400],[430,932],[1280,900]]) {
    const page = await browser.newPage({ viewport: { width,height }, reducedMotion: 'reduce' })
    const errors = []; let unavailable = false
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/catalog/**', async route => {
      const pathname = new URL(route.request().url()).pathname
      if (unavailable && pathname.endsWith('/active')) return route.fulfill({ status:503,contentType:'application/json',body:JSON.stringify({error:'QA_CATALOG_OUTAGE'}) })
      const response = await route.fetch({ url: `${api}${pathname}` })
      return route.fulfill({ response })
    })
    const capture = async (name) => {
      await page.waitForTimeout(300) // Let the real modal transition/lazy requests settle before capturing.
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      if (overflowX || errors.length) throw new Error(`Layout/page error: ${errors.join(',')}`)
      await page.screenshot({ path:path.join(output,`${theme}-${width}-${name}.png`), fullPage:name !== 'preview' })
      results.push({theme,width,height,name,result:'passed',overflowX})
    }
    try {
      await page.goto(`${base}/about/cards?theme=${theme}`)
      await expect(page.locator('.catalog-card')).toHaveCount(103)
      await expect(page.getByRole('button',{name:'Xem thẻ VT-001: Người Quản trò',exact:true})).toBeVisible()
      // Real intersection/lazy behavior, not deleting reveal styles or fabricating an image.
      const galleryHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      for (let y=0; y<galleryHeight; y+=height*.75) { await page.evaluate(y=>scrollTo(0,y),y); await page.waitForTimeout(80) }
      await page.evaluate(() => scrollTo(0,0))
      await capture('gallery')
      await page.getByRole('button',{name:'Cảm xúc 32',exact:true}).click()
      const opener = page.getByRole('button',{name:'Xem thẻ CX-017: Yêu mến',exact:true})
      await opener.click()
      const dialog = page.getByRole('dialog',{name:'Yêu mến',exact:true})
      await expect(dialog.getByRole('img',{name:'Yêu mến · Mặt trước',exact:true})).toHaveAttribute('src','/emcoin/decks/pdf-v1/page-083.webp')
      await dialog.getByRole('button',{name:'Xem mặt sau',exact:true}).click()
      const face = dialog.getByRole('img',{name:'Yêu mến · Mặt sau',exact:true})
      await expect(face).toHaveAttribute('src','/emcoin/decks/pdf-v1/page-084.webp')
      await expect.poll(() => face.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
      const box = await dialog.locator('.preview-card').boundingBox()
      if (!box || box.y < -1 || box.y + box.height > height + 1) throw new Error('Preview exceeds viewport')
      const closeBox = await dialog.getByRole('button',{name:'Đóng xem trước',exact:true}).boundingBox()
      const closeHit = closeBox && await page.evaluate(({x,y}) => {
        const target = document.elementFromPoint(x,y)
        return { reachable: Boolean(target?.closest('.preview-close')), blocker: target?.outerHTML.slice(0,300) }
      }, {x:closeBox.x+closeBox.width/2,y:closeBox.y+closeBox.height/2})
      if (!closeHit?.reachable) throw new Error(`Preview close covered: ${closeHit?.blocker ?? 'missing bounds'}`)
      await capture('preview')
      await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused()
      await opener.click(); await page.goBack(); await expect(dialog).toHaveCount(0)
      await expect(opener).toBeFocused(); expect(new URL(page.url()).pathname).toBe('/about/cards')
      await page.goto(`${base}/about?theme=${theme}`)
      const teaser = page.getByRole('link',{name:'Xem bộ thẻ 2D: Thẻ tình huống',exact:true})
      await expect(teaser.locator('img')).toHaveAttribute('src','/emcoin/decks/pdf-v1/page-019.webp')
      await teaser.scrollIntoViewIfNeeded(); await capture('about-teaser')
      await page.goto(`${base}/qa-screens.html?screen=lobby&theme=${theme}`)
      await page.getByRole('button',{name:'Cài đặt',exact:true}).click()
      await page.getByRole('button',{name:'Bộ thẻ',exact:true}).click()
      const inventory = page.getByRole('dialog',{name:'Bộ thẻ',exact:true})
      await expect(inventory.getByRole('button',{name:'pdf-v1-role-1',exact:true})).toBeVisible()
      await expect(inventory.getByText('Người Quản trò',{exact:true})).toBeVisible()
      await expect.poll(() => inventory.locator('img[src^="/emcoin/decks/"]').evaluateAll(images => images.every(image=>image.complete && image.naturalWidth>0))).toBe(true)
      await capture('public-menu')
      await page.keyboard.press('Escape'); await expect(inventory).toHaveCount(0)
      unavailable = true; await page.goto(`${base}/about/cards?theme=${theme}`)
      await expect(page.getByRole('button',{name:'Thử lại',exact:true})).toBeVisible()
      await expect(page.locator('.catalog-card')).toHaveCount(0)
      await capture('outage')
      unavailable = false; await page.getByRole('button',{name:'Thử lại',exact:true}).click()
      await expect(page.locator('.catalog-card')).toHaveCount(103)
    } catch (error) { results.push({theme,width,height,result:'failed',error:error.message,errors}); console.log(JSON.stringify({theme,width,error:error.message})); await page.screenshot({path:path.join(output,`${theme}-${width}-failure.png`),fullPage:true}).catch(()=>{}) }
    finally { await page.close() }
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); store.close() }
await writeFile(path.join(output,'report.json'),JSON.stringify({version,scope:'actual isolated SQLite/published-only HTTP API proxied to owned frontend; pointer503 fault injection; not deployment/device/native/3D GPU evidence',results},null,2))
const failures = results.filter(result => result.result !== 'passed')
console.log(JSON.stringify({cases:results.length,failures})); if (failures.length) process.exitCode=1
