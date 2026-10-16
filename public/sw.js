const cacheName = 'omolink-shell-v1';
const coreAssets = ['/', '/explore', '/products', '/tourism', '/collective-orders', '/how-it-works', '/pricing-tool', '/offline'];

self.addEventListener('install', (event) => {
  const ev = event as ExtendableEvent & { waitUntil: (p: Promise<unknown>) => void };
  ev.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.addAll(coreAssets))
      .catch(() => undefined)
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

self.addEventListener('activate', (event) => {
  const ev = event as ExtendableEvent & { waitUntil: (p: Promise<unknown>) => void };
  ev.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== cacheName).map((k) => caches.delete(k))))
  );
  (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

self.addEventListener('fetch', (event) => {
  const ev = event as FetchEvent;
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never cache mutations

  ev.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && url.pathname !== '/sw.js') {
            const copy = res.clone();
            caches.open(cacheName).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || offlineFallback());
      return cached || network;
    })
  );
});

async function offlineFallback() {
  const cached = await caches.match('/offline');
  if (cached) return cached;
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>OmoLink offline</title><body style="font-family:system-ui;padding:2rem;background:#fbf5ef;color:#331b0f"><h1>You are offline</h1><p>Cached listings will show when you revisit them. Drafts stay saved on this device.</p></body>',
    { headers: { 'Content-Type': 'text/html' }, status: 503 }
  );
}
