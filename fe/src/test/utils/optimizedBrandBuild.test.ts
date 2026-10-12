// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { pruneOptimizedMasters } from '../../../pwa/optimizedBrandBuild'

const records = JSON.parse(fs.readFileSync('../docs/design/brand-optimization.json', 'utf8')).records
const owned: string[] = []
afterEach(() => { for (const directory of owned.splice(0)) fs.rmSync(directory, { recursive: true, force: true }) })

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emcoin-optimized-build-'))
  owned.push(directory)
  for (const record of records) {
    const target = path.join(directory, 'dist', record.url)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join('public', record.url), target)
    fs.writeFileSync(path.join(directory, 'dist', record.source), 'generated PNG master fixture')
  }
  return directory
}
it('removes only generated masters after validating replacements, leaving source and unrelated output alone', () => {
  const directory = fixture()
  const untouched = path.join(directory, 'dist', 'owned-card.png')
  fs.writeFileSync(untouched, 'card fixture')
  expect(pruneOptimizedMasters(directory, 'dist', records)).toBe(17)
  expect(fs.readFileSync(untouched, 'utf8')).toBe('card fixture')
  expect(fs.existsSync(path.join('public', records[0].source))).toBe(true)
  expect(pruneOptimizedMasters(directory, 'dist', records)).toBe(0)
})
it('rejects unsafe output or mismatched replacements before deleting any copy', () => {
  const directory = fixture()
  expect(() => pruneOptimizedMasters(directory, 'public', records)).toThrow('UNSAFE_OPTIMIZED_OUTPUT')
  fs.writeFileSync(path.join(directory, 'dist', records[16].url), 'wrong bytes')
  expect(() => pruneOptimizedMasters(directory, 'dist', records)).toThrow('MISSING_OPTIMIZED_REPLACEMENT')
  for (const record of records) expect(fs.existsSync(path.join(directory, 'dist', record.source))).toBe(true)
})
