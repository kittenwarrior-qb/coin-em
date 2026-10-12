import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assets = path.join(root, 'public/emcoin')
const archive = path.join(root, '../docs/design/original-friends-v1')
const gen = 'C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b'
// Mechanical atlas extraction only: no drawing, recoloring or card-image processing.
const sheets = {
  orbit: ['exec-b093e674-eed5-47c4-90d0-ac3d18dec4e7.png', 'exec-10ee5f0e-cad5-4d37-a84b-b09f19cbe9ce.png'],
  paper: ['exec-38439bb3-f278-42dd-bc1c-913b06492045.png', 'exec-3a31c4b8-2806-486a-b4b2-8d7d31fd4608.png'],
}
await fs.mkdir(archive, { recursive: true })
const records = []
for (const [theme, names] of Object.entries(sheets)) {
  const dest = path.join(assets, 'avatars', theme)
  await fs.mkdir(dest, { recursive: true })
  for (let group = 0; group < 2; group++) {
    const source = path.join(gen, names[group])
    await fs.copyFile(source, path.join(archive, `${theme}-${group ? 'animals' : 'people'}-sheet.png`))
    const { width, height } = await sharp(source).metadata()
    const bounds = group ? [.055, .37, .70, .95] : [0, .28, .545, .8]
    for (let n = 0; n < (group ? 11 : 12); n++) {
      const row = Math.floor(n / 4), column = n % 4
      const left = Math.round(column * width / 4), right = Math.round((column + 1) * width / 4)
      const top = Math.round(bounds[row] * height), bottom = Math.round(bounds[row + 1] * height)
      const name = `${String(group * 12 + n).padStart(2, '0')}.webp`
      await sharp(source).extract({ left, top, width: right - left, height: bottom - top })
        .resize(256, 256, { fit: 'contain', background: theme === 'paper' ? '#EDE4CF' : '#f5f3ff' })
        .webp({ quality: 90 }).toFile(path.join(dest, name))
      const bytes = await fs.readFile(path.join(dest, name))
      records.push({ url: `/emcoin/avatars/${theme}/${name}`, kind: 'avatar', source: 'built-in-imagegen',
        sheet: names[group], cell: n, theme, sha256: createHash('sha256').update(bytes).digest('hex') })
    }
  }
}

