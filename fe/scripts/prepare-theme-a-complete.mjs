import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const definitions = [
  ['pill-mint', 'cartoon/buttons', 260, 99, 'png', true],
  ['pill-blush', 'cartoon/buttons', 260, 99, 'png', true],
  ['circle-mint', 'cartoon/buttons', 100, 100, 'png', true],
  ['circle-blush', 'cartoon/buttons', 100, 100, 'png', true],
  ['backdrop', 'cartoon/ui', 720, 1280, 'webp', false],
  ['table', 'cartoon/ui', 480, 640, 'webp', true],
]
for (const [name, namespace, width, height, format, transparent] of definitions) {
  const directory = path.join(root, 'fe/public', namespace, 'themes/mint-blush-v2')
  await fs.mkdir(directory, { recursive: true })
  const target = path.join(directory, `${name}.${format}`)
  try { await fs.access(target); throw new Error(`Refusing to overwrite ${target}`) } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  let pipeline = sharp(path.join(root, `docs/design/theme-a-v2-source/${name}.png`))
  if (transparent) pipeline = pipeline.trim({ threshold: 15 })
  // Normalize the authored silhouette to the original logical control bounds.
  pipeline = pipeline.resize(width, height, { fit: 'fill' })
  if (format === 'png') await pipeline.png({ compressionLevel: 9 }).toFile(target)
  else await pipeline.webp({ quality: 85, alphaQuality: 100 }).toFile(target)
  console.log(target)
}
