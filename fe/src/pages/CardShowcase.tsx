import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, RotateCw } from 'lucide-react'
import * as THREE from 'three'
import { CARD_IMAGES } from '@/constants/cardImages'
import { characters3D } from './characterModels'
import type { ResourceOwner } from '@/features/showcase/resourceOwner'
import type { createShowcaseLoaders } from '@/features/showcase/assetLoaders'
import { createShowcaseRenderer } from '@/features/showcase/renderer'
import { PublicCatalogBoundary } from '@/features/game/catalog/PublicCatalog'
import { useRoomCatalog } from '@/features/game/catalog/roomCatalogClient'
import { publishedShowcaseDecks } from '@/features/showcase/publishedDecks'

type ShowcaseCard = { title: string; group: string; front: string; back: string; kind?: 'model' | 'sticker' }
type ShowcaseDeck = { id: string; label: string; count: number; cards: ShowcaseCard[] }

const deckColors: Record<string, string> = {
  role: '#f5b700', situation: '#2f76ac', emotion: '#ed5b87', reflection: '#49a923', selfcare: '#ef7d3d', characters3d: '#7b4fd4', sticker: '#f2789f',
}
const deckLabels: Record<string, string> = {
  role: 'Vai trò', situation: 'Tình huống', emotion: 'Cảm xúc', reflection: 'Phản tư', selfcare: 'Bí kíp ôm', coin: 'Coin', characters3d: 'Nhân vật 3D', sticker: 'Sticker',
}

const DEFAULT_ZOOM = 0.92

// Tripo/Meshy exports don't face +Z by default — reset to this yaw whenever a
// character model loads so it starts front-facing instead of edge-on.
const CHARACTER_FRONT_YAW = -0.9

// Only 3 physical coins exist (Đỏ, Vàng, Xanh); each is double-sided, so every
// coin is a single flip card showing its two faces — not 2 separate cards.
const coinDeck: ShowcaseDeck = {
  id: 'coin', label: 'Coin', count: 3,
  cards: [
    { title: 'Đỏ', group: 'coin', front: CARD_IMAGES.coins.red1, back: CARD_IMAGES.coins.red2 },
    { title: 'Vàng', group: 'coin', front: CARD_IMAGES.coins.yellow1, back: CARD_IMAGES.coins.yellow2 },
    { title: 'Xanh', group: 'coin', front: CARD_IMAGES.coins.green1, back: CARD_IMAGES.coins.green2 },
  ],
}

const emotionDeck: ShowcaseDeck = {
  id: 'emotion', label: 'Cảm xúc', count: 32,
  cards: [
    { title: 'Buồn', group: 'basic', ...CARD_IMAGES.emotionBasic.buon },
    { title: 'Chán', group: 'basic', ...CARD_IMAGES.emotionBasic.chan },
    { title: 'Giận', group: 'basic', ...CARD_IMAGES.emotionBasic.gian },
    { title: 'Mong', group: 'basic', ...CARD_IMAGES.emotionBasic.mong },
    { title: 'Sợ', group: 'basic', ...CARD_IMAGES.emotionBasic.so },
    { title: 'Tin', group: 'basic', ...CARD_IMAGES.emotionBasic.tin },
    { title: 'Vui', group: 'basic', ...CARD_IMAGES.emotionBasic.vui },
    { title: 'Wow', group: 'basic', ...CARD_IMAGES.emotionBasic.wow },
    ...CARD_IMAGES.emotionLight.map((images, index) => ({ title: `Nhẹ ${index + 1}`, group: 'nhe', ...images })),
    ...CARD_IMAGES.emotionStrong.map((images, index) => ({ title: `Mạnh ${index + 1}`, group: 'manh', ...images })),
    ...CARD_IMAGES.emotionAdvanced.map((images, index) => ({ title: `NC ${index + 1}`, group: 'advance', ...images })),
  ],
}

