import { chromium } from '@playwright/test'
import { readFile, access, mkdtemp, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'

const base = new URL(process.argv[2] || 'http://127.0.0.1:5183')
if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw Error('Owned loopback only')
const catalog = JSON.parse(await readFile('fe/src/test/fixtures/pdfCatalog.json', 'utf8'))
const output = await mkdtemp(path.join(os.tmpdir(), 'emcoin-real-card-motion-'))
const checks = [], failures = []
const browser = await chromium.launch()
async function check(label, run) {
  try { await run(); checks.push(label) } catch (error) { failures.push({ label, message: error.message }) }
}
try {
  await check('100 unique original card IDs and existing paired assets', async () => {
    assert.equal(catalog.length, 100); assert.equal(new Set(catalog.map(c => c.id)).size, 100)
    for (const card of catalog) for (const url of [card.frontImageUrl, card.backImageUrl]) {
      assert.match(url, /^\/emcoin\/decks\/pdf-v1\/page-\d{3}\.webp$/)
      await access(path.join('fe/public', url))
    }
  })
  for (const reducedMotion of ['no-preference', 'reduce']) for (const [width, height] of [[310, 558], [320, 400], [390, 844], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion })
    await page.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort())
    for (const [phase, category] of [['situation-card', 'situation'], ['emotion-card', 'emotion'], ['reflection-card', 'reflection'], ['selfcare-card', 'selfcare']]) {
      await check(`${phase} paired flip / selection / bounded animation ${width}x${height} ${reducedMotion}`, async () => {
        await page.goto(new URL(`/candy-prototypes.html?layout=B&phase=${phase}`, base).href)
        const cardButton = page.locator('.cp-cards .cp-real-card').first()
        await cardButton.waitFor()
        const id = await cardButton.getAttribute('data-card-id'), card = catalog.find(c => c.id === id)
        assert.equal(card.category, category)
        assert.equal(await cardButton.locator('img').getAttribute('src'), card.backImageUrl)
        await cardButton.click()
        const preview = page.locator('.cp-real-preview')
        assert.equal(await preview.getAttribute('data-card-id'), id)
        assert.equal(await preview.locator('.cp-flip-face').first().locator('img').getAttribute('src'), card.frontImageUrl)
        assert.equal(await preview.locator('.cp-flip-back img').getAttribute('src'), card.backImageUrl)
        assert.equal(await page.locator('.cp-card.selected').count(), 0, 'Preview must not select')
        await preview.evaluate(async element=>{await Promise.all(element.getAnimations().map(animation=>animation.finished))})
        const before = await preview.boundingBox()
        await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
        for (let i = 0; i < 4; i++) {
          await page.waitForTimeout(120)
          const box = await preview.boundingBox()
          assert.deepEqual(box, before, 'Flip must not change layout bounds')
          const overflow = await page.evaluate(() => [document.documentElement, document.body, ...document.querySelectorAll('.cp-dialog-body,.cp-phone,.cp-arena')].filter(e => e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2).map(e => e.className))
          assert.deepEqual(overflow, [])
        }
        assert.equal(await preview.getAttribute('data-face'), 'back')
        const styles = await preview.locator('.cp-card-flipper').evaluate(e => ({ duration: getComputedStyle(e).transitionDuration, fits: [...e.querySelectorAll('img')].every(i => getComputedStyle(i).objectFit === 'contain' && getComputedStyle(i).filter === 'none' && i.naturalWidth > 0) }))
        assert.equal(styles.fits, true)
        assert.equal(styles.duration, reducedMotion === 'reduce' ? '0s' : '0.48s')
        await page.getByRole('button', { name: 'Chọn thẻ mẫu', exact: true }).click()
        await page.locator('dialog[open]').waitFor({state:'hidden'})
        assert.equal(await page.locator('.cp-card.selected').getAttribute('data-card-id'), id)
        assert.equal(await page.locator('.cp-card.selected img').getAttribute('src'), card.frontImageUrl)
        if (phase === 'reflection-card' && reducedMotion === 'no-preference') await page.screenshot({ path: path.join(output, `real-cards-${width}x${height}.png`) })
      })
    }
    await page.close()
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await check('Inventory exposes every original ID in five paginated categories', async () => {
    const found = new Set()
    await page.goto(new URL('/candy-prototypes.html?panel=inventory', base).href)
    for (const category of ['role', 'situation', 'emotion', 'reflection', 'selfcare']) {
      await page.locator('dialog select').selectOption(category)
      const cards = catalog.filter(c => c.category === category && !c.archived)
      const capacity=Number(await page.locator('.cp-real-inventory').getAttribute('data-capacity'))
      for (let i = 0; i < Math.ceil(cards.length / capacity); i++) {
        for (const button of await page.locator('.cp-real-inventory>button').all()) {
          const id = await button.getAttribute('data-card-id'), card = cards.find(c => c.id === id)
          assert.ok(card); found.add(id)
          assert.equal(await button.locator('img').getAttribute('src'), card.frontImageUrl)
        }
        if (i < Math.ceil(cards.length / capacity) - 1) await page.getByRole('button', { name: 'Bộ thẻ sau', exact: true }).click()
      }
    }
    assert.equal(found.size, catalog.length)
  })
  await page.close()
} finally { await browser.close() }
await writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, failures }, null, 2))
console.log(JSON.stringify({ output, checks: checks.length, failures }, null, 2))
if (failures.length) process.exitCode = 1
