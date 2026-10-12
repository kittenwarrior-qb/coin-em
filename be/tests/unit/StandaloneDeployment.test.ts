import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { pdfCatalogDraft } from '../../src/catalog/pdfDraft'

const source = (file: string) => readFileSync(path.resolve(process.cwd(), '..', file), 'utf8')

it('keeps detached frontend PDF test data equal to the canonical backend source', () => {
  expect(JSON.parse(source('fe/src/test/fixtures/pdfCatalog.json'))).toEqual(pdfCatalogDraft())
})

it('isolates the fresh EmCoin stack and fails closed without domain/admin provisioning', () => {
  const compose = source('deploy/emcoin/compose.yml')
  expect(compose).toContain('name: emcoin')
  expect(compose).toContain('EMCOIN_DOMAIN:?')
  expect(compose).toContain('EMCOIN_ADMIN_PASSWORD_HASH:?')
  expect(compose).toContain('ROOM_STORAGE_MODE: redis-required')
  expect(compose).toContain('NODE_ENV: production')
  expect(compose).toContain('DEBUG_ROLE_PICKER: "false"')
  expect(compose).toContain('--appendfsync, always')
  expect(compose).toContain('EMCOIN_CATALOG_DB: /app/data/catalog.sqlite')
  expect(compose).toContain('max-size: 10m')
  for (const forbidden of ['umami', 'fe-dist', 'container_name:', '6379:6379', '3001:3001', 'docker.sock', 'privileged:', 'rm -rf']) {
    expect(compose).not.toContain(forbidden)
  }
})

it('gates GitHub release by exact successful main CI and strict SSH without rebuilding on the host', () => {
  const workflow = source('.github/workflows/deploy.yml')
  for (const gate of ["conclusion == 'success'", "head_branch == 'main'", "event == 'push'", 'head_repository.full_name == github.repository', 'environment: production', 'cancel-in-progress: false', 'StrictHostKeyChecking=yes', 'secrets.VPS_KNOWN_HOSTS', 'sha256sum', '103.74.102.24', 'persist-credentials: false']) expect(workflow).toContain(gate)
  expect(workflow).not.toContain('appleboy/ssh-action')
  expect(workflow).not.toContain('git checkout')
  const deploy = source('deploy/emcoin/deploy-release.sh')
  for (const gate of ['.deploy-ready', '24.04', 'flock -n', 'sha256sum -c', 'automatic update refused', 'org.opencontainers.image.revision', '--no-build --pull never', 'https://app.emcoin.cloud/health']) expect(deploy).toContain(gate)
  for (const unsafe of ['docker build', 'docker compose down', 'rm -rf', 'prune', 'FLUSHALL']) expect(deploy).not.toContain(unsafe)
  const runtime = source('deploy/emcoin/runtime.yml')
  expect(runtime).not.toContain('build:')
  expect(runtime).toContain('EMCOIN_BACKEND_IMAGE:?')
  expect(runtime).toContain('EMCOIN_WEB_IMAGE:?')
  expect(deploy.indexOf('initializeFreshCatalog')).toBeLessThan(deploy.indexOf('up -d --no-build'))
})

it('embeds frontend files in the web image and routes only EmCoin with no private logs', () => {
  const dockerfile = source('deploy/emcoin/web.Dockerfile')
  expect(dockerfile).toContain('FROM node:22.23.3-alpine AS builder')
  expect(dockerfile).toContain('COPY --from=builder /app/dist /srv')
  const caddy = source('deploy/emcoin/Caddyfile')
  expect(caddy).toContain('{$EMCOIN_DOMAIN}')
  for (const endpoint of ['/admin/api/*', '/api/*', '/socket.io/*', '/health']) expect(caddy).toContain(`handle ${endpoint}`)
  expect(caddy).toContain('root * /srv')
  expect(caddy).toContain('/sw.js /manifest.webmanifest')
  expect(caddy).toContain('Cache-Control "no-cache"')
  expect(caddy).not.toContain('ocr2.')
  expect(caddy).not.toMatch(/\n\s*log\s*[{\n]/)
})

it('excludes local credentials and backend player/catalog databases from image contexts', () => {
  for (const file of ['be/.dockerignore', 'fe/.dockerignore']) expect(source(file).split(/\r?\n/)).toContain('.env.*')
  const backend = source('be/.dockerignore').split(/\r?\n/)
  expect(backend).toContain('data/')
  expect(backend).toContain('test-data/')
})
