import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { createShowcaseLoaders } from '../../features/showcase/assetLoaders'

const meta = { one: { label: 'One', aspect: 1, points: [[0, 0], [1, 0], [1, 1]] as [number, number][] } }
function fixture() {
  const dependencies = {
    model: vi.fn<(url: string) => Promise<THREE.Group>>(async () => new THREE.Group()),
    texture: vi.fn<(url: string) => Promise<THREE.Texture>>(async () => new THREE.Texture()),
    outlines: vi.fn<(signal: AbortSignal) => Promise<typeof meta>>(async () => meta),
  }
  const buildSticker = vi.fn((_points: [number, number][], _aspect: number, texture: THREE.Texture) => {
    const group = new THREE.Group()
    group.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map: texture })))
    return group
  })
  const owner = createShowcaseLoaders({ modelLimit: 8, stickerLimit: 19, buildSticker }, dependencies)
  return { owner, dependencies, buildSticker }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

describe('showcase generation asset loaders', () => {
  it('deduplicates model loads across cancelled selection leases and preserves normalization', async () => {
    const { owner, dependencies } = fixture()
    const scene = new THREE.Group()
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6), new THREE.MeshBasicMaterial()))
    scene.position.set(2, 3, 4)
    const pending = deferred<THREE.Group>()
    dependencies.model.mockReturnValue(pending.promise)
    const release = owner.models.retain(['/models/original.glb'])
    const a = owner.loadModel('/models/original.glb'), b = owner.loadModel('/models/original.glb')
    release(); pending.resolve(scene)
    const loaded = await a
    expect(await b).toBe(loaded); expect(dependencies.model).toHaveBeenCalledOnce()
    expect(loaded.distance).toBeCloseTo(21.6)
    expect(scene.position.toArray()).toEqual([0, 0, 0])
    expect(await owner.loadModel('/models/original.glb')).toBe(loaded)
    owner.close()
  })
  it('shares outlines and pending sticker build, preserves texture settings and exact URLs', async () => {
    const { owner, dependencies, buildSticker } = fixture()
    const a = owner.loadSticker('one', '/stickers/original.webp')
    const b = owner.loadSticker('one', '/stickers/original.webp')
    expect(await a).toBe(await b)
    await owner.loadSticker('one', '/stickers/different.webp')
    expect(dependencies.outlines).toHaveBeenCalledOnce()
    expect(dependencies.texture.mock.calls).toEqual([['/stickers/original.webp'], ['/stickers/different.webp']])
    expect(buildSticker).toHaveBeenCalledTimes(2)
    expect(buildSticker.mock.calls[0][2].colorSpace).toBe(THREE.SRGBColorSpace)
    expect(buildSticker.mock.calls[0][2].anisotropy).toBe(8)
    owner.close()
  })
  it('aborts shared outline fetch only on renderer close and starts no subsequent texture', async () => {
    const { owner, dependencies } = fixture()
    const pending = deferred<typeof meta>()
    dependencies.outlines.mockReturnValue(pending.promise)
    const task = owner.loadSticker('one', '/stickers/original.webp')
    await vi.waitFor(() => expect(dependencies.outlines).toHaveBeenCalledOnce())
    const signal = dependencies.outlines.mock.calls[0][0]
    expect(signal.aborted).toBe(false)
    owner.close(); owner.close(); expect(signal.aborted).toBe(true)
    pending.resolve(meta)
    await expect(task).rejects.toThrow('Renderer disposed')
    expect(dependencies.texture).not.toHaveBeenCalled()
    await expect(owner.loadModel('new')).rejects.toThrow('Renderer disposed')
  })
  it('disposes late model completion once without repopulating closed cache', async () => {
    const { owner, dependencies } = fixture(), pending = deferred<THREE.Group>()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    const scene = new THREE.Group(); scene.add(mesh)
    const disposed = vi.spyOn(mesh.geometry, 'dispose')
    dependencies.model.mockReturnValue(pending.promise)
    const task = owner.loadModel('late')
    await Promise.resolve(); owner.close(); pending.resolve(scene)
    await expect(task).rejects.toThrow('Renderer disposed')
    expect(disposed).toHaveBeenCalledOnce(); expect(owner.models.cache.size).toBe(0)
  })
  it('disposes late sticker texture once and never caches after teardown', async () => {
    const { owner, dependencies, buildSticker } = fixture(), pending = deferred<THREE.Texture>()
    const texture = new THREE.Texture(), disposed = vi.spyOn(texture, 'dispose')
    dependencies.texture.mockReturnValue(pending.promise)
    const task = owner.loadSticker('one', 'late')
    await vi.waitFor(() => expect(dependencies.texture).toHaveBeenCalledOnce())
    owner.close(); pending.resolve(texture)
    await expect(task).rejects.toThrow('Renderer disposed')
    expect(disposed).toHaveBeenCalledOnce(); expect(owner.stickers.cache.size).toBe(0)
    expect(buildSticker).not.toHaveBeenCalled()
  })
  it('does not start queued sticker work after close', async () => {
    const { owner, dependencies, buildSticker } = fixture()
    const task = owner.loadSticker('one', 'queued')
    owner.close(); owner.close()
    await expect(task).rejects.toThrow('Renderer disposed')
    expect(dependencies.outlines).not.toHaveBeenCalled()
    expect(dependencies.texture).not.toHaveBeenCalled()
    expect(buildSticker).not.toHaveBeenCalled()
  })
  it('rejects a closed generation without disrupting the next generation', async () => {
    const old = fixture(), next = fixture(), pending = deferred<THREE.Texture>()
    const texture = new THREE.Texture(), disposed = vi.spyOn(texture, 'dispose')
    old.dependencies.texture.mockReturnValue(pending.promise)
    const late = old.owner.loadSticker('one', 'same-url')
    await vi.waitFor(() => expect(old.dependencies.texture).toHaveBeenCalledOnce())
    old.owner.close()
    const current = await next.owner.loadSticker('one', 'same-url')
    pending.resolve(texture)
    await expect(late).rejects.toThrow('Renderer disposed')
    expect(disposed).toHaveBeenCalledOnce()
    expect(old.buildSticker).not.toHaveBeenCalled()
    expect(old.owner.stickers.cache.size).toBe(0)
    expect(next.buildSticker).toHaveBeenCalledOnce()
    expect(next.owner.stickers.cache.get(next.owner.stickerKey('one', 'same-url'))).toBe(current)
    expect(await next.owner.loadSticker('one', 'same-url')).toBe(current)
    next.owner.close()
  })
  it('retries failed outlines on explicit reselection without poisoning shared pending state', async () => {
    const { owner, dependencies } = fixture()
    dependencies.outlines.mockRejectedValueOnce(new Error('Offline'))
    await expect(owner.loadSticker('one', 'original')).rejects.toThrow('Offline')
    await owner.loadSticker('one', 'original')
    expect(dependencies.outlines).toHaveBeenCalledTimes(2)
    owner.close()
  })
  it('rejects missing outlines before requesting a texture and cleans build failure', async () => {
    const { owner, dependencies, buildSticker } = fixture()
    await expect(owner.loadSticker('missing', 'original')).rejects.toThrow('Sticker outline unavailable')
    expect(dependencies.texture).not.toHaveBeenCalled()
    const texture = new THREE.Texture(), disposed = vi.spyOn(texture, 'dispose')
    dependencies.texture.mockResolvedValue(texture)
    buildSticker.mockImplementationOnce(() => { throw new Error('Geometry failed') })
    await expect(owner.loadSticker('one', 'original')).rejects.toThrow('Geometry failed')
    expect(disposed).toHaveBeenCalledOnce(); expect(owner.stickers.cache.size).toBe(0)
    owner.close()
  })
  it('bounds model cache across100logical switches while protecting an attached model', async () => {
    const { owner, dependencies } = fixture()
    const first = await owner.loadModel('first'), active = new THREE.Group()
    active.add(first.scene)
    for (let index = 0; index < 100; index++) await owner.loadModel(`model-${index}`)
    expect(owner.models.cache.size).toBe(8)
    expect(owner.models.cache.get('first')).toBe(first)
    expect(dependencies.model).toHaveBeenCalledTimes(101)
    owner.close()
  })
})
