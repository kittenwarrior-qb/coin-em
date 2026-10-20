// Synthetic, read-only local review. Never contacts production or submits gameplay.
import { chromium } from '@playwright/test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base = new URL(process.argv[2])
if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw Error('Owned loopback fixture required')
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-candy-design-'))
const browser = await chromium.launch()
const results = []
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  await page.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort())
  const phases = ['role-reveal','night','healer-turn','silencer-turn','situation-card','emotion-card','story-telling','group-response','reflection-card','reflection-sharing','selfcare-card','hug-action','guess-silencer','reveal-silencer','give-coins','reward','ended']
  const screens = ['lobby','menu','create','join','guide','waiting','history','give-picker','role-reward','ntg-reward','guess-picker','night-confirm','phase-confirm','muted','reflection-confirm','success-toast','card-preview']
  for (const name of [...screens, ...phases.map(p => `phase-${p}`)]) {
    const phase = name.startsWith('phase-') && name !== 'phase-confirm' ? name.slice(6) : null
    const home = ['menu','create','join','guide'].includes(name)
    await page.goto(new URL(phase ? `/qa-board.html?count=10&phase=${phase}&theme=candy-clouds` : `/qa-screens.html?stress=1&screen=${home ? 'lobby' : name}&theme=candy-clouds`, base).href)
    await page.getByTestId(phase ? 'qa-fixture' : 'screen-qa-fixture').waitFor()
    await page.evaluate(() => document.fonts.ready)
    if (name === 'menu') await page.getByRole('button', {name:'Cài đặt', exact:true}).click()
    if (name === 'create' || name === 'join') await page.getByTestId(`btn-${name}-room`).click()
    if (name === 'guide') await page.getByRole('button', {name:'Hướng dẫn',exact:true}).click()
    await page.waitForTimeout(1800)
    const overflow = await page.evaluate(() => document.scrollingElement.scrollHeight > innerHeight + 1 || document.scrollingElement.scrollWidth > innerWidth + 1)
    const filename = `${name}.png`
    await page.screenshot({ path: path.join(output, filename) })
    results.push({ name, filename, documentOverflow: overflow })
  }
  await page.close()
  // Contact sheets are diagnostic screenshot montages, not prototype artwork.
  const sheet = await browser.newPage({viewport:{width:840,height:960}})
  for (let start=0; start<results.length; start+=8) {
    const cells = await Promise.all(results.slice(start,start+8).map(async r => `<figure><figcaption>${r.name}</figcaption><img src="data:image/png;base64,${(await readFile(path.join(output,r.filename))).toString('base64')}"></figure>`))
    await sheet.setContent(`<style>body{margin:0;padding:12px;background:#e2e9ef;display:grid;grid-template-columns:repeat(4,195px);gap:12px;font:12px Arial;color:#214e63}figure{margin:0}figcaption{height:22px}img{width:195px;display:block}</style>${cells.join('')}`)
    await sheet.screenshot({path:path.join(output,`sheet-${start/8+1}.png`),fullPage:true})
  }
} finally { await browser.close() }
await writeFile(path.join(output,'report.json'),JSON.stringify({synthetic:true,excluded:['3d','production auth','native devices'],results},null,2))
console.log(JSON.stringify({output,cases:results.length,overflows:results.filter(r=>r.documentOverflow)}))
process.exitCode = results.some(r=>r.documentOverflow) ? 1 : 0
