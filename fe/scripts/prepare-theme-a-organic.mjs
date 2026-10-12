import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const directory = path.join(root, 'fe/public/cartoon/buttons/themes/mint-blush-organic-v1')
await fs.mkdir(directory, { recursive: true })
for (const name of ['pill-mint', 'pill-blush', 'pill-cream', 'pill-blush-soft']) {
  const target = path.join(directory, `${name}.png`)
  try { await fs.access(target); throw new Error(`Refusing overwrite: ${target}`) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  await sharp(path.join(root, `docs/design/theme-a-organic-source/${name}.png`))
    .trim({ threshold: 15 }).resize(260, 99, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(target)
  const bytes = await fs.readFile(target)
  console.log(JSON.stringify({ target, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }))
}
