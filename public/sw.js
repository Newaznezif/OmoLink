/* Service worker for the OmoNETAB app shell. Served verbatim to the browser,
   so this file must stay plain JavaScript. */

const CACHE_NAME = 'omonetab-shell-v2';
const CORE_ASSETS = ['/', '/offline', '/explore', '/products', '/tourism', '/collective-orders', '/how-it-works', '/pricing-tool'];
const MAX_CACHED_RESPONSES = 60;
const STATIC_PREFIXES = ['/_next/static/'];

self.addEventListener('install', (event) => {
  event.waitUntil(precacheCoreAssets());
  self.skipWaiting();
});

async function precacheCoreAssets() {
  const cache = await caches.open(CACHE_NAME);
  // One failing route must not empty the whole shell, so precache individually
  // instead of addAll(), which rejects wholesale if any entry is not ok.
  await Promise.all(
    CORE_ASSETS.map(async (path) => {
      try {
        await cache.add(path);
      } catch (error) {
        console.warn('Could not precache ' + path, error);
      }
    })
  );
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Mutations and their responses are never cacheable.
  if (url.pathname.startsWith('/api/')) return;

  if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    // Hashed build files never change name, so an old copy is always valid.
    event.respondWith(cacheFirst(request));
  } else {
    // A page must not be served from cache while the network is fine: prices and
    // stock are only honest when they are current.
    event.respondWith(networkFirst(request, url));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

async function networkFirst(request, url) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic' && url.pathname !== '/sw.js') {
      await cache.put(request, response.clone());
      await trim(cache);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return offlineFallback(cache);
    throw error;
  }
}

async function offlineFallback(cache) {
  const offlinePage = await cache.match('/offline');
  if (offlinePage) return offlinePage;
  const cachedRoot = await cache.match('/');
  if (cachedRoot) return cachedRoot;
  return new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><title>OmoNETAB offline</title>' +
      '<body style="font-family:system-ui;padding:2rem;background:#fbf5ef;color:#331b0f">' +
      '<h1>You are offline</h1><p>Cached listings will show when you revisit them. Drafts stay saved on this device.</p>' +
      '</body></html>',
    { headers: { 'Content-Type': 'text/html' }, status: 503 }
  );
}

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHED_RESPONSES) return;
  // Phones get little free storage; drop the oldest entries beyond the cap.
  await Promise.all(keys.slice(0, keys.length - MAX_CACHED_RESPONSES).map((request) => cache.delete(request)));
}
