/* Service worker for the OmoNetTab app shell. Served verbatim to the browser,
   so this file must stay plain JavaScript. */

// v3: account pages are never cached. The cache is renamed so the old copy — which on
// any phone that visited the dashboard before may hold a real person's arrangements —
// is deleted the moment this worker activates.
const CACHE_NAME = 'omonettab-shell-v3';
/**
 * Paths that belong to a signed-in person rather than to the shop.
 *
 * They are neither written to the cache nor read from it. An offline copy of
 * `/dashboard` is a file on the device: whoever held the phone could read another
 * account's data straight out of storage without ever reaching the server, and the app
 * lock — a decision the *server* makes — would never be asked. Public pages keep the
 * offline behaviour they have always had; an account path that cannot be reached now
 * says "you are offline" instead of showing private data that may be weeks old.
 */
const ACCOUNT_PREFIXES = ['/dashboard', '/buyer', '/admin', '/unlock'];
const CORE_ASSETS = [
  '/',
  '/offline',
  '/explore',
  '/products',
  '/tourism',
  '/collective-orders',
  '/how-it-works',
  '/pricing-tool',
  '/images/branding/logo.png'
];
const MAX_CACHED_RESPONSES = 60;
const STATIC_PREFIXES = ['/_next/static/'];

function isAccountPath(pathname) {
  return ACCOUNT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

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

/**
 * The page says "I am locked now" and this drops every account document from storage.
 * Belt and braces: nothing above writes those documents any more, so this exists for
 * the window between an old worker still in control and the new one activating.
 */
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'omonettab:purge-account-cache') return;
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          await Promise.all(
            requests
              .filter((request) => isAccountPath(new URL(request.url).pathname))
              .map((request) => cache.delete(request))
          );
        })
      );
    })()
  );
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
  const account = isAccountPath(url.pathname);
  try {
    const response = await fetch(request);
    const cacheable = response && response.ok && response.type === 'basic' && url.pathname !== '/sw.js';
    // A locked session's answer is a redirect to /unlock; the browser follows it and
    // what lands in the cache would be the door, not the page. Either way the account
    // path above is what keeps private HTML out of storage.
    if (cacheable && !account) {
      await cache.put(request, response.clone());
      await trim(cache);
    }
    return response;
  } catch (error) {
    // Offline on an account path: never fall back to a stored copy of it.
    if (account) {
      if (request.mode === 'navigate') return offlineFallback(cache);
      throw error;
    }
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
    '<!doctype html><html lang="en"><meta charset="utf-8"><title>OmoNetTab offline</title>' +
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
