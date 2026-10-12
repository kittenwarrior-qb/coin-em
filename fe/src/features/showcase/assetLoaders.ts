import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { ResourceOwner, disposeObjectResources } from './resourceOwner'

export type StickerOutline = { label: string; aspect: number; points: [number, number][] }
export type LoadedModel = { scene: THREE.Object3D; distance: number }
type LoaderDependencies = {
  model: (url: string) => Promise<THREE.Object3D>
  texture: (url: string) => Promise<THREE.Texture>
  outlines: (signal: AbortSignal) => Promise<Record<string, StickerOutline>>
}
const defaultDependencies: LoaderDependencies = {
  model: url => new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(url, gltf => resolve(gltf.scene), undefined, reject)
  }),
  texture: url => new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject)
  }),
  outlines: async signal => {
    const response = await fetch('/stickers/outlines.json', { signal })
    if (!response.ok) throw new Error('Sticker outlines unavailable')
    return response.json() as Promise<Record<string, StickerOutline>>
  },
}

/** One generation owns every load. Selection cleanup releases a lease, not the asset. */
export function createShowcaseLoaders(options: {
  modelLimit: number
  stickerLimit: number
  buildSticker: (points: [number, number][], aspect: number, texture: THREE.Texture) => THREE.Group
}, dependencies: LoaderDependencies = defaultDependencies) {
  const controller = new AbortController()
  let outlineTask: Promise<Record<string, StickerOutline>> | null = null
  let closed = false
  const models = new ResourceOwner<LoadedModel>(value => disposeObjectResources([value.scene]), options.modelLimit,
    value => value.scene.parent !== null)
  const stickers = new ResourceOwner<THREE.Group>(value => disposeObjectResources([value]), options.stickerLimit,
    value => value.parent !== null)
  const outlines = () => {
    if (!outlineTask) {
      const task = Promise.resolve().then(() => {
        if (closed) throw new Error('Renderer disposed')
        return dependencies.outlines(controller.signal)
      }).catch(error => {
        if (outlineTask === task) outlineTask = null
        throw error
      })
      outlineTask = task
    }
    return outlineTask
  }
  return {
    models,
    stickers,
    loadModel(url: string) {
      return models.load(url, async () => {
        const scene = await dependencies.model(url)
        try {
          const box = new THREE.Box3().setFromObject(scene)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z) || 1
          scene.position.sub(center)
          return { scene, distance: maxDim * 3.6 }
        } catch (error) { disposeObjectResources([scene]); throw error }
      })
    },
    loadSticker(slug: string, url: string) {
      // URL is part of identity: never silently alias different artwork to one slug.
      return stickers.load(`${slug}\0${url}`, async () => {
        const data = await outlines()
        if (closed) throw new Error('Renderer disposed')
        const meta = data[slug]
        if (!meta) throw new Error('Sticker outline unavailable')
        const texture = await dependencies.texture(url)
        // The renderer may close while the non-abortable texture request is pending.
        // Dispose its result before allocating geometry/materials for a dead generation.
        if (closed) { texture.dispose(); throw new Error('Renderer disposed') }
        texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8
        try { return options.buildSticker(meta.points, meta.aspect, texture) }
        catch (error) { texture.dispose(); throw error }
      })
    },
    stickerKey: (slug: string, url: string) => `${slug}\0${url}`,
    close() {
      if (closed) return
      closed = true; controller.abort(); outlineTask = null
      models.close(); stickers.close()
    },
  }
}
