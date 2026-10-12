import { afterEach, describe, expect, it, vi } from 'vitest'
import { socketDiagnostic } from '@/features/transport/socketDiagnostics'
import { getUserId } from '@/utils/userId'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); localStorage.clear() })

describe('content-free local socket diagnostics', () => {
  it('prints only closed event/severity fields without a snapshot or private payload', () => {
    vi.stubEnv('DEV', true)
    const log = vi.spyOn(console, 'debug').mockImplementation(() => {})
    socketDiagnostic('response_received')
    expect(log).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ version: 'socket-diagnostic/v1', event: 'response_received', severity: 'info' }))
  })
  it('does not print successful/info event traces in production', () => {
    vi.stubEnv('DEV', false)
    const log = vi.spyOn(console, 'debug').mockImplementation(() => {})
    expect(socketDiagnostic('room_state')).toBe(true)
    expect(log).not.toHaveBeenCalled()
  })
  it('keeps warnings/errors content-free in production without accepting error objects', () => {
    vi.stubEnv('DEV', false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    socketDiagnostic('error', 'warn'); socketDiagnostic('error', 'error')
    expect(warn).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ version: 'socket-diagnostic/v1', event: 'error', severity: 'warn' }))
    expect(error).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ version: 'socket-diagnostic/v1', event: 'error', severity: 'error' }))
  })
  it('rejects arbitrary strings or payload objects even from an untyped caller', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(Reflect.apply(socketDiagnostic, null, ['private-nickname', 'error'])).toBe(false)
    expect(Reflect.apply(socketDiagnostic, null, [{ roomId: 'private-room', token: 'synthetic-secret' }, 'error'])).toBe(false)
    expect(Reflect.apply(socketDiagnostic, null, ['error', 'private-story'])).toBe(false)
    expect(debug).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled()
  })
  it('ignores extra untyped private arguments instead of serializing them', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    Reflect.apply(socketDiagnostic, null, ['error', 'error', { password: 'synthetic-secret', story: 'private story' }])
    expect(error).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ version: 'socket-diagnostic/v1', event: 'error', severity: 'error' }))
  })
  it('retains stable identity behavior without logging its identifier', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const first = getUserId()
    expect(getUserId()).toBe(first)
    expect(localStorage.getItem('userId')).toBe(first)
    expect(log).not.toHaveBeenCalled()
  })
})
