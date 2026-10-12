import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'

it('fails closed for manual production backups without touching existing archives', () => {
  const source = readFileSync(path.resolve(process.cwd(), '../Makefile'), 'utf8')
  const recipe = source.match(/^backup:\r?\n((?:\t[^\n]*\n)+)/m)?.[1]
  expect(recipe?.replaceAll('\r', '')).toBe(
    '\t@echo "Backup disabled by owner policy. Existing archives are not modified."\n\t@exit 1\n',
  )
  expect(source).toContain('make backup       - Disabled: owner opted out of room/VPS backups')
  expect(recipe).not.toMatch(/docker|mkdir|\bcp\b|\brm\b|backup\/data/)
})

it('keeps synthetic recovery drills separate and copies only the public policy input for clean QA', () => {
  const source = readFileSync(path.resolve(process.cwd(), '../Makefile'), 'utf8')
  for (const target of ['backup-fixture', 'restore-fixture']) {
    const recipe = source.match(new RegExp(`^${target}:\\r?\\n((?:\\t[^\\n]*\\n)+)`, 'm'))?.[1]
    expect(recipe?.trim()).toBe('cd be && npx vitest run tests/integration/recovery-fixture.test.ts -t "restores a checksummed fixture"')
  }
  const runner = readFileSync(path.resolve(process.cwd(), 'scripts/test-clean-toolchain.mjs'), 'utf8')
  expect(runner).toContain("cp(path.join(root, 'Makefile'), path.join(workspace, 'Makefile'))")
})
