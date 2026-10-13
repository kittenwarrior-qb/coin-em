/** Gameplay origins only. Admin authorization must keep its separate exact HTTPS origin. */
export const NATIVE_GAMEPLAY_ORIGINS = ['https://localhost', 'capacitor://localhost'] as const

export function gameplayOrigins(webOrigins = 'http://localhost:5173', nativeEnabled?: string): readonly string[] {
  if (nativeEnabled !== undefined && nativeEnabled !== 'false' && nativeEnabled !== 'true') throw Error('INVALID_NATIVE_ORIGIN_FLAG')
  const origins = webOrigins.split(',').map(value => value.trim())
  if (!origins.length || origins.some(value => !value)) throw Error('INVALID_GAMEPLAY_ORIGIN')
  for (const value of origins) {
    if ((NATIVE_GAMEPLAY_ORIGINS as readonly string[]).includes(value)) throw Error('NATIVE_ORIGIN_REQUIRES_FLAG')
    let parsed: URL
    try { parsed = new URL(value) } catch { throw Error('INVALID_GAMEPLAY_ORIGIN') }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== value || parsed.username || parsed.password) throw Error('INVALID_GAMEPLAY_ORIGIN')
  }
  return [...new Set([...origins, ...(nativeEnabled === 'true' ? NATIVE_GAMEPLAY_ORIGINS : [])])]
}

/** Missing Origin is possible for non-browser clients; seat/session checks still apply. */
export function allowsGameplayOrigin(origin: string | undefined, allowed: readonly string[]): boolean {
  return origin === undefined || allowed.includes(origin)
}