// Original project-authored vector geometry; no paths copied from the retired vendor pack.
const p = {
  facilitator: '<path d="M9 13q0-5 5-5h14q5 0 5 5v10q0 5-5 5H18l-7 6v-8q-2-1-2-4Z"/><circle cx="16" cy="18" r="1"/><circle cx="21" cy="18" r="1"/><circle cx="26" cy="18" r="1"/>',
  storyteller: '<path d="M5 15h32v21H5ZM5 16l16 11 16-11"/><path d="M21 18C5 11 17 2 21 9c4-7 16 2 0 9Z" fill="#c96487"/>',
  heal: '<path d="M5 29h10l8-4q7-2 6 3l-7 5h8l7-6q4-2 3 2l-10 8H14L5 35ZM21 24V12M21 17q-11 0-10-10 10 0 10 10ZM21 13q0-10 10-10 0 10-10 10Z"/>',
  lock: '<rect x="9" y="18" width="24" height="21" rx="6"/><path d="M14 18v-7a7 7 0 0 1 14 0v7"/><path d="M21 31c-9-5-2-12 0-6 2-6 9 1 0 6Z" fill="#c96487"/>',
  connect: '<ellipse cx="15" cy="21" rx="10" ry="12" transform="rotate(-30 15 21)"/><ellipse cx="27" cy="21" rx="10" ry="12" transform="rotate(30 27 21)"/>',
  gift: '<path d="M7 19h28v19H7ZM4 13h34v7H4M21 13v25"/><path d="M21 13C5 13 8 1 16 6l5 7c16 0 13-12 5-7Z"/>',
  compass: '<circle cx="21" cy="23" r="16"/><path d="m27 13-3 13-11 8 4-14Z" fill="#c96487"/><path d="M21 3v4M17 3h8"/>',
  check: '<path d="m8 21 9 9L35 11"/>',
  arrowRight: '<path d="M6 21h29M25 10l11 11-11 11"/>',
  arrowLeft: '<path d="M36 21H7M17 10 6 21l11 11"/>',
  down: '<path d="m10 16 11 11 11-11"/>',
  play: '<path d="m14 7 23 14-23 14Z"/>',
  book: '<path d="M21 10q-9-5-17-2v27q9-3 17 3 8-6 17-3V8q-8-3-17 2ZM21 10v28"/>',
  help: '<circle cx="21" cy="21" r="17"/><path d="M15 14c0-8 14-8 14 0 0 5-8 5-8 12"/><circle cx="21" cy="32" r="1"/>',
  settings: '<path d="m17 6 1-3h6l1 3 5 3 4-1 3 5-3 3v6l3 3-3 5-4-1-5 3-1 4h-6l-1-4-5-3-4 1-3-5 3-3v-6l-3-3 3-5 4 1Z"/><circle cx="21" cy="19" r="6"/>',
  close: '<path d="m11 11 20 20M31 11 11 31"/>',
  photo: '<rect x="5" y="8" width="32" height="26" rx="5"/><circle cx="15" cy="17" r="3"/><path d="m7 31 10-9 6 5 6-7 7 11"/>',
  sound: '<path d="M5 16h8l9-8v26l-9-8H5ZM28 14q7 7 0 14M32 8q12 13 0 26"/>',
  mute: '<path d="M5 16h8l9-8v26l-9-8H5ZM29 16l9 10M38 16l-9 10"/>',
  music: '<path d="M17 30V9l18-4v21M17 14l18-4"/><ellipse cx="11" cy="31" rx="6" ry="4"/><ellipse cx="29" cy="27" rx="6" ry="4"/>',
  bell: '<path d="M8 29h26l-4-7v-9a9 9 0 0 0-18 0v9ZM17 35q4 5 8 0M21 2v3"/>',
  clock: '<circle cx="21" cy="21" r="17"/><path d="M21 10v12l8 5"/>',
  coin: '<circle cx="21" cy="21" r="17"/><circle cx="21" cy="21" r="12"/><path d="m21 12 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  surprised: '<circle cx="21" cy="21" r="17"/><circle cx="14" cy="16" r="1.5"/><circle cx="28" cy="16" r="1.5"/><ellipse cx="21" cy="28" rx="4" ry="6"/>',
  brokenHeart: '<path d="M21 35C-3 21 5 2 17 9l4 5 5-5c13-7 20 12-5 26ZM22 7l-5 10 8 5-6 8"/>',
  alert: '<path d="m21 5 18 31H3ZM21 16v9"/><circle cx="21" cy="31" r="1"/>',
  repeat: '<path d="M33 14a15 15 0 1 0 2 16M33 5v11H22"/>',
  sleep: '<path d="M6 23h12L6 36h12M25 7h11L25 20h11"/>',
  spinner: '<path d="M21 4a17 17 0 1 1-17 17"/>',
  friends: '<circle cx="14" cy="13" r="6"/><circle cx="30" cy="16" r="5"/><path d="M3 36v-4a11 11 0 0 1 22 0v4ZM26 26q12-1 13 10H29"/>',
}
const aliases = { 'Crown.svg': 'facilitator', 'Flower-Multicolor.svg': 'storyteller', 'Life-Bag.svg': 'heal',
  'Potion-Green-Border.svg': 'heal', 'Lock-Gold.svg': 'lock', 'Lock-Sliver.svg': 'lock', 'Magic.svg': 'connect',
  'Gift-Pink-Border.svg': 'gift', 'Key-Gold.svg': 'compass', 'Checkmark.svg': 'check', 'Checkmark-Cartoon.svg': 'check',
  'Arrow---Right.svg': 'arrowRight', 'Arrow---Left.svg': 'arrowLeft', 'Arrow---Down.svg': 'down', 'Arrow-Simple-Right.svg': 'play',
  'Book.svg': 'book', 'Question-Mark.svg': 'help', 'Settings.svg': 'settings', 'X-Icon.svg': 'close', 'X-Icon-Rounded.svg': 'close',
  'white/Photo.png': 'photo', 'Sound-On.svg': 'sound', 'Sound-Off.svg': 'mute', 'Music.svg': 'music', 'Alert-Bell.svg': 'bell',
  'Chat.svg': 'facilitator', 'Clock-Yellow.svg': 'clock', 'Coin.svg': 'coin', 'Emoji-Shocked.svg': 'surprised',
  'Fear-Cartoon.svg': 'surprised', 'Heart---Broken.svg': 'brokenHeart', 'Heart-Broken.svg': 'brokenHeart',
  'Alert.svg': 'alert', 'Repeat.svg': 'repeat', 'Zzz.svg': 'sleep', 'Loading-Spinner.svg': 'spinner', 'Friends.svg': 'friends', 'avatars/Friends - Cartoon.png': 'friends' }
for (const theme of ['orbit', 'paper']) {
  const dest = path.join(assets, 'icons', theme)
  await fs.mkdir(dest, { recursive: true })
  for (const [name, geometry] of Object.entries(p)) {
    const ink = theme === 'paper' ? '#123e59' : '#303568'
    const accent = theme === 'paper' ? '#df7465' : '#c96487'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${geometry.replaceAll('#c96487', accent)}</svg>`
    await fs.writeFile(path.join(dest, `${name}.svg`), svg)
    records.push({ url: `/emcoin/icons/${theme}/${name}.svg`, kind: 'icon', source: 'project-authored-vector', theme,
      sha256: createHash('sha256').update(svg).digest('hex') })
  }
}
await fs.writeFile(path.join(archive, 'asset-manifest.json'), JSON.stringify({ version: 'original-friends/v1',
  legacyAvatarSlots: 23, retirement: 'old-avatar-and-icon-pack-owner-reported-expired',
  rights: 'new-output-owner-review-required-not-a-legal-certificate', records }, null, 2))
await fs.writeFile(path.join(archive, 'icon-migration.json'), JSON.stringify(aliases, null, 2))
console.log(JSON.stringify({ avatars: 46, icons: Object.keys(p).length * 2, records: records.length, archive }))
