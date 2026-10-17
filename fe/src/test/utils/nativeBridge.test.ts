import { describe, expect, it, vi } from 'vitest'
import { mountNativeBridge, type NativePorts } from '@/features/platform/nativeBridge'
import { canNavigateNativeBack } from '@/features/platform/nativeNavigation'
import { notifyNativeBackground, notifyNativeForeground, subscribeNativeBackground, subscribeNativeForeground } from '@/features/platform/nativeEvents'

describe('native lifecycle boundary', () => {
  it('allows an offline empty home to exit without allowing retained/unknown sessions to leave gameplay', () => {
    expect(canNavigateNativeBack('/',null)).toBe(true)
    expect(canNavigateNativeBack('/game',null)).toBe(true)
    expect(canNavigateNativeBack('/','retained-session')).toBe(false)
    expect(canNavigateNativeBack('/game',undefined)).toBe(false)
    expect(canNavigateNativeBack('/admin',null)).toBe(false)
    expect(canNavigateNativeBack('/about/story','retained-session')).toBe(true)
  })
  it('deduplicates foreground/network signals and ignores callbacks after disposal', async () => {
    let active!: (value:boolean)=>void, network!: (value:boolean)=>void, back!: (value:boolean)=>void
    const remove=vi.fn().mockResolvedValue(undefined)
    const ports:NativePorts={appState:async callback=>{active=callback;return {remove}},network:async callback=>{network=callback;return {remove}},back:async callback=>{back=callback;return {remove}}}
    const context={foreground:vi.fn(),background:vi.fn(),back:vi.fn(),unavailable:vi.fn()}
    const stop=mountNativeBridge(ports,context)
    active(true); network(true)
    expect(context.foreground).not.toHaveBeenCalled()
    active(false);active(false);network(false);network(true)
    expect(context.background).toHaveBeenCalledTimes(1)
    expect(context.foreground).not.toHaveBeenCalled()
    active(true);active(true)
    expect(context.foreground).toHaveBeenCalledTimes(1)
    back(false);expect(context.back).toHaveBeenCalledWith(false)
    await Promise.resolve();stop();stop();active(false);network(false);back(true)
    expect(remove).toHaveBeenCalledTimes(3)
    expect(context.back).toHaveBeenCalledTimes(1)
  })
  it('removes handles which resolve after unmount rather than leaking listeners', async () => {
    const resolvers:Array<(handle:{remove:()=>Promise<void>})=>void>=[]
    const register=()=>new Promise<{remove:()=>Promise<void>}>(resolve=>resolvers.push(resolve))
    const context={foreground:vi.fn(),background:vi.fn(),back:vi.fn(),unavailable:vi.fn()}
    const stop=mountNativeBridge({appState:register,network:register,back:register},context)
    stop();const remove=vi.fn().mockResolvedValue(undefined)
    resolvers.forEach(resolve=>resolve({remove}));await Promise.resolve()
    expect(remove).toHaveBeenCalledTimes(3)
  })
  it('fails softly on sync/async registration errors without exposing plugin errors', async () => {
    const fail=()=>{throw Error('synthetic-plugin-secret')}
    const context={foreground:vi.fn(),background:vi.fn(),back:vi.fn(),unavailable:vi.fn()}
    const stop=mountNativeBridge({appState:fail,network:()=>Promise.reject(Error('synthetic')),back:fail},context)
    await Promise.resolve();await Promise.resolve()
    expect(context.unavailable).toHaveBeenCalledTimes(3)
    expect(context.unavailable).toHaveBeenCalledWith()
    stop()
  })
  it('disposes foreground and background subscriptions independently', () => {
    const foreground=vi.fn(),background=vi.fn()
    const stopForeground=subscribeNativeForeground(foreground),stopBackground=subscribeNativeBackground(background)
    notifyNativeForeground();notifyNativeBackground();stopForeground();stopBackground()
    notifyNativeForeground();notifyNativeBackground()
    expect(foreground).toHaveBeenCalledTimes(1);expect(background).toHaveBeenCalledTimes(1)
  })
})
