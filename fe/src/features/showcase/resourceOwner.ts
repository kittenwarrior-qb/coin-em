import * as THREE from 'three'

/** One renderer owns cached resources; selection cancellation only releases leases. */
export class ResourceOwner<T> {
  readonly cache = new Map<string, T>()
  private pending = new Map<string, Promise<T>>()
  private pins = new Map<string, number>()
  private closed = false
  constructor(private dispose: (value: T) => void, private limit: number, private inUse: (value: T) => boolean = () => false) {}

  retain(keys: string[]) {
    for (const key of keys) this.pins.set(key, (this.pins.get(key) ?? 0) + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      for (const key of keys) {
        const count = (this.pins.get(key) ?? 1) - 1
        if (count > 0) this.pins.set(key, count); else this.pins.delete(key)
      }
      this.trim()
    }
  }
  load(key: string, loader: () => Promise<T>): Promise<T> {
    if (this.closed) return Promise.reject(new Error('Renderer disposed'))
    const cached = this.cache.get(key)
    if (cached !== undefined) { this.cache.delete(key); this.cache.set(key, cached); return Promise.resolve(cached) }
    const pending = this.pending.get(key)
    if (pending) return pending
    const task = Promise.resolve().then(() => {
      if (this.closed) throw new Error('Renderer disposed')
      return loader()
    }).then(value => {
      if (this.closed) { this.dispose(value); throw new Error('Renderer disposed') }
      this.cache.set(key, value); this.trim(); return value
    }).finally(() => { if (this.pending.get(key) === task) this.pending.delete(key) })
    this.pending.set(key, task)
    return task
  }
  trim() {
    if (this.closed) return
    for (const [key, value] of this.cache) {
      if (this.cache.size <= this.limit) break
      if (this.pins.has(key) || this.inUse(value)) continue
      this.cache.delete(key); this.dispose(value)
    }
  }
  close() {
    if (this.closed) return
    this.closed = true
    for (const value of new Set(this.cache.values())) this.dispose(value)
    this.cache.clear(); this.pins.clear()
    // Late pending values are disposed by their completion, never added to this cache.
  }
}

/** Includes material arrays and every direct GLTF texture slot; shared objects once. */
export function disposeObjectResources(roots: Iterable<THREE.Object3D>) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  for (const root of roots) root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    geometries.add(node.geometry)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  for (const texture of textures) texture.dispose()
  for (const material of materials) material.dispose()
  for (const geometry of geometries) geometry.dispose()
}
