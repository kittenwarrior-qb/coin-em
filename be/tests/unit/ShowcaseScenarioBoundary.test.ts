import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'

it('isolates three complete showcase lifecycles without weakening switch or timeout checks', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'tests/browser/showcase.browser.ts'), 'utf8')
  expect(source).toContain("test.each(['unsupported-webgl', 'switches-context-loss', 'missing-texture'] as const)")
  for (const scenario of ['unsupported-webgl', 'switches-context-loss', 'missing-texture']) {
    expect(source).toContain(`if (scenario === '${scenario}')`)
  }
  expect(source).toContain('index < 100')
  expect(source).toContain('completedRoleCardSwitches++')
  expect(source).toContain("version: 'showcase-lifecycle-qa/v2', scenario")
  expect(source).toContain('roleCardSwitches: completedRoleCardSwitches')
  expect(source).toContain('extension.loseContext()')
  expect(source).toContain('extension.restoreContext()')
  expect(source).toContain("missing.route('**/card-showcase/role/*', route => route.abort())")
  expect(source).toContain('170_000')
  expect(source).not.toContain('roleCardSwitches: result')
  expect(source).not.toMatch(/test\.(skip|todo)|\.click\(\{\s*force/)
})
