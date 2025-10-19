// /turni-pds/service-worker.js
const CACHE = 'turni-pds-v1';

// File locali da avere sempre offline
const ASSETS = [
  '/turni-pds/',
  '/turni-pds/index.html',
  '/turni-pds/redirect/index.html',   // se usi la cartella redirect/
  '/turni-pds/manifest.webmanifest',
  '/turni-pds/icon-192.png',
  '/turni-pds/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k.startsWith('turni-pds-') && k !== CACHE) ? caches.delete(k) : null))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Non tocchiamo chiamate non-GET o esterne (es. Dropbox API)
  const isSameOrigin = new URL(req.url).origin === self.location.origin;
  if (req.method !== 'GET' || !isSameOrigin) return;

  // Stale-while-revalidate: rispondi subito da cache, aggiorna dietro le quinte
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then(res => {
      // Metti in cache solo risposte ok
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    return cached || network || new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
