import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { cleanSourceEntryAllowed } from '../../scripts/clean-source-policy.mjs'

it('builds the isolated admin production preview before opt-in browser execution', () => {
  const workflow = readFileSync(path.resolve(process.cwd(), '../.github/workflows/ci.yml'), 'utf8')
  const browserJob = workflow.slice(workflow.indexOf('\n  e2e:'))
  const build = browserJob.indexOf('name: Build isolated production preview for admin QA')
  const execute = browserJob.indexOf('run: node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts')
  expect(build).toBeGreaterThan(browserJob.indexOf('name: Install all deps'))
  expect(execute).toBeGreaterThan(build)
  expect(browserJob.slice(build, execute)).toContain('run: npm run build')
  expect(browserJob.slice(build, execute)).toContain("VITE_DEBUG_ROLE_PICKER: 'false'")
  expect(browserJob).toContain('${{ runner.temp }}/emcoin-admin-browser-qa-*/')
  expect(browserJob).not.toMatch(/secrets\.|VPS_HOST|SSH_KEY|compose up/)
})

it('checks actual local manifest content in CI without fetching or replacing card images', () => {
  const workflow = readFileSync(path.resolve(process.cwd(), '../.github/workflows/ci.yml'), 'utf8')
  const check = workflow.indexOf('name: Verify unchanged asset manifest')
  expect(check).toBeGreaterThan(workflow.indexOf('name: Install frontend deps'))
  expect(check).toBeLessThan(workflow.indexOf('\n  e2e:'))
  expect(workflow.slice(check, check + 160)).toContain('run: node scripts/verify-asset-manifest.mjs')
  const verifier = readFileSync(path.resolve(process.cwd(), '../fe/scripts/verify-asset-manifest.mjs'), 'utf8')
  expect(verifier).toContain('metadata.width !== record.width')
  expect(verifier).toContain('ASSET_MANIFEST_CONTENT_MISMATCH')
  expect(verifier).not.toMatch(/fetch\(|writeFile|https?:\/\//)
})

it('uses the same clean-tested supported Node default for every CI job and all Docker Node stages', () => {
  const root = path.resolve(process.cwd(), '..')
  const version = readFileSync(path.join(root, '.nvmrc'), 'utf8').trim()
  expect(version).toBe('22.23.3')
  const workflow = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8')
  const jobNames = ['test', 'e2e', 'terminal']
  expect(workflow.match(/node-version-file: '\.nvmrc'/g)).toHaveLength(jobNames.length)
  for (const [i, name] of jobNames.entries()) {
    const start = workflow.indexOf(`\n  ${name}:`)
    expect(start).toBeGreaterThan(0)
    const next = jobNames[i + 1]
    const job = workflow.slice(start, next ? workflow.indexOf(`\n  ${next}:`) : undefined)
    expect(job.match(/node-version-file: '\.nvmrc'/g)).toHaveLength(1)
  }
  expect(workflow).not.toMatch(/node-version:/)
  for (const file of ['be/Dockerfile.dev', 'be/Dockerfile.prod', 'fe/Dockerfile.dev', 'fe/Dockerfile.prod']) {
    const source = readFileSync(path.join(root, file), 'utf8')
    const stages = source.split('\n').filter(line => /^FROM node:/.test(line))
    expect(stages.length).toBeGreaterThan(0)
    for (const stage of stages) expect(stage).toMatch(new RegExp(`^FROM node:${version.replaceAll('.', '\\.')}-alpine(?: AS builder)?\\r?$`))
    expect(source).not.toContain('node:20')
  }
})

it('keeps inventory helpers and parity inputs in the isolated clean matrix without copying user state', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'scripts/test-clean-toolchain.mjs'), 'utf8')
  expect(source).toContain("'src', 'public', 'pwa', 'scripts'")
  expect(source).toContain("cp(path.join(root, '.nvmrc')")
  expect(source).toContain("process.version !== `v${expectedNode}`")
  expect(source).toContain('filter: cleanSourceEntryAllowed')
  expect(source).toContain("npm_config_cache: path.join(output, 'npm-cache')")
  expect(source).not.toContain('FLUSH')
  expect(source).not.toMatch(/\brm\(|git reset|npm install/)
})

it('preserves legitimate nested src/data while excluding generated and private entries', () => {
  for (const relative of ['src/data', 'src/data/cards.ts', 'src/constants/cardCatalog.ts', 'public/cartoon']) {
    expect(cleanSourceEntryAllowed(path.resolve(relative))).toBe(true)
  }
  for (const name of ['node_modules', 'dist', 'test-data', '.env', '.env.local', '.ENV.PRODUCTION', '.npmrc']) {
    expect(cleanSourceEntryAllowed(path.resolve('src', name))).toBe(false)
  }
})

it('uses the same protected-source policy for disposable Docker contexts, not a whole checkout or runtime data', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'scripts/test-docker-toolchain.mjs'), 'utf8')
  expect(source).toContain("import { cleanSourceEntryAllowed } from './clean-source-policy.mjs'")
  expect(source).toContain('cleanSourceEntryAllowed(source) && !(await lstat(source)).isSymbolicLink()')
  expect(source).not.toContain("'dist', 'data'")
  expect(source).toContain("cp(path.join(cleanRoot, 'workspace', name, entry)")
  expect(source).toContain("'src', 'public', 'pwa'")
  expect(source).not.toMatch(/\['(?:push|system|volume)',|--(?:mount|volume)|\bprune\b(?!d)/)
})