const charactersDeck: ShowcaseDeck = {
  id: 'characters3d', label: 'Nhân vật 3D', count: characters3D.length,
  cards: characters3D.map((character) => ({ title: character.label, group: 'character', front: character.file, back: character.file, kind: 'model' as const })),
}

// Die-cut 3D stickers: each is an extruded slice of the sticker's PNG silhouette
// (a thin white body) with the artwork printed on the front face. Outlines +
// aspect ratios live in /stickers/outlines.json (generated offline from the PNGs).
const STICKER_HEIGHT = 2.0   // world units (a touch smaller than a card)
const STICKER_DEPTH = 0.08   // thickness — "dày 1 xíu" like a real sticker
const STICKER_BEVEL = 0.03   // rounded die-cut edge
const stickerModels = [
  { slug: 'gian-du', label: 'Giận dữ' },
  { slug: 'mong-doi', label: 'Mong đợi' },
  { slug: 'vui-ve', label: 'Vui vẻ' },
  { slug: 'tin-tuong', label: 'Tin tưởng' },
  { slug: 'so-hai', label: 'Sợ hãi' },
  { slug: 'bat-ngo', label: 'Bất ngờ' },
  { slug: 'buon-ba', label: 'Buồn bã' },
  { slug: 'chan-ghet', label: 'Chán ghét' },
  // Thú cưng (thêm vào cuối)
  { slug: 'pet-bear', label: 'Gấu' },
  { slug: 'pet-bird-blue', label: 'Chim xanh' },
  { slug: 'pet-bird', label: 'Chim' },
  { slug: 'pet-cat2', label: 'Mèo 1' },
  { slug: 'pet-cathead', label: 'Mèo 2' },
  { slug: 'pet-cat', label: 'Mèo 3' },
  { slug: 'pet-bunny2', label: 'Thỏ 1' },
  { slug: 'pet-bunny', label: 'Thỏ 2' },
  { slug: 'pet-rabbithead', label: 'Thỏ 3' },
  { slug: 'pet-fish2', label: 'Hải cẩu' },
  { slug: 'pet-fish', label: 'Cá' },
]
const stickerDeck: ShowcaseDeck = {
  id: 'sticker', label: 'Sticker', count: stickerModels.length,
  // `back` stashes the slug so the builder can look up its outline in outlines.json
  cards: stickerModels.map((s) => ({ title: s.label, group: 'sticker', front: `/stickers/${s.slug}.webp`, back: s.slug, kind: 'sticker' as const })),
}

// Build a die-cut sticker: a white extruded body in the PNG's silhouette shape,
// with the artwork drawn on the front face. `points` are normalized [0,1] image
// coords (y-down); the texture is the same trimmed PNG so UVs line up 1:1.
function buildStickerMesh(points: [number, number][], aspect: number, texture: THREE.Texture) {
  const height = STICKER_HEIGHT
  const width = height * aspect
  const shape = new THREE.Shape()
  points.forEach(([x, y], index) => {
    const sx = (x - 0.5) * width
    const sy = (0.5 - y) * height
    if (index === 0) shape.moveTo(sx, sy)
    else shape.lineTo(sx, sy)
  })
  shape.closePath()

  const bodyGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: STICKER_DEPTH, bevelEnabled: true,
    bevelThickness: STICKER_BEVEL, bevelSize: STICKER_BEVEL, bevelSegments: 5, curveSegments: 1,
  })
  bodyGeometry.computeBoundingBox()
  const bb = bodyGeometry.boundingBox!
  const halfDepth = (bb.max.z - bb.min.z) / 2
  bodyGeometry.center()
  // Paper body, two materials: ExtrudeGeometry puts the flat front/back caps in
  // material group 0 and the extruded rim (side walls + bevel) in group 1. The
  // caps stay soft off-white paper; the rim is a touch greyer so the thickness
  // reads clearly and front vs back are easy to tell apart while rotating.
  // (toneMapped:false because the scene's low exposure would otherwise grey these
  // out.) Nudge the two hex values lighter/darker to taste.
  const capMaterial = new THREE.MeshStandardMaterial({ color: '#e7e9ec', roughness: 0.8, metalness: 0, toneMapped: false })
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#c2c6cd', roughness: 0.82, metalness: 0, toneMapped: false })
  const body = new THREE.Mesh(bodyGeometry, [capMaterial, edgeMaterial])

  const faceGeometry = new THREE.ShapeGeometry(shape, 14)
  const positions = faceGeometry.attributes.position
  const uvs: number[] = []
  for (let index = 0; index < positions.count; index += 1) {
    uvs.push(positions.getX(index) / width + 0.5, positions.getY(index) / height + 0.5)
  }
  faceGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  const faceMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.5, toneMapped: false })
  const face = new THREE.Mesh(faceGeometry, faceMaterial)
  face.position.z = halfDepth + 0.004

  const group = new THREE.Group()
  group.add(body, face)
  return group
}

