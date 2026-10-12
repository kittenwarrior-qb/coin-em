import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { ResourceOwner, disposeObjectResources } from '../../features/showcase/resourceOwner'

describe('renderer-owned resources', () => {
  it('does not start a queued loader after its renderer has closed', async () => {
    const owner = new ResourceOwner<number>(vi.fn(), 96), loader = vi.fn(async () => 1)
    const task = owner.load('queued', loader); owner.close()
    await expect(task).rejects.toThrow('Renderer disposed')
    expect(loader).not.toHaveBeenCalled()
  })
  it('deduplicates concurrent loads, retains selection cancellation and closes once', async () => {
    const texture = new THREE.Texture(), dispose = vi.spyOn(texture, 'dispose')
    const owner = new ResourceOwner<THREE.Texture>(value => value.dispose(), 96)
    let resolve!: (value: THREE.Texture) => void
    const loader = vi.fn(() => new Promise<THREE.Texture>(done => { resolve = done }))
    const release = owner.retain(['front'])
    const a = owner.load('front', loader), b = owner.load('front', loader)
    await Promise.resolve(); release(); resolve(texture)
    expect(await a).toBe(texture); expect(await b).toBe(texture)
    expect(loader).toHaveBeenCalledOnce(); expect(dispose).not.toHaveBeenCalled()
    expect(await owner.load('front', loader)).toBe(texture)
    owner.close(); owner.close(); expect(dispose).toHaveBeenCalledOnce()
  })
  it('late completion after unmount is disposed and cannot refill closed cache', async () => {
    const texture = new THREE.Texture(), dispose = vi.spyOn(texture, 'dispose')
    const owner = new ResourceOwner<THREE.Texture>(value => value.dispose(), 96)
    let resolve!: (value: THREE.Texture) => void
    const task = owner.load('late', () => new Promise(done => { resolve = done }))
    await Promise.resolve(); owner.close(); resolve(texture)
    await expect(task).rejects.toThrow('Renderer disposed')
    expect(dispose).toHaveBeenCalledOnce(); expect(owner.cache.size).toBe(0)
    await expect(owner.load('new', async () => texture)).rejects.toThrow('Renderer disposed')
  })
  it('a rejected load releases dedup state for an intentional new selection', async () => {
    const owner = new ResourceOwner<number>(vi.fn(), 96)
    await expect(owner.load('failed', async () => { throw new Error('CDN unavailable') })).rejects.toThrow('CDN unavailable')
    expect(await owner.load('failed', async () => 1)).toBe(1)
  })
  it('preserves the96 cap across100 loads without disposing live material maps', async () => {
    const disposed = vi.fn(), inUse = new Set([0, 1]), owner = new ResourceOwner<number>(disposed, 96, value => inUse.has(value))
    for (let index = 0; index < 100; index++) await owner.load(`${index}`, async () => index)
    expect(owner.cache.size).toBe(96); expect(owner.cache.get('0')).toBe(0); expect(owner.cache.get('1')).toBe(1)
    expect(disposed).toHaveBeenCalledTimes(4); expect(disposed).not.toHaveBeenCalledWith(0)
    owner.close()
  })
  it('pins pending selection resources across eviction and releases idempotently', async () => {
    const dispose = vi.fn(), owner = new ResourceOwner<number>(dispose, 1)
    const release = owner.retain(['front', 'back'])
    await owner.load('front', async () => 1); await owner.load('back', async () => 2)
    expect(dispose).not.toHaveBeenCalled(); expect(owner.cache.size).toBe(2)
    release(); release(); expect(owner.cache.size).toBe(1); expect(dispose).toHaveBeenCalledOnce()
    owner.close()
  })
  it('disposes shared geometry/material-array/GLTF texture slots once across roots', () => {
    const geometry = new THREE.BoxGeometry(), texture = new THREE.Texture()
    const a = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, metalnessMap: texture })
    const b = new THREE.MeshStandardMaterial({ normalMap: texture, alphaMap: texture })
    const calls = [geometry, texture, a, b].map(resource => vi.spyOn(resource, 'dispose'))
    const root = new THREE.Group(); root.add(new THREE.Mesh(geometry, [a, b]), new THREE.Mesh(geometry, a))
    disposeObjectResources([root, root.children[0]])
    for (const call of calls) expect(call).toHaveBeenCalledOnce()
  })
})
