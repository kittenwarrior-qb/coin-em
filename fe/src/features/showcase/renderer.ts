import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { ResourceOwner } from './resourceOwner'
import { createShowcaseLoaders } from './assetLoaders'
import { attachShowcaseInteraction } from './interactionController'

type Ref<T> = { current: T }
/** Compatibility bridge: React owns selection/preferences, this module owns GPU lifecycle. */
export type ShowcaseRendererBindings = {
  rendererGenerationRef: Ref<{ disposed: boolean }>
  materialsInUseRef: Ref<THREE.MeshBasicMaterial[]>
  textureOwnerRef: Ref<ResourceOwner<THREE.Texture> | null>
  assetLoadersRef: Ref<ReturnType<typeof createShowcaseLoaders> | null>
  regenerateEnvironmentRef: Ref<(() => void) | null>
  groupRef: Ref<THREE.Group | null>
  incomingGroupRef: Ref<THREE.Group | null>
  characterGroupRef: Ref<THREE.Group | null>
  stickerGroupRef: Ref<THREE.Group | null>
  isCharacterModeRef: Ref<boolean>
  isStickerModeRef: Ref<boolean>
  flipTargetRef: Ref<number>
  flipPulseRef: Ref<{ startYaw: number; targetYaw: number } | null>
  triggerFlipRef: Ref<(() => void) | null>
  frontMaterialRef: Ref<THREE.MeshBasicMaterial | null>
  backMaterialRef: Ref<THREE.MeshBasicMaterial | null>
  texturesRef: Ref<THREE.Texture[]>
  slideControllerRef: Ref<{ setInitial: (front: THREE.Texture, back: THREE.Texture) => void; transition: (front: THREE.Texture, back: THREE.Texture, direction: number) => void } | null>
  dragRef: Ref<{ active: boolean; lastX: number; lastY: number }>
  rotationRef: Ref<number>
  verticalRotationRef: Ref<number>
  zoomRef: Ref<number>
  autoRotateRef: Ref<boolean>
  characterDistanceRef: Ref<number>
  characterIntroRef: Ref<number>
  stickerIntroRef: Ref<number>
}

const CARD_HEIGHT = 2.38
const CARD_WIDTH = CARD_HEIGHT * (491 / 760)
const CARD_DEPTH = 0.018
// Match the rounded corners in the supplied card artwork so no rectangular
// texture edge peeks out beyond the 3D card silhouette.
const CARD_RADIUS = 0.105

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


