import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { CARD_IMAGES } from '@/constants/cardImages'
import { characters3D } from './characterModels'

type ShowcaseCard = { title: string; group: string; front: string; back: string; kind?: 'model' }
type ShowcaseDeck = { id: string; label: string; count: number; cards: ShowcaseCard[] }

const deckColors: Record<string, string> = {
  role: '#f5b700', situation: '#2f76ac', emotion: '#ed5b87', reflection: '#49a923', selfcare: '#ef7d3d', characters3d: '#7b4fd4',
}
const deckLabels: Record<string, string> = {
  role: 'Vai trò', situation: 'Tình huống', emotion: 'Cảm xúc', reflection: 'Phản tư', selfcare: 'Bí kíp ôm', coin: 'Coin', characters3d: 'Nhân vật 3D',
}

const CARD_HEIGHT = 2.38
const CARD_WIDTH = CARD_HEIGHT * (491 / 760)
const CARD_DEPTH = 0.018
// Match the rounded corners in the supplied card artwork so no rectangular
// texture edge peeks out beyond the 3D card silhouette.
const CARD_RADIUS = 0.105
const DEFAULT_ZOOM = 0.92

// Tripo/Meshy exports don't face +Z by default — reset to this yaw whenever a
// character model loads so it starts front-facing instead of edge-on.
const CHARACTER_FRONT_YAW = -0.9