function useCardManifest() {
  const { metadata } = useRoomCatalog()
  const [decks, setDecks] = useState<ShowcaseDeck[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (metadata) {
      setDecks([...publishedShowcaseDecks(metadata), coinDeck, stickerDeck, charactersDeck]); setLoading(false)
      return
    }
    let mounted = true
    fetch('/card-showcase/manifest.json')
      .then((res) => res.json() as Promise<ShowcaseDeck[]>)
      .then((data) => {
        if (!mounted) return
        const normalized = data.map((deck) => {
          if (deck.id === 'emotion') return emotionDeck
          return deck
        })
        setDecks([...normalized, coinDeck, stickerDeck, charactersDeck]); setLoading(false)
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [metadata])
  return { decks, loading }
}

export default function CardShowcase() {
  return <PublicCatalogBoundary onClose={() => window.location.assign('/about/cards')} closeLabel="Xem bộ thẻ 2D"><PublishedShowcase /></PublicCatalogBoundary>
}
function PublishedShowcase() {
  const { decks, loading } = useCardManifest()
  const [deckId, setDeckId] = useState('role')
  const [cardIndex, setCardIndex] = useState(0)
  const [autoRotate, setAutoRotate] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [cardLoading, setCardLoading] = useState(true)
  const [graphicsUnavailable, setGraphicsUnavailable] = useState(false)
  const [assetError, setAssetError] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const autoRotateRef = useRef(autoRotate)
  const verticalRotationRef = useRef(0)
  const flipTargetRef = useRef(0)
  const frontMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const backMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const materialsInUseRef = useRef<THREE.MeshBasicMaterial[]>([])
  const texturesRef = useRef<THREE.Texture[]>([])
  const textureOwnerRef = useRef<ResourceOwner<THREE.Texture> | null>(null)
  const rendererGenerationRef = useRef({ disposed: true })
  const slideControllerRef = useRef<{ setInitial: (front: THREE.Texture, back: THREE.Texture) => void; transition: (front: THREE.Texture, back: THREE.Texture, direction: number) => void } | null>(null)
  const cardDirectionRef = useRef(1)
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 })
  // Tracks the yaw the current flip started/ends at so the scale-pulse can be
  // driven by actual rotation progress instead of a guessed fixed duration —
  // it reaches full size again exactly when the 180° turn visually finishes.
  const flipPulseRef = useRef<{ startYaw: number; targetYaw: number } | null>(null)
  const triggerFlipRef = useRef<(() => void) | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const incomingGroupRef = useRef<THREE.Group | null>(null)
  const characterGroupRef = useRef<THREE.Group | null>(null)
  const characterIntroRef = useRef(1)
  const characterDistanceRef = useRef(6.75)
  const assetLoadersRef = useRef<ReturnType<typeof createShowcaseLoaders> | null>(null)
  const isCharacterModeRef = useRef(false)
  const stickerGroupRef = useRef<THREE.Group | null>(null)
  const isStickerModeRef = useRef(false)
  const stickerIntroRef = useRef(1)
  const regenerateEnvironmentRef = useRef<(() => void) | null>(null)
  const zoomRef = useRef(DEFAULT_ZOOM)

  const activeDeck = useMemo(() => decks.find((deck) => deck.id === deckId) ?? decks[0], [deckId, decks])
  const activeCard = activeDeck?.cards[Math.min(cardIndex, Math.max(0, (activeDeck?.cards.length ?? 1) - 1))]
  const accent = deckColors[activeDeck?.id ?? 'role'] ?? '#2f76ac'
  const activeDeckLabel = deckLabels[activeDeck?.id ?? ''] ?? activeDeck?.label ?? 'Bộ thẻ'
  const isCharacterDeck = activeDeck?.id === 'characters3d'
  const isStickerDeck = activeDeck?.id === 'sticker'

  useEffect(() => { document.title = 'EmCoin - Khám phá thẻ 3D' }, [])
  useEffect(() => {
    setCardIndex(0)
    rotationRef.current = isCharacterDeck ? CHARACTER_FRONT_YAW : 0
    verticalRotationRef.current = 0
    flipTargetRef.current = 0
    flipPulseRef.current = null
  }, [activeDeck?.id, isCharacterDeck])
  useEffect(() => { autoRotateRef.current = autoRotate }, [autoRotate])
  useEffect(() => { isCharacterModeRef.current = isCharacterDeck }, [isCharacterDeck])
  useEffect(() => { isStickerModeRef.current = isStickerDeck }, [isStickerDeck])

  const resetView = (preserveZoom = false) => {
    rotationRef.current = isCharacterModeRef.current ? CHARACTER_FRONT_YAW : 0
    verticalRotationRef.current = 0
    flipTargetRef.current = 0
    flipPulseRef.current = null
    if (!preserveZoom) zoomRef.current = DEFAULT_ZOOM
  }

  const moveCard = (offset: number) => {
    const count = activeDeck?.cards.length ?? 0
    if (!count) return
    resetView(true)
    cardDirectionRef.current = offset >= 0 ? 1 : -1
    setCardIndex((current) => (current + offset + count) % count)
    setRightOpen(false)
  }
  useEffect(() => {
    if (!activeCard) return
    resetView(true)
  }, [activeCard, isCharacterDeck])

  useEffect(() => {
    const host = hostRef.current, canvas = canvasRef.current
    if (!host || !canvas) return
    return createShowcaseRenderer({ host, canvas, modelLimit: characters3D.length, stickerLimit: stickerModels.length,
      buildSticker: buildStickerMesh, onUnavailable: setGraphicsUnavailable, onLoading: setCardLoading,
      bindings: { rendererGenerationRef, materialsInUseRef, textureOwnerRef, assetLoadersRef, regenerateEnvironmentRef, groupRef, incomingGroupRef, characterGroupRef, stickerGroupRef, isCharacterModeRef, isStickerModeRef, flipTargetRef, flipPulseRef, triggerFlipRef, frontMaterialRef, backMaterialRef, texturesRef, slideControllerRef, dragRef, rotationRef, verticalRotationRef, zoomRef, autoRotateRef, characterDistanceRef, characterIntroRef, stickerIntroRef },
    })
  }, [])

  useEffect(() => {
    if (!activeCard || graphicsUnavailable) return
    setAssetError(false)
    const generation = rendererGenerationRef.current
    const group = groupRef.current; const incomingGroup = incomingGroupRef.current; const characterGroup = characterGroupRef.current
    const stickerGroup = stickerGroupRef.current
    if (!group || !incomingGroup || !characterGroup || !stickerGroup) return
    const assets = assetLoadersRef.current
    if (!assets) return

    if (activeCard.kind === 'sticker') {
      group.visible = false; incomingGroup.visible = false; characterGroup.visible = false; stickerGroup.visible = true
      let cancelled = false
      const slug = activeCard.back
      const apply = (built: THREE.Group) => {
        while (stickerGroup.children.length) stickerGroup.remove(stickerGroup.children[0])
        stickerGroup.add(built)
        rotationRef.current = 0
        stickerIntroRef.current = 0
        stickerGroup.scale.setScalar(0.9)
        setCardLoading(false)
      }
      const key = assets.stickerKey(slug, activeCard.front)
      const release = assets.stickers.retain([key])
      setCardLoading(true)
      void assets.loadSticker(slug, activeCard.front).then(built => {
        if (!cancelled && !generation.disposed) { apply(built); assets.stickers.trim() }
      }).catch(() => { if (!cancelled && !generation.disposed) { setAssetError(true); setCardLoading(false) } })
      return () => { cancelled = true; release() }
    }

    if (activeCard.kind === 'model') {
      group.visible = false; incomingGroup.visible = false; characterGroup.visible = true; stickerGroup.visible = false
      let cancelled = false
      const applyModel = (scene: THREE.Object3D, distance: number) => {
        while (characterGroup.children.length) characterGroup.remove(characterGroup.children[0])
        characterGroup.add(scene)
        characterDistanceRef.current = distance
        rotationRef.current = CHARACTER_FRONT_YAW
        characterIntroRef.current = 0
        characterGroup.scale.setScalar(0.9)
        setCardLoading(false)
      }
      const release = assets.models.retain([activeCard.front])
      setCardLoading(true)
      void assets.loadModel(activeCard.front).then(model => {
        if (!cancelled && !generation.disposed) { applyModel(model.scene, model.distance); assets.models.trim() }
      }).catch(() => { if (!cancelled && !generation.disposed) { setAssetError(true); setCardLoading(false) } })
      return () => { cancelled = true; release() }
    }

    group.visible = true; characterGroup.visible = false; stickerGroup.visible = false
    if (!frontMaterialRef.current || !backMaterialRef.current) return
    const owner = textureOwnerRef.current
    if (!owner) return
    const release = owner.retain([activeCard.front, activeCard.back])
    setCardLoading(true)
    const load = (src: string) => {
      return owner.load(src, () => new Promise<THREE.Texture>((resolve, reject) => new THREE.TextureLoader().load(src, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8
        resolve(texture)
      }, undefined, reject)))
    }
    let cancelled = false
    Promise.all([load(activeCard.front), load(activeCard.back)]).then(([front, back]) => {
      if (cancelled || generation.disposed) return
      const direction = cardDirectionRef.current
      if (!texturesRef.current.length) {
        slideControllerRef.current?.setInitial(front, back)
        texturesRef.current = [front, back]
      } else {
        slideControllerRef.current?.transition(front, back, direction)
      }
      setCardLoading(false)
      const count = activeDeck?.cards.length ?? 0
      if (count > 1) {
        const next = activeDeck.cards[(cardIndex + 1) % count]
        const previous = activeDeck.cards[(cardIndex - 1 + count) % count]
        if (!next.kind && !previous.kind) {
          const paths = [next.front, next.back, previous.front, previous.back]
          const releaseNeighbors = owner.retain(paths)
          void Promise.all(paths.map(load)).catch(() => { /* Noncritical neighbor failure must not reject the active card. */ }).finally(releaseNeighbors)
        }
      }
    }).catch(() => { if (!cancelled && !generation.disposed) { setAssetError(true); setCardLoading(false) } })
    return () => { cancelled = true; release() }
  }, [activeCard, activeDeck, cardIndex, graphicsUnavailable])

  return <main className="showcase-root" style={{ '--accent': accent } as CSSProperties}>
    <style>{`
      .showcase-root { --ink:#164d78; --muted:#6d91aa; min-height:100dvh; display:flex; align-items:center; justify-content:center; color:var(--ink); background:radial-gradient(circle at 78% -12%,rgba(149,233,255,.9) 0,transparent 42%),radial-gradient(circle at 8% 92%,rgba(255,193,220,.58) 0,transparent 38%),linear-gradient(180deg,#f5fdff 0%,#e6f5ff 52%,#fff3f8 100%); font-family:var(--font-body),system-ui,sans-serif; }
      .showcase-panel { position:relative; width:100%; max-width:430px; height:100dvh; overflow:hidden; }
      .showcase-top { position:absolute; z-index:2; top:max(14px,env(safe-area-inset-top)); left:0; right:0; display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding:0 12px; pointer-events:none; }
      .showcase-top > * { pointer-events:auto; }
      .circle-link { display:grid; place-items:center; width:40px; height:40px; border:1px solid rgba(22,77,120,.12); border-radius:50%; background:rgba(255,255,255,.82); backdrop-filter:blur(10px); box-shadow:0 8px 18px rgba(22,77,120,.12); text-decoration:none; }
      .circle-link > img { display:none; } .circle-link span { color:var(--ink); font-size:11px; font-weight:900; line-height:1; }
      .showcase-title { min-width:0; text-align:center; margin-top:2px; } .showcase-title b { display:block; color:var(--accent); font-size:clamp(16px,4.6vw,20px); font-weight:900; line-height:1.1; } .showcase-title span { display:block; margin-top:3px; overflow:hidden; color:var(--muted); font-size:11px; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
      .showcase-canvas { position:absolute; inset:0; width:100%; height:100%; overflow:hidden; cursor:grab; touch-action:none; background:radial-gradient(circle at center 42%,rgba(255,255,255,.98) 0,rgba(255,255,255,.52) 42%,transparent 70%),linear-gradient(160deg,#c8f2ff,#fff1f8 78%); }
      .showcase-canvas:active { cursor:grabbing; } .showcase-canvas canvas { display:block; width:100%; height:100%; }
      .side-nav { position:absolute; inset:50% 10px auto; z-index:5; display:flex; justify-content:space-between; transform:translateY(-50%); pointer-events:none; }
      .side-nav-button { display:grid; place-items:center; width:46px; height:46px; border:1px solid rgba(255,255,255,.9); border-radius:50%; background:rgba(255,255,255,.88); color:var(--ink); box-shadow:0 12px 26px rgba(22,77,120,.18); font:900 28px/1 var(--font-body); cursor:pointer; pointer-events:auto; transition:transform 160ms ease,background 160ms ease; }
      .side-nav-button:hover { background:#fff; transform:scale(1.06); }
      .side-nav-button:active { transform:scale(.94); }
      .right-actions { position:absolute; top:66px; right:12px; z-index:4; display:flex; flex-direction:column; gap:10px; }
      .right-action-btn { display:grid; place-items:center; width:38px; height:38px; border:1px solid rgba(22,77,120,.12); border-radius:50%; background:rgba(255,255,255,.82); backdrop-filter:blur(10px); color:var(--ink); box-shadow:0 8px 18px rgba(22,77,120,.14); cursor:pointer; transition:transform 160ms ease; }
      .right-action-btn:active { transform:scale(.92); }
      .canvas-loading-hint { position:fixed; inset:0; z-index:30; display:grid; place-items:center; padding:24px; color:var(--ink); font:900 13px var(--font-body); text-align:center; pointer-events:none; }
      .deck-row,.card-row { display:flex; gap:8px; overflow-x:auto; padding:2px 2px 8px; scrollbar-width:none; } .deck-row::-webkit-scrollbar,.card-row::-webkit-scrollbar { display:none; }
      .deck-chip,.card-chip { border:1px solid rgba(22,77,120,.12); border-radius:999px; background:#fff; color:var(--ink); font:800 14px var(--font-body); white-space:nowrap; cursor:pointer; transition:transform 160ms ease,background 160ms ease; } .deck-chip:active,.card-chip:active { transform:scale(.97); } .deck-chip { min-height:38px; padding:8px 12px; } .card-chip { min-height:32px; padding:6px 10px; font-size:12px; } .deck-chip.active { border-color:transparent; color:#fff; background:var(--accent); } .card-chip.active { border-color:var(--accent); color:var(--accent); }
      .report-link { display:block; margin:12px 0 0; color:var(--muted); text-align:center; font-size:12px; font-weight:800; text-decoration:none; }
      .showcase-loading { position:fixed; inset:0; z-index:40; display:grid; place-items:center; padding:24px; color:var(--ink); background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.96) 0,rgba(255,255,255,.72) 42%,rgba(255,239,247,.94) 100%); font-size:20px; font-weight:900; text-align:center; pointer-events:none; }
      .panel-backdrop { position:absolute; inset:0; z-index:3; background:transparent; }
      .bottom-bar { position:absolute; left:50%; bottom:calc(16px + env(safe-area-inset-bottom)); transform:translateX(-50%); z-index:4; display:flex; align-items:center; gap:10px; }
      .bottom-trigger-wrap { position:relative; }
      .bottom-trigger { min-height:42px; padding:0 16px; border:1px solid rgba(255,255,255,.82); border-radius:999px; background:rgba(255,255,255,.82); backdrop-filter:blur(10px); color:var(--ink); box-shadow:0 12px 26px rgba(22,77,120,.16); font:900 12px var(--font-body); cursor:pointer; }
      .bottom-counter { min-width:34px; padding:7px 10px; border-radius:999px; background:rgba(255,255,255,.72); backdrop-filter:blur(8px); color:var(--ink); text-align:center; font:900 12px var(--font-body); box-shadow:0 8px 18px rgba(22,77,120,.1); }
      .bottom-panel { position:absolute; bottom:calc(100% + 10px); left:50%; transform:translateX(-50%); width:min(230px,68vw); max-height:80dvh; overflow:auto; padding:10px; border:1px solid rgba(255,255,255,.75); border-radius:20px; background:rgba(255,255,255,.94); box-shadow:0 16px 34px rgba(22,77,120,.2); scrollbar-width:none; }
      .bottom-panel::-webkit-scrollbar { display:none; }
      .bottom-panel .deck-row,.bottom-panel .card-row { display:grid; grid-template-columns:1fr; padding:0; }
      .bottom-panel .card-row { grid-template-columns:1fr 1fr; gap:6px; max-height:54dvh; overflow:auto; }
      .bottom-panel .deck-row { max-height:none; overflow:visible; }
      .bottom-panel .deck-chip,.bottom-panel .card-chip { min-height:36px; padding:6px 10px; overflow:hidden; text-overflow:ellipsis; }
      .bottom-panel .report-link { display:block; margin-top:10px; }
      @media (max-width:360px) { .bottom-panel { width:min(190px,66vw); } .showcase-title span { font-size:10px; } }
    `}</style>
    <div className="showcase-panel" ref={hostRef}>
      <div className="showcase-top">
        <a className="circle-link" href="/about" aria-label="Quay lại landing"><ArrowLeft size={18} aria-hidden="true" /></a>
        <div className="showcase-title"><b>{activeDeckLabel}</b><span>{activeCard ? `${activeCard.title} · ${activeDeck?.count ?? 0} ${isCharacterDeck ? 'nhân vật' : isStickerDeck ? 'sticker' : 'thẻ mẫu'}` : 'Đang tải bộ thẻ'}</span></div>
        <button className="circle-link" type="button" onClick={() => setAutoRotate((value) => !value)} aria-label="Bật tắt xoay tự động"><span>{autoRotate ? 'Dừng' : 'Tự động'}</span></button>
      </div>
      <div className="showcase-canvas">
        <canvas ref={canvasRef} data-testid="card-showcase-canvas" aria-hidden={graphicsUnavailable || assetError} />
        {(graphicsUnavailable || assetError) && <section aria-label="Bản xem thay thế" style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 'calc(166px + env(safe-area-inset-top)) 24px 140px', background: '#e6f5ff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <p role="status">{graphicsUnavailable ? 'Không thể hiển thị 3D trên thiết bị này. Hình gốc được giữ nguyên.' : 'Chưa tải được nội dung 3D. Bạn vẫn có thể chuyển bộ thẻ.'}</p>
          {activeCard && activeCard.kind !== 'model' ? <>
            <img src={activeCard.front} alt={`${activeCard.title} — mặt trước`} style={{ maxWidth: '100%', width: 180, height: 'auto' }} />
            {!activeCard.kind && <img src={activeCard.back} alt={`${activeCard.title} — mặt sau`} style={{ maxWidth: '100%', width: 180, height: 'auto' }} />}
          </> : activeCard && <p>Chưa có hình thay thế được duyệt cho nhân vật này.</p>}
        </section>}
        {cardLoading && <div className="canvas-loading-hint">{isCharacterDeck ? 'Đang tải nhân vật...' : isStickerDeck ? 'Đang tải sticker...' : 'Đang tải thẻ...'}</div>}
      </div>
      {loading && <div className="showcase-loading">Đang mở bộ thẻ...</div>}
      {(leftOpen || rightOpen) && <div className="panel-backdrop" onClick={() => { setLeftOpen(false); setRightOpen(false) }} />}
      <div className="side-nav" aria-label="Chuyển card">
        <button className="side-nav-button" type="button" onClick={() => moveCard(-1)} aria-label="Card trước"><ChevronLeft size={26} aria-hidden="true" /></button>
        <button className="side-nav-button" type="button" onClick={() => moveCard(1)} aria-label="Card kế tiếp"><ChevronRight size={26} aria-hidden="true" /></button>
      </div>
      <div className="right-actions">
        <button className="right-action-btn" type="button" onClick={() => triggerFlipRef.current?.()} aria-label="Lật 180°"><RotateCw size={18} /></button>
        <button className="right-action-btn" type="button" onClick={() => resetView()} aria-label="Về vị trí cũ"><RotateCcw size={18} /></button>
      </div>
      <div className="bottom-bar">
        <div className="bottom-trigger-wrap">
          <button className="bottom-trigger" type="button" onClick={() => { setLeftOpen((value) => !value); setRightOpen(false) }} aria-expanded={leftOpen}>Bộ thẻ</button>
          {leftOpen && <div className="bottom-panel"><div className="deck-row" aria-label="Chọn loại thẻ">{decks.map((deck) => <button className={`deck-chip ${deck.id === activeDeck?.id ? 'active' : ''}`} key={deck.id} type="button" onClick={() => { setDeckId(deck.id); setLeftOpen(false) }}>{deckLabels[deck.id] ?? deck.label}</button>)}</div></div>}
        </div>
        <span className="bottom-counter">{activeDeck ? `${cardIndex + 1}/${activeDeck.cards.length}` : '0/0'}</span>
        <div className="bottom-trigger-wrap">
          <button className="bottom-trigger" type="button" onClick={() => { setRightOpen((value) => !value); setLeftOpen(false) }} aria-expanded={rightOpen}>Điều khiển</button>
          {rightOpen && <div className="bottom-panel"><div className="card-row" aria-label="Chọn lá thẻ">{activeDeck?.cards.map((card, index) => <button className={`card-chip ${index === cardIndex ? 'active' : ''}`} key={`${activeDeck.id}-${card.front}`} type="button" onClick={() => { resetView(true); cardDirectionRef.current = index >= cardIndex ? 1 : -1; setCardIndex(index); setRightOpen(false) }}>{card.title}</button>)}</div></div>}
        </div>
      </div>
    </div>
  </main>
}