export function createShowcaseRenderer(options: {
  host: HTMLElement
  canvas: HTMLCanvasElement
  modelLimit: number
  stickerLimit: number
  buildSticker: (points: [number, number][], aspect: number, texture: THREE.Texture) => THREE.Group
  onUnavailable: (value: boolean) => void
  onLoading: (value: boolean) => void
  bindings: ShowcaseRendererBindings
}) {
  const { host, canvas, modelLimit, stickerLimit, buildSticker } = options
  const { rendererGenerationRef, materialsInUseRef, textureOwnerRef, assetLoadersRef, regenerateEnvironmentRef, groupRef, incomingGroupRef, characterGroupRef, stickerGroupRef, isCharacterModeRef, isStickerModeRef, flipTargetRef, flipPulseRef, triggerFlipRef, frontMaterialRef, backMaterialRef, texturesRef, slideControllerRef, dragRef, rotationRef, verticalRotationRef, zoomRef, autoRotateRef, characterDistanceRef, characterIntroRef, stickerIntroRef } = options.bindings
  const setGraphicsUnavailable = options.onUnavailable, setCardLoading = options.onLoading
  let renderer: THREE.WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }) }
  catch { setGraphicsUnavailable(true); setCardLoading(false); return }
  const generation = { disposed: false }; rendererGenerationRef.current = generation
  const textureOwner = new ResourceOwner<THREE.Texture>(texture => texture.dispose(), 96,
    texture => materialsInUseRef.current.some(material => material.map === texture))
  textureOwnerRef.current = textureOwner
  const assetLoaders = createShowcaseLoaders({ modelLimit, stickerLimit, buildSticker })
  assetLoadersRef.current = assetLoaders
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.62
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  camera.position.set(0, 0.08, 6.75)
  let pmrem: THREE.PMREMGenerator
  try { pmrem = new THREE.PMREMGenerator(renderer) }
  catch {
    generation.disposed = true; textureOwner.close(); textureOwnerRef.current = null; assetLoaders.close(); assetLoadersRef.current = null; renderer.dispose()
    setGraphicsUnavailable(true); setCardLoading(false); return
  }
  // A soft, heavily-blurred environment reads as gentle studio light on the
  // glossy character materials instead of harsh, blown-out highlights.
  let environmentTarget: THREE.WebGLRenderTarget | null = null
  const applyEnvironment = () => {
    const environment = new RoomEnvironment()
    try {
      const next = pmrem.fromScene(environment, 2.2)
      const previous = environmentTarget
      environmentTarget = next; scene.environment = next.texture
      previous?.dispose()
    } finally { environment.dispose() }
  }
  try { applyEnvironment() }
  catch {
    generation.disposed = true; textureOwner.close(); textureOwnerRef.current = null; assetLoaders.close(); assetLoadersRef.current = null; pmrem.dispose(); renderer.dispose()
    setGraphicsUnavailable(true); setCardLoading(false); return
  }
  regenerateEnvironmentRef.current = applyEnvironment
  const group = new THREE.Group(); const incomingGroup = new THREE.Group(); scene.add(group, incomingGroup); incomingGroup.visible = false
  const characterGroup = new THREE.Group(); characterGroup.visible = false; scene.add(characterGroup)
  const stickerGroup = new THREE.Group(); stickerGroup.visible = false; scene.add(stickerGroup)
  groupRef.current = group; incomingGroupRef.current = incomingGroup; characterGroupRef.current = characterGroup; stickerGroupRef.current = stickerGroup
  const triggerFlip = () => {
    const activeGroup = isCharacterModeRef.current ? characterGroup : isStickerModeRef.current ? stickerGroup : group
    flipTargetRef.current += Math.PI
    flipPulseRef.current = { startYaw: activeGroup.rotation.y, targetYaw: activeGroup.rotation.y + Math.PI }
  }
  triggerFlipRef.current = triggerFlip
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
      // Cached textures belong to the renderer, not an interrupted transition.
      incomingFrontMaterial.map = frontMap; incomingFrontMaterial.needsUpdate = true
      incomingBackMaterial.map = backMap; incomingBackMaterial.needsUpdate = true
      incomingGroup.position.x = direction * slideDistance; incomingGroup.visible = true
      incomingGroup.scale.setScalar(0.9)
      slide = { direction, front: frontMap, back: backMap, oldX: 0, incomingX: direction * slideDistance, oldScale: 1, incomingScale: 0.9 }
    },
  }
  const onContextLost = (event: Event) => { event.preventDefault(); setGraphicsUnavailable(true); setCardLoading(false) }
  const onContextRestored = () => {
    completeSlide()
    try { applyEnvironment() } catch { setGraphicsUnavailable(true); return }
    setGraphicsUnavailable(false)
    ;[frontMaterial, backMaterial, incomingFrontMaterial, incomingBackMaterial].forEach((material) => {
      if (material.map) material.map.needsUpdate = true
      material.needsUpdate = true
    })
    characterGroup.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        const materials = (Array.isArray(node.material) ? node.material : [node.material]) as THREE.MeshStandardMaterial[]
        for (const material of materials) {
          material.needsUpdate = true
          if (material.map) material.map.needsUpdate = true
        }
      }
    })
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)
  canvas.addEventListener('webglcontextrestored', onContextRestored, false)
  const resize = () => { const rect = host.getBoundingClientRect(); renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)), false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix() }
  const detachInteraction = attachShowcaseInteraction({ canvas, drag: dragRef, yaw: rotationRef, pitch: verticalRotationRef, zoom: zoomRef, flip: triggerFlip })
  window.addEventListener('resize', resize); resize()
  let frame = 0
  const animate = () => {
    if (generation.disposed) return
    frame = requestAnimationFrame(animate)
    if (renderer.getContext().isContextLost()) return
    const now = performance.now()
    const idleYaw = Math.sin(now / 4200) * 0.018
    const idleTilt = Math.sin(now / 2800) * 0.009
    if (!dragRef.current.active && autoRotateRef.current) rotationRef.current += 0.0025
    const baseYaw = rotationRef.current + flipTargetRef.current + idleYaw
    const basePitch = verticalRotationRef.current + Math.sin(now / 3200) * 0.014
    const baseRoll = idleTilt
    const floatY = Math.sin(now / 1900) * 0.045

    // A tap-to-flip (or the Lật button) pulses the scale up and back down —
    // driven by how far the rotation itself has actually turned rather than
    // a guessed fixed duration, so full size lands exactly when the 180°
    // turn visually finishes (works regardless of frame rate or auto-rotate
    // speed changes mid-flip).
    let flipPulse = 1
    if (flipPulseRef.current) {
      const activeGroup = isCharacterModeRef.current ? characterGroup : isStickerModeRef.current ? stickerGroup : group
      const { startYaw, targetYaw } = flipPulseRef.current
      const total = targetYaw - startYaw
      const remaining = targetYaw - activeGroup.rotation.y
      const progress = total !== 0 ? Math.min(1, Math.max(0, 1 - Math.abs(remaining / total))) : 1
      if (progress >= 0.99) flipPulseRef.current = null
      else flipPulse = 1 + Math.sin(progress * Math.PI) * 0.1
    }

    if (isCharacterModeRef.current) {
      camera.position.set(0, 0.05, characterDistanceRef.current / zoomRef.current)
      camera.lookAt(0, 0, 0)
      characterGroup.rotation.y += (baseYaw - characterGroup.rotation.y) * 0.12
      characterGroup.rotation.x += (basePitch - characterGroup.rotation.x) * 0.12
      characterGroup.rotation.z += (baseRoll - characterGroup.rotation.z) * 0.1
      characterGroup.position.y += (floatY - characterGroup.position.y) * 0.06
      characterIntroRef.current += (1 - characterIntroRef.current) * 0.2
      characterGroup.scale.setScalar((0.9 + characterIntroRef.current * 0.1) * flipPulse)
    } else {
      camera.position.set(0, 0.08, 6.75 / zoomRef.current)
      camera.lookAt(0, 0, 0)
    }

    if (isStickerModeRef.current) {
      stickerGroup.rotation.y += (baseYaw - stickerGroup.rotation.y) * 0.12
      stickerGroup.rotation.x += (basePitch - stickerGroup.rotation.x) * 0.12
      stickerGroup.rotation.z += (baseRoll - stickerGroup.rotation.z) * 0.1
      stickerGroup.position.y += (floatY - stickerGroup.position.y) * 0.06
      stickerIntroRef.current += (1 - stickerIntroRef.current) * 0.2
      stickerGroup.scale.setScalar((0.9 + stickerIntroRef.current * 0.1) * flipPulse)
    }

    group.rotation.y += (baseYaw - group.rotation.y) * 0.12
    group.rotation.x += (basePitch - group.rotation.x) * 0.12
    group.rotation.z += (baseRoll - group.rotation.z) * 0.1
    group.scale.setScalar(flipPulse)
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
    if (generation.disposed) return
    generation.disposed = true
    slideControllerRef.current = null; regenerateEnvironmentRef.current = null; triggerFlipRef.current = null; cancelAnimationFrame(frame)
    detachInteraction(); window.removeEventListener('resize', resize)
    canvas.removeEventListener('webglcontextlost', onContextLost); canvas.removeEventListener('webglcontextrestored', onContextRestored)
    frontMaterial.dispose(); backMaterial.dispose(); sideMaterial.dispose(); incomingFrontMaterial.dispose(); incomingBackMaterial.dispose(); incomingSideMaterial.dispose(); faceGeometry.dispose(); backGeometry.dispose(); sideGeometry.dispose()
    textureOwner.close(); textureOwnerRef.current = null; texturesRef.current = []
    assetLoaders.close(); assetLoadersRef.current = null
    environmentTarget?.dispose(); scene.environment = null
    pmrem.dispose()
    renderer.dispose(); frontMaterialRef.current = null; backMaterialRef.current = null; materialsInUseRef.current = []
    groupRef.current = null; incomingGroupRef.current = null; characterGroupRef.current = null; stickerGroupRef.current = null
  }
}
