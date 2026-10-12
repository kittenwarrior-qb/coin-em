import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8')
const tokens = new Map([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]))

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map((value) => {
    const channel = parseInt(value, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

describe('non-card brand seam', () => {
  it('keeps secondary text and input edges legible on light surfaces', () => {
    const contrast = (a: string, b: string) => {
      const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
      return (values[0] + .05) / (values[1] + .05)
    }
    for (const background of ['#FFFFFF', tokens.get('--brand-ivory')!, tokens.get('--brand-sky-soft')!]) {
      expect(contrast(tokens.get('--brand-muted-ink')!, background)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(tokens.get('--brand-edge')!, background)).toBeGreaterThanOrEqual(3)
      expect(contrast(tokens.get('--brand-accent-ink')!, background)).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('keeps action labels on explicit dark ink, independent of legacy game colors', () => {
    expect(tokens.get('--ui-brand-action-bg')).toBe('var(--brand-sky)')
    expect(tokens.get('--ui-brand-secondary-bg')).toBe('var(--brand-blush)')
    expect(tokens.get('--ui-brand-action-ink')).toBe('var(--brand-ink)')
    expect(tokens.get('--ui-brand-secondary-ink')).toBe('var(--brand-ink)')
    expect(tokens.get('--brand-mint')).toBe('var(--brand-sky)')
    expect(tokens.get('--brand-sky')).toBe('#BFEAF1')
    expect(tokens.get('--brand-ink')).toBe('#20557F')
    for (const name of ['--brand-sky', '--brand-blush', '--brand-ivory']) {
      const contrast = (luminance(tokens.get(name)!) + 0.05) / (luminance(tokens.get('--brand-ink')!) + 0.05)
      expect(contrast).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('scopes brand styling to migrated controls without recoloring Coin/game semantics', () => {
    expect(tokens.get('--c-green')).toBe('#53B025')
    expect(tokens.get('--c-red')).toBe('#EB3C54')
    expect(tokens.get('--c-yellow')).toBe('#F5CC00')
    expect(tokens.get('--background')).toBe('var(--c-bg)')
    expect(tokens.get('--primary')).toBe('var(--c-blue-mid)')
    expect(tokens.get('--secondary')).toBe('var(--c-teal-light)')
    expect(tokens.get('--destructive')).toBe('var(--c-red)')
    const outsideTokenBlock = css.slice(css.indexOf('  /* === Palette'))
    expect(outsideTokenBlock).not.toMatch(/var\(--(?:brand|ui-brand)-/)
    expect(css).toContain('.cartoon-control[data-control-theme="mint-blush"]:focus-visible')
  })
})
