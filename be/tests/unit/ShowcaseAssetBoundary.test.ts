import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'

it('owns independent original-model and sticker browser cases without weakening real switch checks', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'tests/browser/showcase-assets.browser.ts'), 'utf8')
  const config = readFileSync(path.resolve(process.cwd(), 'vitest.browser.config.ts'), 'utf8')
  for (const invariant of ["test.each(['models', 'stickers'] as const)", 'index < 100', 'completedSwitches++',
    "version: 'showcase-assets-qa/v2'", "scenario === 'models' ? 8 : 19", 'toHaveLength(count)',
    'requests === 1', "requests.get('/stickers/outlines.json')", 'index < 20', 'extension.loseContext()',
    'extension.restoreContext()', 'next.click()', "channel: 'chromium'", "inputMode: 'pointer'", '170_000', 'windowsHide: true', 'route.abort()', 'await report()',
    'await browser?.close(); vite.kill()']) expect(source).toContain(invariant)
  expect(config).toContain('testTimeout: 180_000')
  expect(source).not.toMatch(/test\.(skip|todo)|\.click\(\{\s*force|process\.env|https:\/\//)
})
