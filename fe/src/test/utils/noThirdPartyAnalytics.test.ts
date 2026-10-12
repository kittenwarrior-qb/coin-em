import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('owner-approved removal of external analytics', () => {
  it('keeps deployment, proxy and environment templates free of removed tracking services', () => {
    const root = path.resolve(process.cwd(), '..')
    for (const file of ['docker-compose.prod.yml', 'docker-compose.dev.yml', 'Caddyfile', '.env.example',
      'fe/package.json', 'be/package.json', '.github/workflows/deploy.yml']) {
      expect(fs.readFileSync(path.join(root, file), 'utf8'), file).not.toMatch(/umami|data-website-id/i)
    }
  })
  it('keeps application/PWA entry points without Umami or a replacement tracking script', () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')
    expect(html).not.toMatch(/admin\.emcoin\.cloud\/script\.js|data-website-id|umami/i)
    expect(html).not.toMatch(/<script[^>]+src=["']https?:\/\//i)
    expect(html).toContain('src="/src/main.tsx"')
    expect(html).toContain('%BASE_URL%manifest.webmanifest')
    expect(html).toContain('id="root"')
  })
})
