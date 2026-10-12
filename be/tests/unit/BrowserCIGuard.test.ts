import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'

it('routes CI browser QA only to the owned isolated fixture and preserves evidence without legacy bypass', () => {
  const workflow = readFileSync(path.resolve(process.cwd(), '../.github/workflows/ci.yml'), 'utf8')
  const browserJob = workflow.slice(workflow.indexOf('\n  e2e:'), workflow.indexOf('\n  terminal:'))
  expect(browserJob).toContain('Isolated Browser QA (mock Redis)')
  expect(browserJob).toContain('node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts')
  expect(browserJob).toContain('TMPDIR: ${{ runner.temp }}')
  expect(browserJob).toContain('path: |')
  expect(browserJob).toContain('timeout-minutes: 20')
  expect(browserJob).toContain('--exclude tests/browser/terminal.browser.ts')
  for (const prefix of ['room', 'pwa', 'showcase', 'public-info']) {
    expect(browserJob).toContain('${{ runner.temp }}/emcoin-' + prefix + '-browser-qa-*/')
  }
  expect(browserJob).toContain('if: always()')
  expect(browserJob).toContain('retention-days: 3')
  for (const unsafe of ['EMCOIN_LEGACY_E2E_APPROVED', 'BASE_URL:', 'localhost:3001', 'localhost:5173', 'npm start &', 'npx playwright test', 'services:']) {
    expect(browserJob).not.toContain(unsafe)
  }
})

it('gives full-game terminal fixtures their own bounded job without widening short cases or external targets', () => {
  const workflow = readFileSync(path.resolve(process.cwd(), '../.github/workflows/ci.yml'), 'utf8')
  const terminalJob = workflow.slice(workflow.indexOf('\n  terminal:'))
  expect(terminalJob).toContain('needs: test')
  expect(terminalJob).toContain('timeout-minutes: 35')
  expect(terminalJob).toContain("node-version-file: '.nvmrc'")
  expect(terminalJob).toContain('run --config vitest.browser.config.ts tests/browser/terminal.browser.ts')
  expect(terminalJob).toContain('TMPDIR: ${{ runner.temp }}')
  expect(terminalJob).toContain('path: ${{ runner.temp }}/emcoin-terminal-browser-qa-*/')
  expect(terminalJob).toContain('if: always()')
  expect(terminalJob).toContain('retention-days: 3')
  for (const unsafe of ['EMCOIN_LEGACY_E2E_APPROVED', 'BASE_URL:', 'localhost:3001', 'localhost:5173', 'npm start &', 'npx playwright test', 'services:', '--testNamePattern', '--exclude']) {
    expect(terminalJob).not.toContain(unsafe)
  }
})
