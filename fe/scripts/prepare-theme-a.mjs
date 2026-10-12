import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// Mechanical production sizing/encoding only; source artwork is kept unchanged.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(root, 'fe/public/cartoon/buttons/themes/mint-blush-v1')
await fs.mkdir(output, { recursive: true })
for (const color of ['mint', 'blush']) {
  const target = path.join(output, `pill-${color}.png`)
  try { await fs.access(target); throw new Error(`Refusing to overwrite ${target}`) } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  // Match the legacy 260×99 logical canvas. Artwork is fitted, not stretched.
  await sharp(path.join(root, `docs/design/theme-a-source/pill-${color}.png`))
    .trim({ threshold: 10 }).resize(260, 99, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 }).toFile(target)
  console.log(target)
}
