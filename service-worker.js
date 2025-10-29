// ==============================
// Turni PDS - Service Worker v2025-10-20-02
// BUMPA 'VERSION' ad ogni deploy che deve invalidare cache.
// ==============================
// Turni PDS - Service Worker v2025-10-29-01
const VERSION    = '2025-10-29-01';
const CACHE_NAME = `turni-pds-${VERSION}`;

// Precache minimo per offline affidabile.
// Percorsi ASSOLUTI, dentro lo scope /turni-pds/
const PRECACHE_URLS = [
  '/turni-pds/',
  '/turni-pds/index.html',
  '/turni-pds/manifest.webmanifest',
  '/turni-pds/icon-192.png',
  '/turni-pds/icon-512.png',
  // redirect: includi entrambe le varianti, così copri GH Pages
  '/turni-pds/redirect/',
  '/turni-pds/redirect/index.html'
];

// Normalizza richieste HTML verso index.html quando serve
function normalizeHTMLRequest(req) {
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return req;
  if (!url.pathname.startsWith('/turni-pds')) return req;

  // navigate o Accept: text/html → usa l'index della tua app
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    // Home della PWA
    if (url.pathname === '/turni-pds' || url.pathname === '/turni-pds/') {
      return new Request('/turni-pds/index.html', { credentials: 'same-origin' });
    }
    // Per altre rotte statiche, lascia passare; l'HTML network-first sotto li gestisce
  }
  return req;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting(); // prendi controllo subito
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Permetti al client di forzare l'attivazione della nuova versione
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  

  // Lascia stare non-GET o cross-origin (es. Dropbox API)
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (!sameOrigin) return;

  // HTML: network-first con fallback a cache (così gli update arrivano subito)
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    const htmlReq = normalizeHTMLRequest(req);
    event.respondWith((async () => {
      try {
        const fresh = await fetch(htmlReq, { cache: 'no-store', credentials: 'same-origin' });
        const cache = await caches.open(CACHE_NAME);
        // manteniamo l'index aggiornato
        cache.put('/turni-pds/index.html', fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match('/turni-pds/index.html');
        return cached || new Response('<h1>Offline</h1><p>Nessuna cache disponibile.</p>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503
        });
      }
    })());
    return;
  }

  // Asset statici: cache-first con refresh in background
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      event.waitUntil((async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-store' });
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
        } catch {}
      })());
      return cached;
    }
    try {
      const resp = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, resp.clone());
      return resp;
    } catch {
      // come fallback estremo, prova la home se è una navigazione
      if (req.mode === 'navigate') {
        const home = await caches.match('/turni-pds/index.html');
        if (home) return home;
      }
      return new Response('', { status: 504 });
    }
  })());
});
