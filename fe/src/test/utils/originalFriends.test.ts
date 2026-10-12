// @vitest-environment node
import { expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { AVATAR_ICONS } from '@/components/cartoon/avatarConfig'
import preload from '@/assets/preloadAssets.json'

it('preserves 23 stable avatar slots and exports both materials without retired stock paths', () => {
  expect(AVATAR_ICONS).toHaveLength(23)
  expect(new Set(AVATAR_ICONS).size).toBe(23)
  for (const src of AVATAR_ICONS) for (const theme of ['orbit', 'paper']) {
    expect(src).toMatch(/^\/emcoin\/avatars\/orbit\/\d{2}\.webp$/)
    expect(fs.existsSync(path.join(process.cwd(), 'public', src.replace('/orbit/', `/${theme}/`)))).toBe(true)
  }
  expect(JSON.stringify(preload)).not.toContain('/cartoon/icons/')
  expect(fs.existsSync('public/cartoon/icons')).toBe(false)
})

it('checks all new asset fingerprints and rejects expired icon references in runtime source', () => {
  const manifest = JSON.parse(fs.readFileSync('../docs/design/original-friends-v1/asset-manifest.json', 'utf8'))
  expect(manifest.records).toHaveLength(106)
  for (const record of manifest.records) {
    const bytes = fs.readFileSync(path.join(process.cwd(), 'public', record.url))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256)
  }
  function walk(dir: string) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.name === 'test') continue
      const filename = path.join(dir, item.name)
      if (item.isDirectory()) walk(filename)
      else if (/\.(ts|tsx)$/.test(item.name)) expect(fs.readFileSync(filename, 'utf8'), filename).not.toContain('/cartoon/icons/')
    }
  }
  walk('src')
})
