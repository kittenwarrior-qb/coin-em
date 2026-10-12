import { expect, it } from 'vitest'
import manifest from '@/assets/pdfDeckAssets.json'
import { cardImageFit, pdfCardAspect } from '@/features/game/catalog/cardImageLayout'
it('retains every exported PDF face ratio instead of cropping it to a legacy2:3 face', () => {
  for (const record of manifest.records) {
    expect(pdfCardAspect(record.url)).toBe(`${record.width} / ${record.height}`)
    expect(cardImageFit(record.url)).toBe('contain')
  }
  expect(pdfCardAspect('/cards/legacy.png')).toBeUndefined()
  expect(cardImageFit('/cards/legacy.png')).toBe('cover')
})
