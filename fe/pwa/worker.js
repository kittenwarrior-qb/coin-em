/* Build prepends immutable CONFIG; this file is not served directly. */
/* global CONFIG, self, caches */
const scope = new URL(self.registration.scope)
const assets = new Map(CONFIG.assets.map(asset => [new URL(asset.path, scope).href, asset.hash]))
const cacheName = CONFIG.prefix + CONFIG.version
const offlineURL = new URL('offline.html', scope).href
const inScope = url => url.origin === scope.origin && url.pathname.startsWith(scope.pathname)
const hex = buffer => [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, '0')).join('')

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Verify every body before opening the cache; unexpected/private bytes never enter it.
    const responses = []
    for (const [url, expected] of assets) {
      const response = await fetch(url, { credentials: 'omit', cache: 'no-store', redirect: 'error' })
      if (!response.ok || response.redirected || /private|no-store/i.test(response.headers.get('cache-control') ?? '')) throw new Error('Public guide unavailable')
      const actual = hex(await self.crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer()))
      if (actual !== expected) throw new Error('Public guide integrity mismatch')
      responses.push([url, response])
    }
    const cache = await caches.open(cacheName)
    try { for (const [url, response] of responses) await cache.put(url, response) }
    catch (error) { await caches.delete(cacheName); throw error }
    // No skipWaiting here: existing clients retain their current worker/app.
  })())
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith(CONFIG.prefix) && name !== cacheName) await caches.delete(name)
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url)
  if (request.method !== 'GET' || !inScope(url) || url.search) return
  if (assets.has(url.href)) {
    event.respondWith((async () => (await caches.open(cacheName)).match(url.href).then(response => response ?? fetch(request)))())
  } else if (request.mode === 'navigate') {
    // Never cache navigations, application code, room/API/socket data or errors.
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(async () => {
      const cached = await (await caches.open(cacheName)).match(offlineURL)
      if (cached) {
        // Keep the public guide in CacheStorage only, not a second navigation HTTP cache.
        const headers = new Headers(cached.headers); headers.set('Cache-Control', 'no-store')
        return new Response(cached.body, { status: cached.status, headers })
      }
      return new Response('Hướng dẫn ngoại tuyến chưa có. Hãy kết nối mạng để mở EmCoin.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
    }))
  }
})

let activation = null
self.addEventListener('message', event => {
  const data = event.data
  if (data?.type === 'EMCOIN_UPDATE_VOTE' && activation && data.nonce === activation.nonce && activation.pending.has(event.source?.id)) {
    activation.pending.delete(event.source.id)
    if (data.idle !== true) activation.denied = true
    if (!activation.pending.size) activation.finish()
    return
  }
  if (data?.type !== 'EMCOIN_ACTIVATE' || activation || !event.source?.url || !inScope(new URL(event.source.url))) return
  const reply = message => event.source.postMessage(message)
  event.waitUntil((async () => {
    const clients = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(client => inScope(new URL(client.url)))
    const nonce = self.crypto.randomUUID()
    let finish
    const settled = new Promise(resolve => { finish = resolve })
    activation = { nonce, pending: new Set(clients.map(client => client.id)), denied: !clients.length, finish }
    const timer = setTimeout(finish, 2500)
    for (const client of clients) client.postMessage({ type: 'EMCOIN_UPDATE_CHECK', nonce })
    if (!clients.length) finish()
    await settled; clearTimeout(timer)
    const current = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(client => inScope(new URL(client.url)))
    const denied = activation.denied || activation.pending.size > 0 || current.length !== clients.length || current.some(client => !clients.some(previous => previous.id === client.id))
    activation = null
    if (denied) { reply({ type: 'EMCOIN_UPDATE_DEFERRED' }); return }
    await self.skipWaiting()
    reply({ type: 'EMCOIN_UPDATE_ACCEPTED' })
  })())
})
