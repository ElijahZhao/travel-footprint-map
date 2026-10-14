// 旅行足迹地图 · 离线缓存 Service Worker
// 策略：
//  - 页面导航（HTML）：network-first，离线时回退到已缓存的首页
//  - 静态资源（带内容哈希的文件）：cache-first + 后台静默更新（安全，文件名随内容变化）
//  - 后端 API：不拦截，始终走网络
const VERSION = 'tf-v1'
const ASSET_CACHE = 'tf-assets-' + VERSION
const PAGE_CACHE = 'tf-pages-' + VERSION

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => !k.includes(VERSION)).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // 页面导航：优先网络，失败回退缓存首页
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req)
        const cache = await caches.open(PAGE_CACHE)
        cache.put('/', fresh.clone()).catch(() => {})
        return fresh
      } catch {
        const cache = await caches.open(PAGE_CACHE)
        return (await cache.match('/')) || (await caches.match('/index.html')) ||
          new Response('离线不可用', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      }
    })())
    return
  }

  // 静态资源：cache-first，命中后后台更新
  event.respondWith((async () => {
    const cache = await caches.open(ASSET_CACHE)
    const cached = await cache.match(req)
    const network = fetch(req)
      .then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {})
        return res
      })
      .catch(() => cached)
    return cached || network
  })())
})
