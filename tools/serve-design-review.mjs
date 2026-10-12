import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/design/brand-prototypes-v1'))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' }
http.createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1:5174').pathname)
    if (pathname === '/') pathname = '/original-assets-review.html'
    const candidate = path.resolve(root, '.' + pathname)
    if (!candidate.startsWith(root + path.sep)) throw new Error('Outside review root')
    const resolved = await fs.realpath(candidate)
    if (!resolved.startsWith(root + path.sep)) throw new Error('Outside review root')
    response.writeHead(200, { 'Content-Type': mime[path.extname(resolved)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(await fs.readFile(resolved))
  } catch { response.writeHead(404); response.end('Not found') }
}).listen(5174, '127.0.0.1', () => console.log('Design review: http://127.0.0.1:5174/original-assets-review.html'))