const coinDeck: ShowcaseDeck = {
  id: 'coin', label: 'Coin', count: 6,
  cards: [
    { title: 'Đỏ 1', group: 'coin', front: CARD_IMAGES.coins.red1, back: CARD_IMAGES.coins.red2 },
    { title: 'Đỏ 2', group: 'coin', front: CARD_IMAGES.coins.red2, back: CARD_IMAGES.coins.red1 },
    { title: 'Vàng 1', group: 'coin', front: CARD_IMAGES.coins.yellow1, back: CARD_IMAGES.coins.yellow2 },
    { title: 'Vàng 2', group: 'coin', front: CARD_IMAGES.coins.yellow2, back: CARD_IMAGES.coins.yellow1 },
    { title: 'Xanh 1', group: 'coin', front: CARD_IMAGES.coins.green1, back: CARD_IMAGES.coins.green2 },
    { title: 'Xanh 2', group: 'coin', front: CARD_IMAGES.coins.green2, back: CARD_IMAGES.coins.green1 },
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

function roundedShape(width: number, height: number, radius: number) {
  const x = -width / 2; const y = -height / 2
  const shape = new THREE.Shape()
  shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  return shape
}

function cardFace(width: number, height: number, radius: number) {
  const geometry = new THREE.ShapeGeometry(roundedShape(width, height, radius), 32)
  const positions = geometry.attributes.position
  const uvs: number[] = []
  for (let index = 0; index < positions.count; index += 1) {
    uvs.push((positions.getX(index) + width / 2) / width, (positions.getY(index) + height / 2) / height)
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geometry
}

function useCardManifest() {
  const [decks, setDecks] = useState<ShowcaseDeck[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    fetch('/card-showcase/manifest.json')
      .then((res) => res.json() as Promise<ShowcaseDeck[]>)
      .then((data) => {
        if (!mounted) return
        const normalized = data.map((deck) => {
          if (deck.id === 'emotion') return emotionDeck
          return deck
        })
        setDecks([...normalized, coinDeck, charactersDeck]); setLoading(false)
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])
  return { decks, loading }
}

export default function CardShowcase() {
  const { decks, loading } = useCardManifest()
  const [deckId, setDeckId] = useState('role')
  const [cardIndex, setCardIndex] = useState(0)
  const [autoRotate, setAutoRotate] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [flipSignal, setFlipSignal] = useState(0)
  const [cardLoading, setCardLoading] = useState(true)
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
  const textureCacheRef = useRef(new Map<string, THREE.Texture>())
  const slideControllerRef = useRef<{ setInitial: (front: THREE.Texture, back: THREE.Texture) => void; transition: (front: THREE.Texture, back: THREE.Texture, direction: number) => void } | null>(null)
  const cardDirectionRef = useRef(1)
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 })
  const swipeStartRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const incomingGroupRef = useRef<THREE.Group | null>(null)
  const characterGroupRef = useRef<THREE.Group | null>(null)
  const characterIntroRef = useRef(1)
  const characterDistanceRef = useRef(6.75)
  const modelCacheRef = useRef(new Map<string, { scene: THREE.Object3D; distance: number }>())
  const isCharacterModeRef = useRef(false)
  const regenerateEnvironmentRef = useRef<(() => void) | null>(null)
  const zoomRef = useRef(DEFAULT_ZOOM)

  const activeDeck = useMemo(() => decks.find((deck) => deck.id === deckId) ?? decks[0], [deckId, decks])
  const activeCard = activeDeck?.cards[Math.min(cardIndex, Math.max(0, (activeDeck?.cards.length ?? 1) - 1))]
  const accent = deckColors[activeDeck?.id ?? 'role'] ?? '#2f76ac'
  const activeDeckLabel = deckLabels[activeDeck?.id ?? ''] ?? activeDeck?.label ?? 'Bộ thẻ'
  const isCharacterDeck = activeDeck?.id === 'characters3d'

  useEffect(() => { document.title = 'EmCoin - Khám phá thẻ 3D' }, [])
  useEffect(() => {
    setCardIndex(0)
    rotationRef.current = isCharacterDeck ? CHARACTER_FRONT_YAW : 0
    verticalRotationRef.current = 0
    flipTargetRef.current = 0
  }, [activeDeck?.id, isCharacterDeck])
  useEffect(() => { autoRotateRef.current = autoRotate }, [autoRotate])
  useEffect(() => { isCharacterModeRef.current = isCharacterDeck }, [isCharacterDeck])
  useEffect(() => { flipTargetRef.current += Math.PI }, [flipSignal])

  const resetView = (preserveZoom = false) => {
    rotationRef.current = isCharacterModeRef.current ? CHARACTER_FRONT_YAW : 0
    verticalRotationRef.current = 0
    flipTargetRef.current = 0
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
  // The canvas swipe-to-change-card gesture lives inside the mount-once Three.js
  // effect below, so it reaches moveCard through a ref that's always current
  // instead of closing over the first render's stale version.
  const moveCardRef = useRef(moveCard)
  useEffect(() => { moveCardRef.current = moveCard })
  useEffect(() => {
    if (!activeCard) return
    resetView(true)
  }, [activeCard?.front, isCharacterDeck])

  useEffect(() => {
    const host = hostRef.current; const canvas = canvasRef.current
    if (!host || !canvas) return
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.62
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0.08, 6.75)
    const pmrem = new THREE.PMREMGenerator(renderer)
    // A soft, heavily-blurred environment reads as gentle studio light on the
    // glossy character materials instead of harsh, blown-out highlights.
    const applyEnvironment = () => { scene.environment = pmrem.fromScene(new RoomEnvironment(), 2.2).texture }
    applyEnvironment()
    regenerateEnvironmentRef.current = applyEnvironment
    const group = new THREE.Group(); const incomingGroup = new THREE.Group(); scene.add(group, incomingGroup); incomingGroup.visible = false
    const characterGroup = new THREE.Group(); characterGroup.visible = false; scene.add(characterGroup)
    groupRef.current = group; incomingGroupRef.current = incomingGroup; characterGroupRef.current = characterGroup
    const faceGeometry = cardFace(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS)
    const backGeometry = cardFace(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS)
    const sideGeometry = new THREE.ExtrudeGeometry(roundedShape(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS), { depth: CARD_DEPTH, bevelEnabled: false, curveSegments: 24 })
    sideGeometry.translate(0, 0, -CARD_DEPTH / 2)
    const sideMaterial = new THREE.MeshStandardMaterial({ color: '#f2fbff', roughness: 0.8 })
    const frontMaterial = new THREE.MeshBasicMaterial({ color: '#fff', transparent: true })
    const backMaterial = new THREE.MeshBasicMaterial({ color: '#fff', transparent: true })
    const incomingSideMaterial = new THREE.MeshStandardMaterial({ color: '#f2fbff', roughness: 0.8 })
    const incomingFrontMaterial = new THREE.MeshBasicMaterial({ color: '#fff', transparent: true })
    const incomingBackMaterial = new THREE.MeshBasicMaterial({ color: '#fff', transparent: true })
    // Card faces are flat, pre-lit artwork — tone mapping is meant to tame HDR-ish
    // PBR lighting on the 3D characters, but applying it here just darkens/skews
    // the card images, so these specific materials opt out of it.
    frontMaterial.toneMapped = false; backMaterial.toneMapped = false
    incomingFrontMaterial.toneMapped = false; incomingBackMaterial.toneMapped = false
    frontMaterialRef.current = frontMaterial; backMaterialRef.current = backMaterial
    const side = new THREE.Mesh(sideGeometry, sideMaterial)
    const front = new THREE.Mesh(faceGeometry, frontMaterial); const back = new THREE.Mesh(backGeometry, backMaterial)
    const incomingSide = new THREE.Mesh(sideGeometry, incomingSideMaterial)
    const incomingFront = new THREE.Mesh(faceGeometry, incomingFrontMaterial); const incomingBack = new THREE.Mesh(backGeometry, incomingBackMaterial)
    front.position.z = CARD_DEPTH / 2 + 0.001; back.position.z = -CARD_DEPTH / 2 - 0.001; back.rotation.y = Math.PI
    incomingFront.position.z = CARD_DEPTH / 2 + 0.001; incomingBack.position.z = -CARD_DEPTH / 2 - 0.001; incomingBack.rotation.y = Math.PI
    group.add(side, front, back)
    incomingGroup.add(incomingSide, incomingFront, incomingBack)
    scene.add(new THREE.AmbientLight(0xffffff, 1.25)); const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(2.5, 4, 5); scene.add(key)
    materialsInUseRef.current = [frontMaterial, backMaterial, incomingFrontMaterial, incomingBackMaterial]
    const slideDistance = 2.45
    let slide: { direction: number; front: THREE.Texture; back: THREE.Texture; oldX: number; incomingX: number; oldScale: number; incomingScale: number } | null = null
    const setMaps = (frontMap: THREE.Texture, backMap: THREE.Texture) => {
      frontMaterial.map = frontMap; frontMaterial.needsUpdate = true
      backMaterial.map = backMap; backMaterial.needsUpdate = true
    }
    // Disposing a texture that is still referenced by the cache would leave a dead
    // entry behind (three.js does not re-upload a disposed texture on reuse), so any
    // interrupted-transition disposal must also evict the matching cache entry.
    const disposeAndUncache = (texture: THREE.Texture) => {
      for (const [key, cached] of textureCacheRef.current) {
        if (cached === texture) { textureCacheRef.current.delete(key); break }
      }
      texture.dispose()
    }
    const completeSlide = () => {
      if (!slide) return
      setMaps(slide.front, slide.back)
      texturesRef.current = [slide.front, slide.back]
      group.position.x = 0; incomingGroup.position.x = slideDistance * slide.direction; incomingGroup.visible = false
      group.scale.setScalar(1); incomingGroup.scale.setScalar(1)
      slide = null
    }
    slideControllerRef.current = {
      setInitial: (frontMap, backMap) => { setMaps(frontMap, backMap); incomingGroup.visible = false; group.position.x = 0 },
      transition: (frontMap, backMap, direction) => {
        if (slide) { disposeAndUncache(slide.front); disposeAndUncache(slide.back) }
        incomingFrontMaterial.map = frontMap; incomingFrontMaterial.needsUpdate = true
        incomingBackMaterial.map = backMap; incomingBackMaterial.needsUpdate = true
        incomingGroup.position.x = direction * slideDistance; incomingGroup.visible = true
        incomingGroup.scale.setScalar(0.9)
        slide = { direction, front: frontMap, back: backMap, oldX: 0, incomingX: direction * slideDistance, oldScale: 1, incomingScale: 0.9 }
      },
    }
    const onContextLost = (event: Event) => { event.preventDefault() }
    const onContextRestored = () => {
      completeSlide()
      applyEnvironment()
      ;[frontMaterial, backMaterial, incomingFrontMaterial, incomingBackMaterial].forEach((material) => {
        if (material.map) material.map.needsUpdate = true
        material.needsUpdate = true
      })
      characterGroup.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          const material = node.material as THREE.MeshStandardMaterial
          material.needsUpdate = true
          if (material.map) material.map.needsUpdate = true
        }
      })
    }
    canvas.addEventListener('webglcontextlost', onContextLost, false)
    canvas.addEventListener('webglcontextrestored', onContextRestored, false)
    const resize = () => { const rect = host.getBoundingClientRect(); renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)), false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix() }
    const MIN_ZOOM = 0.74; const MAX_ZOOM = 1.45
    const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value))
    const activePointers = new Map<number, { x: number; y: number }>()
    let pinchStartDist = 0
    let pinchStartZoom = DEFAULT_ZOOM
    const down = (event: PointerEvent) => {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      canvas.setPointerCapture?.(event.pointerId)
      if (activePointers.size === 1) {
        dragRef.current = { active: true, lastX: event.clientX, lastY: event.clientY }
        swipeStartRef.current = { x: event.clientX, y: event.clientY, t: performance.now() }
        setAutoRotate(false)
      } else if (activePointers.size === 2) {
        dragRef.current.active = false
        swipeStartRef.current = null
        const [a, b] = Array.from(activePointers.values())
        pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y)
        pinchStartZoom = zoomRef.current
      }
    }
    const move = (event: PointerEvent) => {
      if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (activePointers.size >= 2) {
        const [a, b] = Array.from(activePointers.values())
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchStartDist > 0) zoomRef.current = clampZoom(pinchStartZoom * (dist / pinchStartDist))
        return
      }
      if (!dragRef.current.active) return
      const deltaX = event.clientX - dragRef.current.lastX
      const deltaY = event.clientY - dragRef.current.lastY
      dragRef.current.lastX = event.clientX; dragRef.current.lastY = event.clientY
      rotationRef.current += deltaX * 0.012
      verticalRotationRef.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, verticalRotationRef.current + deltaY * 0.012))
    }
    const up = (event: PointerEvent) => {
      const wasSoloDrag = activePointers.size === 1 && swipeStartRef.current
      if (wasSoloDrag) {
        const start = swipeStartRef.current!
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        const elapsed = performance.now() - start.t
        // A quick, mostly-horizontal flick changes the card; a slower or more
        // vertical drag was just rotating the object and shouldn't also swipe.
        if (elapsed < 650 && Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          moveCardRef.current(dx < 0 ? 1 : -1)
        }
      }
      swipeStartRef.current = null
      activePointers.delete(event.pointerId)
      if (activePointers.size < 2) pinchStartDist = 0
      if (activePointers.size === 0) dragRef.current.active = false
      else if (activePointers.size === 1) {
        const [[, point]] = Array.from(activePointers.entries())
        dragRef.current = { active: true, lastX: point.x, lastY: point.y }
      }
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomRef.current = clampZoom(zoomRef.current * (1 - event.deltaY * 0.001))
    }
    canvas.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('resize', resize); canvas.addEventListener('wheel', onWheel, { passive: false }); resize()
    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const now = performance.now()
      const idleYaw = Math.sin(now / 4200) * 0.018
      const idleTilt = Math.sin(now / 2800) * 0.009
      if (!dragRef.current.active && autoRotateRef.current) rotationRef.current += 0.0025
      const baseYaw = rotationRef.current + flipTargetRef.current + idleYaw
      const basePitch = verticalRotationRef.current + Math.sin(now / 3200) * 0.014
      const baseRoll = idleTilt
      const floatY = Math.sin(now / 1900) * 0.045

      if (isCharacterModeRef.current) {
        camera.position.set(0, 0.05, characterDistanceRef.current / zoomRef.current)
        camera.lookAt(0, 0, 0)
        characterGroup.rotation.y += (baseYaw - characterGroup.rotation.y) * 0.12
        characterGroup.rotation.x += (basePitch - characterGroup.rotation.x) * 0.12
        characterGroup.rotation.z += (baseRoll - characterGroup.rotation.z) * 0.1
        characterGroup.position.y += (floatY - characterGroup.position.y) * 0.06
        characterIntroRef.current += (1 - characterIntroRef.current) * 0.2
        characterGroup.scale.setScalar(0.9 + characterIntroRef.current * 0.1)
      } else {
        camera.position.set(0, 0.08, 6.75 / zoomRef.current)
        camera.lookAt(0, 0, 0)
      }

      group.rotation.y += (baseYaw - group.rotation.y) * 0.12
      group.rotation.x += (basePitch - group.rotation.x) * 0.12
      group.rotation.z += (baseRoll - group.rotation.z) * 0.1
      group.scale.setScalar(1)
      group.position.z += (group.position.z * -1) * 0.12
      group.position.y += (floatY - group.position.y) * 0.06
      if (slide) {
        // Simple exponential easing toward each target — unlike a hand-rolled
        // spring integrator this can never overshoot or run away, so the old
        // card is guaranteed to reach the edge and get swapped out.
        const oldTarget = -slide.direction * slideDistance
        const ease = 0.22
        slide.oldX += (oldTarget - slide.oldX) * ease
        slide.incomingX += (0 - slide.incomingX) * ease
        group.position.x = slide.oldX
        incomingGroup.position.x = slide.incomingX
        slide.oldScale += (0.9 - slide.oldScale) * 0.24
        slide.incomingScale += (1 - slide.incomingScale) * 0.24
        group.scale.setScalar(slide.oldScale)
        incomingGroup.scale.setScalar(slide.incomingScale)
        group.position.y = floatY
        incomingGroup.position.y += (floatY - incomingGroup.position.y) * 0.14
        group.rotation.y += (baseYaw - group.rotation.y) * 0.2
        incomingGroup.rotation.y += (baseYaw - incomingGroup.rotation.y) * 0.2
        group.rotation.x += (basePitch - group.rotation.x) * 0.18
        incomingGroup.rotation.x += (basePitch - incomingGroup.rotation.x) * 0.18
        group.rotation.z += (baseRoll - group.rotation.z) * 0.18
        incomingGroup.rotation.z += (baseRoll - incomingGroup.rotation.z) * 0.18
        const settled = Math.abs(slide.oldX - oldTarget) < 0.01 && Math.abs(slide.incomingX) < 0.01 && Math.abs(slide.incomingScale - 1) < 0.01
        if (settled) completeSlide()
      }
      renderer.render(scene, camera)
    }
    animate()
    return () => {
      slideControllerRef.current = null; regenerateEnvironmentRef.current = null; cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('resize', resize); canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('webglcontextlost', onContextLost); canvas.removeEventListener('webglcontextrestored', onContextRestored)
      frontMaterial.dispose(); backMaterial.dispose(); sideMaterial.dispose(); incomingFrontMaterial.dispose(); incomingBackMaterial.dispose(); incomingSideMaterial.dispose(); faceGeometry.dispose(); backGeometry.dispose(); sideGeometry.dispose()
      textureCacheRef.current.forEach((texture) => texture.dispose()); textureCacheRef.current.clear()
      modelCacheRef.current.forEach(({ scene: modelScene }) => modelScene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose()
          const material = node.material as THREE.MeshStandardMaterial
          material.map?.dispose(); material.normalMap?.dispose(); material.roughnessMap?.dispose(); material.dispose()
        }
      }))
      modelCacheRef.current.clear()
      pmrem.dispose()
      renderer.dispose(); frontMaterialRef.current = null; backMaterialRef.current = null; materialsInUseRef.current = []
      groupRef.current = null; incomingGroupRef.current = null; characterGroupRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!activeCard) return
    const group = groupRef.current; const incomingGroup = incomingGroupRef.current; const characterGroup = characterGroupRef.current
    if (!group || !incomingGroup || !characterGroup) return

    if (activeCard.kind === 'model') {
      group.visible = false; incomingGroup.visible = false; characterGroup.visible = true
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
      const cached = modelCacheRef.current.get(activeCard.front)
      if (cached) {
        applyModel(cached.scene, cached.distance)
      } else {
        setCardLoading(true)
        const loader = new GLTFLoader()
        loader.setMeshoptDecoder(MeshoptDecoder)
        loader.load(activeCard.front, (gltf) => {
          if (cancelled) return
          const box = new THREE.Box3().setFromObject(gltf.scene)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z) || 1
          gltf.scene.position.sub(center)
          const distance = maxDim * 3.6
          modelCacheRef.current.set(activeCard.front, { scene: gltf.scene, distance })
          applyModel(gltf.scene, distance)
        }, undefined, () => { if (!cancelled) setCardLoading(false) })
      }
      return () => { cancelled = true }
    }

    group.visible = true; characterGroup.visible = false
    if (!frontMaterialRef.current || !backMaterialRef.current) return
    // Textures accumulate across every deck a curious visitor browses in one session;
    // without a cap the GPU-memory footprint grows unbounded and mobile GPUs can hit
    // context loss. Cap the cache and evict the least-recently-used entries, but never
    // an entry that's still bound to a currently visible material.
    const MAX_TEXTURE_CACHE = 96
    const evictIfNeeded = () => {
      const cache = textureCacheRef.current
      if (cache.size <= MAX_TEXTURE_CACHE) return
      const inUse = new Set(materialsInUseRef.current.map((material) => material.map).filter(Boolean))
      let overflow = cache.size - MAX_TEXTURE_CACHE
      for (const [key, texture] of cache) {
        if (overflow <= 0) break
        if (inUse.has(texture)) continue
        texture.dispose(); cache.delete(key); overflow -= 1
      }
    }
    const load = (src: string) => {
      const cached = textureCacheRef.current.get(src)
      if (cached) {
        // bump recency so it's not picked for eviction while still relevant
        textureCacheRef.current.delete(src); textureCacheRef.current.set(src, cached)
        return Promise.resolve(cached)
      }
      return new Promise<THREE.Texture>((resolve, reject) => new THREE.TextureLoader().load(src, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8
        textureCacheRef.current.set(src, texture)
        evictIfNeeded()
        resolve(texture)
      }, undefined, reject))
    }
    let cancelled = false
    Promise.all([load(activeCard.front), load(activeCard.back)]).then(([front, back]) => {
      if (cancelled) { front.dispose(); back.dispose(); return }
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
        if (next.kind !== 'model' && previous.kind !== 'model') {
          void Promise.all([load(next.front), load(next.back), load(previous.front), load(previous.back)])
        }
      }
    })
    return () => { cancelled = true }
  }, [activeCard])

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
      .canvas-loading-hint { position:fixed; inset:0; z-index:30; display:grid; place-items:center; padding:24px; color:var(--ink); font:900 13px var(--font-body); text-align:center; pointer-events:none; }
      .deck-row,.card-row { display:flex; gap:8px; overflow-x:auto; padding:2px 2px 8px; scrollbar-width:none; } .deck-row::-webkit-scrollbar,.card-row::-webkit-scrollbar { display:none; }
      .deck-chip,.card-chip { border:1px solid rgba(22,77,120,.12); border-radius:999px; background:#fff; color:var(--ink); font:800 14px var(--font-body); white-space:nowrap; cursor:pointer; transition:transform 160ms ease,background 160ms ease; } .deck-chip:active,.card-chip:active,.action-row button:active { transform:scale(.97); } .deck-chip { min-height:38px; padding:8px 12px; } .card-chip { min-height:32px; padding:6px 10px; font-size:12px; } .deck-chip.active { border-color:transparent; color:#fff; background:var(--accent); } .card-chip.active { border-color:var(--accent); color:var(--accent); }
      .action-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px; } .action-row button { min-height:48px; border:0; border-radius:12px; color:#fff; background:var(--accent); box-shadow:0 9px 18px rgba(22,77,120,.14); font:900 14px var(--font-body); cursor:pointer; } .report-link { display:block; margin:12px 0 0; color:var(--muted); text-align:center; font-size:12px; font-weight:800; text-decoration:none; }
      .showcase-loading { position:fixed; inset:0; z-index:40; display:grid; place-items:center; padding:24px; color:var(--ink); background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.96) 0,rgba(255,255,255,.72) 42%,rgba(255,239,247,.94) 100%); font-size:20px; font-weight:900; text-align:center; pointer-events:none; }
      .panel-backdrop { position:absolute; inset:0; z-index:3; background:transparent; }
      .bottom-bar { position:absolute; left:50%; bottom:calc(16px + env(safe-area-inset-bottom)); transform:translateX(-50%); z-index:4; display:flex; align-items:center; gap:10px; }
      .bottom-trigger-wrap { position:relative; }
      .bottom-trigger { min-height:42px; padding:0 16px; border:1px solid rgba(255,255,255,.82); border-radius:999px; background:rgba(255,255,255,.82); backdrop-filter:blur(10px); color:var(--ink); box-shadow:0 12px 26px rgba(22,77,120,.16); font:900 12px var(--font-body); cursor:pointer; }
      .bottom-counter { min-width:34px; padding:7px 10px; border-radius:999px; background:rgba(255,255,255,.72); backdrop-filter:blur(8px); color:var(--ink); text-align:center; font:900 12px var(--font-body); box-shadow:0 8px 18px rgba(22,77,120,.1); }
      .bottom-panel { position:absolute; bottom:calc(100% + 10px); left:50%; transform:translateX(-50%); width:min(230px,68vw); max-height:56dvh; overflow:auto; padding:10px; border:1px solid rgba(255,255,255,.75); border-radius:20px; background:rgba(255,255,255,.94); box-shadow:0 16px 34px rgba(22,77,120,.2); scrollbar-width:none; }
      .bottom-panel::-webkit-scrollbar { display:none; }
      .bottom-panel .deck-row,.bottom-panel .card-row { display:grid; grid-template-columns:1fr; max-height:38dvh; overflow:auto; padding:0; }
      .bottom-panel .deck-chip,.bottom-panel .card-chip { min-height:36px; padding:6px 10px; overflow:hidden; text-overflow:ellipsis; }
      .bottom-panel .action-row { grid-template-columns:1fr 1fr; margin-top:8px; }
      .bottom-panel .report-link { display:block; margin-top:10px; }
      @media (max-width:360px) { .bottom-panel { width:min(190px,66vw); } .showcase-title span { font-size:10px; } }
    `}</style>
    <div className="showcase-panel" ref={hostRef}>
      <div className="showcase-top">
        <a className="circle-link" href="/about" aria-label="Quay lại landing"><span>←</span></a>
        <div className="showcase-title"><b>{activeDeckLabel}</b><span>{activeCard ? `${activeCard.title} · ${activeDeck?.count ?? 0} ${isCharacterDeck ? 'nhân vật' : 'thẻ mẫu'}` : 'Đang tải bộ thẻ'}</span></div>
        <button className="circle-link" type="button" onClick={() => setAutoRotate((value) => !value)} aria-label="Bật tắt xoay tự động"><span>{autoRotate ? 'Dừng' : 'Tự động'}</span></button>
      </div>
      <div className="showcase-canvas">
        <canvas ref={canvasRef} data-testid="card-showcase-canvas" />
        {cardLoading && <div className="canvas-loading-hint">{isCharacterDeck ? 'Đang tải nhân vật...' : 'Đang tải thẻ...'}</div>}
      </div>
      {loading && <div className="showcase-loading">Đang mở bộ thẻ...</div>}
      {(leftOpen || rightOpen) && <div className="panel-backdrop" onClick={() => { setLeftOpen(false); setRightOpen(false) }} />}
      <div className="side-nav" aria-label="Chuyển card">
        <button className="side-nav-button" type="button" onClick={() => moveCard(-1)} aria-label="Card trước">‹</button>
        <button className="side-nav-button" type="button" onClick={() => moveCard(1)} aria-label="Card kế tiếp">›</button>
      </div>
      <div className="bottom-bar">
        <div className="bottom-trigger-wrap">
          <button className="bottom-trigger" type="button" onClick={() => { setLeftOpen((value) => !value); setRightOpen(false) }} aria-expanded={leftOpen}>Bộ thẻ</button>
          {leftOpen && <div className="bottom-panel"><div className="deck-row" aria-label="Chọn loại thẻ">{decks.map((deck) => <button className={`deck-chip ${deck.id === activeDeck?.id ? 'active' : ''}`} key={deck.id} type="button" onClick={() => { setDeckId(deck.id); setLeftOpen(false) }}>{deckLabels[deck.id] ?? deck.label}</button>)}</div></div>}
        </div>
        <span className="bottom-counter">{activeDeck ? `${cardIndex + 1}/${activeDeck.cards.length}` : '0/0'}</span>
        <div className="bottom-trigger-wrap">
          <button className="bottom-trigger" type="button" onClick={() => { setRightOpen((value) => !value); setLeftOpen(false) }} aria-expanded={rightOpen}>Điều khiển</button>
          {rightOpen && <div className="bottom-panel"><div className="card-row" aria-label="Chọn lá thẻ">{activeDeck?.cards.map((card, index) => <button className={`card-chip ${index === cardIndex ? 'active' : ''}`} key={`${activeDeck.id}-${card.front}`} type="button" onClick={() => { resetView(true); cardDirectionRef.current = index >= cardIndex ? 1 : -1; setCardIndex(index); setRightOpen(false) }}>{card.title}</button>)}</div><div className="action-row"><button type="button" onClick={() => setFlipSignal((value) => value + 1)}>Lật 180°</button><button type="button" onClick={() => resetView()}>Về vị trí cũ</button></div>{!isCharacterDeck && <a className="report-link" href="/report">Đọc báo cáo →</a>}</div>}
        </div>
      </div>
    </div>
  </main>
}
