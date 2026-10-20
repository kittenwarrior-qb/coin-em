import { describe, expect, it } from 'vitest'
import { gameplayOrigins, allowsGameplayOrigin, NATIVE_GAMEPLAY_ORIGINS } from '../../src/transport/origins'

describe('narrow native gameplay origin gate', () => {
  it('defaults to web only and accepts explicit false', () => {
    expect(gameplayOrigins()).toEqual(['http://localhost:5173'])
    expect(gameplayOrigins('https://app.example.test', 'false')).toEqual(['https://app.example.test'])
  })
  it('adds only the two reviewed native origins when explicitly enabled', () => {
    expect(gameplayOrigins('https://app.example.test, https://staging.example.test,https://app.example.test', 'true'))
      .toEqual(['https://app.example.test', 'https://staging.example.test', ...NATIVE_GAMEPLAY_ORIGINS])
  })
  it.each(['*', 'null', '', 'https://app.example.test/path', 'https://app.example.test/',
    'https://user:password@app.example.test', 'file://localhost', 'https://app.example.test,'])('rejects unsafe config %s', origin => {
    expect(() => gameplayOrigins(origin)).toThrow('INVALID_GAMEPLAY_ORIGIN')
  })
  it.each(NATIVE_GAMEPLAY_ORIGINS)('requires the native flag instead of sneaking %s into web config', origin => {
    expect(() => gameplayOrigins(origin)).toThrow('NATIVE_ORIGIN_REQUIRES_FLAG')
  })
  it.each(['1', 'yes', 'TRUE', '*', ''])('rejects ambiguous native flag %s', flag => {
    expect(() => gameplayOrigins(undefined, flag)).toThrow('INVALID_NATIVE_ORIGIN_FLAG')
  })
  it('matches exact origins, not suffixes, ports, null or credentials', () => {
    const allowed = gameplayOrigins('https://app.example.test', 'true')
    for (const origin of allowed) expect(allowsGameplayOrigin(origin, allowed)).toBe(true)
    for (const origin of ['null', 'https://localhost:443', 'https://localhost.evil.test', 'http://localhost', 'capacitor://evil', 'https://app.example.test.evil'])
      expect(allowsGameplayOrigin(origin, allowed)).toBe(false)
    expect(allowsGameplayOrigin(undefined, allowed)).toBe(true)
  })
})
