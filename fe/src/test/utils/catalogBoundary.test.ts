import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { CARD_DATA } from '@/constants/cardCatalog'
import { buttonVariants } from '@/components/ui/buttonVariants'

const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
describe('unchanged catalog and UI variant boundaries', () => {
  it('preserves the fingerprints captured from the original modules before relocation', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
    const sizes = ['default', 'sm', 'lg', 'icon'] as const
    const classes = variants.flatMap(variant => sizes.map(size => buttonVariants({ variant, size })))
    expect(fingerprint(CARD_DATA)).toBe('3b53bca9e07d00eda101ba5412c1f6bf95df0686ba42cfceb62c20a34b6606a4')
    expect(fingerprint(classes)).toBe('082ceb0864037ee8438680915931436be3183d4ea2cba7c7f6ec80a9fdcb66af')
    expect([...CARD_DATA.roles, ...CARD_DATA.situation, ...CARD_DATA.reflection, ...CARD_DATA.selfcare, ...CARD_DATA.emotion]).toHaveLength(100)
  })
})
