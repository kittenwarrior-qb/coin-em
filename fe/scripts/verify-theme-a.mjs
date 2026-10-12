import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')
const admitted = '/cartoon/buttons/themes/mint-blush-v1/'
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]))).flat()
}
const files = (await walk(root)).filter(file => /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(file))
const old = []
for (const file of files) {
  const url = '/' + path.relative(root, file).split(path.sep).join('/')
  if (!url.startsWith(admitted) && !url.startsWith('/cartoon/buttons/themes/mint-blush-v2/') && !url.startsWith('/cartoon/buttons/themes/mint-blush-a1/') && !url.startsWith('/cartoon/buttons/themes/mint-blush-organic-v1/') && !url.startsWith('/cartoon/ui/themes/mint-blush-v2/') && !url.startsWith('/cartoon/buttons/themes/sky-pink-a1/') && !url.startsWith('/cartoon/ui/themes/sky-pink-a1/')) old.push({ url, sha: createHash('sha256').update(await fs.readFile(file)).digest('hex') })
}
// Inventory sorting uses native path ordering, so use that same deterministic URL order.
old.sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : 0)
const originalHash = createHash('sha256').update(old.map(item => `${item.url}:${item.sha}`).join('\n')).digest('hex')
assert.equal(old.length, 573)
assert.equal(originalHash, '7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8')
const outputs = []
for (const color of ['mint', 'blush']) {
  const file = path.join(root, admitted, `pill-${color}.png`)
  const bytes = await fs.readFile(file)
  const metadata = await sharp(bytes).metadata()
  assert.equal(metadata.width, 260)
  assert.equal(metadata.height, 99)
  assert.equal(metadata.hasAlpha, true)
  assert.ok(bytes.length < 30000)
  const pixels = await sharp(bytes).ensureAlpha().raw().toBuffer()
  for (const index of [0, 259, 260 * 98, 260 * 99 - 1]) assert.equal(pixels[index * 4 + 3], 0)
  outputs.push({ color, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), width: metadata.width, height: metadata.height, cornerAlpha: 0 })
}
const v2 = []
for (const [name, namespace, extension, width, height, alpha, explicitVersion] of [
  ['pill-mint', 'buttons', 'png', 260, 99, true], ['pill-blush', 'buttons', 'png', 260, 99, true],
  ['circle-mint', 'buttons', 'png', 100, 100, true], ['circle-blush', 'buttons', 'png', 100, 100, true],
  ['backdrop', 'ui', 'webp', 720, 1280, false], ['table', 'ui', 'webp', 480, 640, true],
  ['pill-cream', 'buttons', 'png', 260, 99, true], ['pill-blush-soft', 'buttons', 'png', 260, 99, true],
  ['pill-sky', 'buttons', 'png', 260, 99, true], ['circle-sky', 'buttons', 'png', 100, 100, true],
  ['pill-sky-v2', 'buttons', 'png', 260, 99, true, 'sky-pink-a1'],
  ['pill-cream-v2', 'buttons', 'png', 260, 99, true, 'sky-pink-a1'],
  ['pill-blush-soft-v2', 'buttons', 'png', 260, 99, true, 'sky-pink-a1'],
  ['table', 'ui', 'webp', 480, 640, true, 'sky-pink-a1'], ['backdrop', 'ui', 'webp', 720, 1280, false, 'sky-pink-a1'],
]) {
  const version = explicitVersion ?? (['pill-sky', 'circle-sky'].includes(name) ? 'sky-pink-a1' : ['pill-cream', 'pill-blush-soft'].includes(name) ? 'mint-blush-a1' : 'mint-blush-v2')
  const url = `/cartoon/${namespace}/themes/${version}/${name}.${extension}`
  const bytes = await fs.readFile(path.join(root, url))
  const metadata = await sharp(bytes).metadata()
  assert.equal(metadata.width, width)
  assert.equal(metadata.height, height)
  assert.equal(metadata.hasAlpha, alpha)
  assert.ok(bytes.length < 45000)
  v2.push({ url, width, height, alpha, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}
const organic = []
for (const color of ['mint', 'blush', 'cream', 'blush-soft']) {
  const url = `/cartoon/buttons/themes/mint-blush-organic-v1/pill-${color}.png`
  const bytes = await fs.readFile(path.join(root, url))
  const metadata = await sharp(bytes).metadata()
  assert.equal(metadata.width, 260)
  assert.equal(metadata.height, 99)
  assert.equal(metadata.hasAlpha, true)
  assert.ok(bytes.length < 45000)
  const pixels = await sharp(bytes).ensureAlpha().raw().toBuffer()
  const topAt = x => {
    for (let y = 0; y < 99; y++) if (pixels[(y * 260 + x) * 4 + 3] > 128) return y
    throw new Error(`Empty contour at ${x}`)
  }
  const top = [65, 130, 195].map(topAt)
  // A normal capsule has its highest edge in the middle; this asset must have a visible central dip.
  assert.ok(top[1] >= Math.min(top[0], top[2]) + 3, `${color} lost its irregular contour: ${top}`)
  for (const index of [0, 259, 260 * 98, 260 * 99 - 1]) assert.equal(pixels[index * 4 + 3], 0)
  organic.push({ url, bytes: bytes.length, top, sha256: createHash('sha256').update(bytes).digest('hex') })
}
console.log(JSON.stringify({ originalCount: old.length, originalHash, outputs, v2, organic, organicPillBytes: organic.reduce((sum, entry) => sum + entry.bytes, 0) }, null, 2))
