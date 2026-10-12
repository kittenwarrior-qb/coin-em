import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = process.argv[2]
if (!source || !path.isAbsolute(source)) throw new Error('Absolute owner PDF path required')
const sha256 = createHash('sha256').update(await fs.readFile(source)).digest('hex')
const output = path.join(root, 'public/emcoin/decks/pdf-v1')
const reportFile = path.join(root, 'src/assets/pdfDeckAssets.json')
try {
  const old = JSON.parse(await fs.readFile(reportFile, 'utf8'))
  if (old.sourceSha256 !== sha256) throw new Error('PDF_VERSION_REQUIRES_NEW_ID')
} catch (error) { if (error.code !== 'ENOENT') throw error }
const temporary = await fs.mkdtemp(path.join(root, '../tmp/pdfs/catalog-export-'))
await fs.mkdir(output, { recursive: true })
execFileSync('pdftoppm', ['-scale-to', '1200', '-png', source, path.join(temporary, 'page')], { stdio: 'inherit' })
const pages = (await fs.readdir(temporary)).filter(name => /^page-\d{3}\.png$/.test(name)).sort()
if (pages.length !== 145) throw new Error('PDF_PAGE_REVIEW_REQUIRED')
const records = []
for (const page of pages) {
  const bytes = await sharp(path.join(temporary, page)).webp({ quality: 94, effort: 6 }).toBuffer()
  const metadata = await sharp(bytes).metadata()
  const name = page.replace('.png', '.webp')
  await fs.writeFile(path.join(output, name), bytes)
  records.push({ page: Number(page.match(/\d+/)[0]), url: `/emcoin/decks/pdf-v1/${name}`,
    bytes: bytes.length, width: metadata.width, height: metadata.height,
    sha256: createHash('sha256').update(bytes).digest('hex') })
}
await fs.writeFile(reportFile, JSON.stringify({ version: 'pdf-deck-assets/v1', sourceSha256: sha256,
  preparation: 'Poppler 1200px longest edge, WebP94; no creative editing', records }, null, 2) + '\n')
console.log(JSON.stringify({ pages: records.length, bytes: records.reduce((sum, item) => sum + item.bytes, 0), sourceSha256: sha256 }))
