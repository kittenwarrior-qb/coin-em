import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const base = process.argv[2]
assert.ok(base?.startsWith('http://127.0.0.1:'))
const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const width of [320, 430, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.goto(base + '/qa-screens.html?screen=lobby')
    await page.getByTestId('btn-join-room').click()
    await page.getByRole('textbox').first().waitFor()
    const fields = await page.locator('input:not([type="checkbox"]):not([type="radio"])').evaluateAll(nodes => {
      const lum = value => {
        const rgb = value.match(/[\d.]+/g).slice(0, 3).map(Number).map(c => {
          c /= 255
          return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4
        })
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
      }
      const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05)
      return nodes.map(el => {
        const style = getComputedStyle(el)
        return { label: el.placeholder, text: ratio(style.color, style.backgroundColor), placeholder: ratio(getComputedStyle(el, '::placeholder').color, style.backgroundColor), edge: ratio(style.borderTopColor, style.backgroundColor) }
      })
    })
    assert.ok(fields.length)
    for (const field of fields) assert.ok(field.text >= 4.5 && field.placeholder >= 4.5 && field.edge >= 3, JSON.stringify(field))
    await page.goto(base + '/about/cards')
    await page.locator('.deck-tabs button').first().waitFor()
    const tabs = await page.locator('.deck-tabs button').evaluateAll(nodes => nodes.map(el => {
      const style = getComputedStyle(el)
      return { material: style.borderImageSource, slice: style.borderImageSlice, background: style.backgroundImage, selected: el.classList.contains('is-active'), underline: style.textDecorationLine }
    }))
    assert.ok(tabs.length)
    for (const tab of tabs) {
      assert.ok(tab.material.includes('/pill-'))
      assert.equal(tab.slice, '0 80 fill')
      assert.equal(tab.background, 'none')
      if (tab.selected) assert.ok(tab.underline.includes('underline'))
    }
    results.push({ width, fields, tabs: tabs.length })
    await page.close()
  }
  console.log(JSON.stringify({ passed: true, results }, null, 2))
} finally { await browser.close() }
