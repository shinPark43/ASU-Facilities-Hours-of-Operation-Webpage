/* ASU Hours Offline PWA Service Worker
 * Strategies:
 *  - HTML navigations: NetworkFirst (fresh deploys online, cached shell offline)
 *  - Static versioned assets: CacheFirst with bounded entry limit
 *  - GET /api/* responses: StaleWhileRevalidate (never caches POST or opaque errors)
 */

const CACHE_VERSION = 'asu-hours-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const MAX_STATIC_ENTRIES = 60;
const MAX_API_ENTRIES = 30;

const APP_SHELL_URLS = ['./', './index.html', './manifest.json', './favicon.ico', './logo192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const expectedCaches = new Set([SHELL_CACHE, STATIC_CACHE, API_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !expectedCaches.has(key)).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
  }
}

function isCacheableResponse(response) {
  // Avoid caching opaque responses blindly or non-200 error responses
  return Boolean(response && response.status === 200 && response.type !== 'opaque');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache non-GET requests (e.g. POST)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 1. HTML Navigations: NetworkFirst with cached shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheableResponse(response)) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // 2. API GET requests: StaleWhileRevalidate
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (isCacheableResponse(response)) {
              cache.put(request, response.clone()).then(() => trimCache(API_CACHE, MAX_API_ENTRIES));
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          return cached;
        }
        const networkResponse = await networkPromise;
        return (
          networkResponse ||
          new Response(JSON.stringify({ success: false, offline: true, error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      })
    );
    return;
  }

  // 3. Same-origin static assets (JS, CSS, fonts, images): CacheFirst
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticDest = ['script', 'style', 'font', 'image'].includes(request.destination);
  if (isSameOrigin && isStaticDest) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (isCacheableResponse(response)) {
          cache.put(request, response.clone()).then(() => trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES));
        }
        return response;
      })
    );
  }
});
