import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createShowcaseRenderer, type ShowcaseRendererBindings } from '../../features/showcase/renderer'

const mocks = vi.hoisted(() => ({ renderer: vi.fn(), pmrem: vi.fn() }))
vi.mock('three', async importOriginal => ({ ...await importOriginal<typeof import('three')>(),
  WebGLRenderer: mocks.renderer, PMREMGenerator: mocks.pmrem }))

function ref<T>(current: T) { return { current } }
function fixture() {
  const bindings: ShowcaseRendererBindings = {
    rendererGenerationRef: ref({ disposed: true }), materialsInUseRef: ref([]), textureOwnerRef: ref(null), assetLoadersRef: ref(null),
    regenerateEnvironmentRef: ref(null), groupRef: ref(null), incomingGroupRef: ref(null), characterGroupRef: ref(null), stickerGroupRef: ref(null),
    isCharacterModeRef: ref(false), isStickerModeRef: ref(false), flipTargetRef: ref(0), flipPulseRef: ref(null), triggerFlipRef: ref(null),
    frontMaterialRef: ref(null), backMaterialRef: ref(null), texturesRef: ref([]), slideControllerRef: ref(null),
    dragRef: ref({ active: false, lastX: 0, lastY: 0 }), rotationRef: ref(0), verticalRotationRef: ref(0), zoomRef: ref(0.92),
    autoRotateRef: ref(false), characterDistanceRef: ref(6.75), characterIntroRef: ref(1), stickerIntroRef: ref(1),
  }
  const host = document.createElement('div'), canvas = document.createElement('canvas')
  host.getBoundingClientRect = () => ({ width: 430, height: 844 }) as DOMRect
  const onUnavailable = vi.fn(), onLoading = vi.fn()
  const create = () => createShowcaseRenderer({ host, canvas, bindings, modelLimit: 8, stickerLimit: 19,
    buildSticker: () => new THREE.Group(), onUnavailable, onLoading })
  return { bindings, canvas, create, onUnavailable, onLoading }
}
describe('showcase renderer lifecycle boundary', () => {
  let renderer: { setPixelRatio: ReturnType<typeof vi.fn>; setSize: ReturnType<typeof vi.fn>; render: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn>; getContext: () => { isContextLost: () => boolean } }
  let pmrem: { fromScene: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }
  let targets: THREE.WebGLRenderTarget[]
  beforeEach(() => {
    targets = []
    renderer = { setPixelRatio: vi.fn(), setSize: vi.fn(), render: vi.fn(), dispose: vi.fn(), getContext: () => ({ isContextLost: () => false }) }
    pmrem = { fromScene: vi.fn(() => {
      const target = new THREE.WebGLRenderTarget(1, 1); vi.spyOn(target, 'dispose'); targets.push(target); return target
    }), dispose: vi.fn() }
    mocks.renderer.mockImplementation(function () { return renderer })
    mocks.pmrem.mockImplementation(function () { return pmrem })
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 77)); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.unstubAllGlobals() })
  it('retains original scene settings and once-only cleanup; a stale RAF cannot restart', async () => {
    const f = fixture(), cleanup = f.create()!
    expect(renderer.setSize).toHaveBeenCalledWith(430, 844, false)
    expect(pmrem.fromScene.mock.calls[0][1]).toBe(2.2)
    expect(f.bindings.groupRef.current!.children).toHaveLength(3)
    expect(f.bindings.frontMaterialRef.current!.toneMapped).toBe(false)
    expect(f.bindings.backMaterialRef.current!.toneMapped).toBe(false)
    const texture = new THREE.Texture(), disposed = vi.spyOn(texture, 'dispose')
    await f.bindings.textureOwnerRef.current!.load('original', async () => texture)
    const queued = vi.mocked(requestAnimationFrame).mock.calls[0][0]
    cleanup(); cleanup(); queued(1)
    expect(renderer.dispose).toHaveBeenCalledOnce(); expect(pmrem.dispose).toHaveBeenCalledOnce()
    expect(targets[0].dispose).toHaveBeenCalledOnce(); expect(disposed).toHaveBeenCalledOnce()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(77); expect(requestAnimationFrame).toHaveBeenCalledOnce()
    expect(f.bindings.rendererGenerationRef.current.disposed).toBe(true)
    expect(f.bindings.textureOwnerRef.current).toBeNull(); expect(f.bindings.assetLoadersRef.current).toBeNull()
    expect(f.bindings.groupRef.current).toBeNull(); expect(f.bindings.triggerFlipRef.current).toBeNull()
  })
  it('context loss reports fallback, restoration replaces environment and cleanup removes listeners', () => {
    const f = fixture(), cleanup = f.create()!
    const loss = new Event('webglcontextlost', { cancelable: true }); f.canvas.dispatchEvent(loss)
    expect(loss.defaultPrevented).toBe(true); expect(f.onUnavailable).toHaveBeenLastCalledWith(true)
    f.canvas.dispatchEvent(new Event('webglcontextrestored'))
    expect(f.onUnavailable).toHaveBeenLastCalledWith(false)
    expect(targets[0].dispose).toHaveBeenCalledOnce(); expect(targets).toHaveLength(2)
    cleanup(); expect(targets[1].dispose).toHaveBeenCalledOnce()
    f.onUnavailable.mockClear(); f.canvas.dispatchEvent(new Event('webglcontextlost'))
    expect(f.onUnavailable).not.toHaveBeenCalled()
  })
  it('PMREM construction failure closes owners and disposes renderer before fallback', () => {
    mocks.pmrem.mockImplementationOnce(function () { throw new Error('Unsupported') })
    const f = fixture(); expect(f.create()).toBeUndefined()
    expect(renderer.dispose).toHaveBeenCalledOnce(); expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(f.bindings.assetLoadersRef.current).toBeNull(); expect(f.bindings.textureOwnerRef.current).toBeNull()
    expect(f.onUnavailable).toHaveBeenCalledWith(true); expect(f.onLoading).toHaveBeenCalledWith(false)
  })
  it('environment construction failure disposes both renderer and PMREM', () => {
    pmrem.fromScene.mockImplementationOnce(() => { throw new Error('Environment failed') })
    const f = fixture(); expect(f.create()).toBeUndefined()
    expect(renderer.dispose).toHaveBeenCalledOnce(); expect(pmrem.dispose).toHaveBeenCalledOnce()
    expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(f.onUnavailable).toHaveBeenCalledWith(true)
    expect(f.bindings.rendererGenerationRef.current.disposed).toBe(true)
  })
})
