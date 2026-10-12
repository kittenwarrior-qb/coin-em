import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

// Downsize generated originals only; no hue/filter/card editing in this pipeline.
const root = path.resolve(import.meta.dirname, '../public/cartoon')
const generated = 'C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b'
const assets = [
  ['exec-efa0c8fc-7c1c-41b3-a15c-3af2404aff3f.png', 'buttons', 'pill-sky.png', 260, 99],
  ['exec-7cf1d932-f966-45ae-9dc8-3492947259f4.png', 'buttons', 'pill-sky-v2.png', 260, 99],
  ['exec-3c174f03-40cb-4677-9233-bb7f6837ca7f.png', 'buttons', 'pill-cream-v2.png', 260, 99],
  ['exec-48cb750b-b11d-4b7c-87a2-d1a7670c9813.png', 'buttons', 'pill-blush-soft-v2.png', 260, 99],
  ['exec-49b6b04d-f912-47c3-a518-8ecb5c5187a5.png', 'buttons', 'circle-sky.png', 100, 100],
  ['exec-8eaeb2ca-5629-43c0-8328-371ce38fb962.png', 'ui', 'table.webp', 480, 640],
  ['exec-27aca430-8dfa-4bc9-8fda-f83243695324.png', 'ui', 'backdrop.webp', 720, 1280],
]
for (const [source, category, name, width, height] of assets) {
  const dir = path.join(root, category, 'themes/sky-pink-a1')
  await mkdir(dir, { recursive: true })
  const pipeline = sharp(path.join(generated, source)).resize(width,height,{fit:'fill'})
  await (name.endsWith('.png') ? pipeline.png({palette:true,quality:95}) : pipeline.webp({quality:85,alphaQuality:100})).toFile(path.join(dir,name))
  console.log(JSON.stringify({name,...await sharp(path.join(dir,name)).metadata()}))
}
