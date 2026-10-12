import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { classifyAsset } from './assetScope.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const apply = process.argv.includes('--apply')
const aliases = JSON.parse(await fs.readFile(path.join(root, '../docs/design/original-friends-v1/icon-migration.json'), 'utf8'))
const names = ['Boy 1', 'Girl 1', 'Boy 2', 'Girl 2', 'Boy 3', 'Girl 3', 'Boy 4', 'Girl 4',
  'Boy 2 (Dark Hair)', 'Boyy 2', 'Girl', 'Neutral', 'Bird', 'Cat', 'Cat 2', 'Cat Head', 'Bunny', 'Bunny 2', 'Rabbit Head', 'Bear', 'Bird - Blue', 'Fish', 'Fish 2']
const replacements = [
  ['/cartoon/icons/avatars/None.png', '/emcoin/avatars/orbit/11.webp'],
  ...Object.entries(aliases).map(([name, target]) => [`/cartoon/icons/${name}`, `/emcoin/icons/orbit/${target}.svg`]),
  ...names.map((name, index) => [`/cartoon/icons/avatars/${name}.png`, `/emcoin/avatars/orbit/${String(index).padStart(2, '0')}.webp`]),
]
const migrate = text => replacements.reduce((value, [old, next]) => value.replaceAll(old, next), text)
const changed = []
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(file)
    else if (/\.(tsx|ts)$/.test(file) && entry.name !== 'EmcoinImage.tsx') {
      const text = await fs.readFile(file, 'utf8')
      let next = migrate(text).replaceAll('\uFEFF', '')
      // Mechanical component migration adds theme resolution without changing card/photo URLs.
      if (!file.includes(`${path.sep}test${path.sep}`) && /\/emcoin\/|AVATAR_ICONS/.test(next) && /<img\b/.test(next)) {
        next = next.replaceAll('<img', '<EmcoinImage')
        next = "import { EmcoinImage } from '@/components/cartoon/EmcoinImage'\n" + next
      }
      if (next !== text) { changed.push(path.relative(root, file)); if (apply) await fs.writeFile(file, next) }
    }
  }
}
await walk(path.join(root, 'src'))
if (apply) {
  const manifestFile = path.join(root, 'src/assets/assetManifest.json')
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'))
  const art = JSON.parse(await fs.readFile(path.join(root, '../docs/design/original-friends-v1/asset-manifest.json'), 'utf8'))
  // New reviewed generation removes the retired GUI pack from loading entirely.
  // The 200 owned card faces remain byte-for-byte the same records below.
  const startup = ['logo-v2.webp', 'backdrop-v3.webp', 'primary-v3.webp', 'secondary-v3.webp']
    .map(name => ({ url: `/cartoon/ui/themes/emotion-orbit/${name}`, tag: 'brand', priority: 'critical' }))
  const entries = [...startup, ...art.records.map(record => ({ url: record.url, tag: record.kind, priority: 'background' }))]
  manifest.version = 'asset-manifest/v2'
  manifest.preload = []
  for (const entry of entries) {
    const bytes = await fs.readFile(path.join(root, 'public', entry.url.slice(1)))
    const metadata = await sharp(bytes).metadata()
    manifest.preload.push({ logicalId: `preload:${entry.url}`, oldUrl: entry.url, newUrl: null,
      tag: entry.tag, priority: entry.priority, scope: classifyAsset(entry.url), rights: 'unverified',
      crop: 'unchanged', fallback: null, cache: 'browser-http-not-PWA-cache',
      sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, width: metadata.width, height: metadata.height })
  }
  const critical = [], background = []
  for (const record of manifest.preload) {
    const url = migrate(record.oldUrl)
    if (url !== record.oldUrl) {
      record.oldUrl = url; record.logicalId = `preload:${url}`
      const bytes = await fs.readFile(path.join(root, 'public', url.slice(1)))
      const metadata = await sharp(bytes).metadata()
      Object.assign(record, { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
        width: metadata.width, height: metadata.height, scope: 'review-required' })
    }
    ;(record.priority === 'critical' ? critical : background).push({ url: record.oldUrl, tag: record.tag })
  }
  // Protected card records are intentionally neither migrated nor regenerated.
  manifest.preloadFingerprint = createHash('sha256').update(JSON.stringify({ critical, background })).digest('hex')
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
  await fs.writeFile(path.join(root, 'src/assets/preloadAssets.json'), JSON.stringify({ version: 'ui-preload-assets/v2', critical, background }, null, 2) + '\n')
  console.log(JSON.stringify({ apply, changed, preloadFingerprint: manifest.preloadFingerprint }))
} else console.log(JSON.stringify({ apply, changed }))
