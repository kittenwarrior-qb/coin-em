// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { startupAssets } from '@/utils/startupAssets'

const report = JSON.parse(fs.readFileSync('../docs/design/brand-optimization.json', 'utf8'))
it('keeps source masters, exact dimensions/alpha and traceable optimized bytes', () => {
  expect(report.records).toHaveLength(17)
  expect(report.protectedCardFacesChanged).toBe(false)
  for (const record of report.records) {
    for (const [url, hash] of [[record.source, record.sourceSha256], [record.url, record.sha256]]) {
      const bytes = fs.readFileSync(path.join('public', url))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash)
    }
    expect(record.bytes).toBeLessThan(record.sourceBytes)
    expect(record.maxAlphaError).toBe(0)
    expect(record.meanVisibleRgbError).toBeLessThanOrEqual(3)
  }
})
it('limits the selected four startup assets to 1.6 MB, Orbit to 500 KB', () => {
  for (const theme of ['emotion-orbit', 'kindness-workshop'] as const) {
    const bytes = startupAssets(theme).reduce((sum, item) => sum + fs.statSync(path.join('public', item.url)).size, 0)
    expect(bytes).toBeLessThan(theme === 'emotion-orbit' ? 500000 : 1600000)
  }
})
it('preloads only four real Kawaii assets under 200 KB, never the prototype source or old masters',()=>{
  const assets=startupAssets('candy-clouds')
  expect(assets).toHaveLength(4)
  expect(assets.some(item=>item.url.endsWith('/coin-mark.webp'))).toBe(true)
  expect(assets.every(item=>!item.url.includes('/prototypes/'))).toBe(true)
  expect(assets.reduce((sum,item)=>sum+fs.statSync(path.join('public',item.url)).size,0)).toBeLessThan(200000)
})
