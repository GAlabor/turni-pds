// ==============================
// Turni PDS - Service Worker
// ==============================
const VERSION    = '2025-10-30-01'; // <— bump ad ogni deploy
const CACHE_NAME = `turni-pds-${VERSION}`;

// Precache minimo per offline affidabile (percorsi assoluti nello scope /turni-pds/)
const PRECACHE_URLS = [
  '/turni-pds/',
  '/turni-pds/index.html',
  '/turni-pds/manifest.webmanifest',
  '/turni-pds/icon-192.png',
  '/turni-pds/icon-512.png',
  '/turni-pds/redirect/',
  '/turni-pds/redirect/index.html'
];

// Normalizza richieste HTML verso index quando serve
function normalizeHTMLRequest(req) {
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return req;
  if (!url.pathname.startsWith('/turni-pds')) return req;

  // Navigazioni o Accept: text/html → usa index per la home
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    if (url.pathname === '/turni-pds' || url.pathname === '/turni-pds/') {
      return new Request('/turni-pds/index.html', { credentials: 'same-origin' });
    }
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

// Consenti al client di forzare l’attivazione della nuova versione
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignora non-GET
  if (req.method !== 'GET') return;

  // Ignora cross-origin (OAuth/Google ecc.)
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (!sameOrigin) return;

  // HTML: network-first con fallback a cache, cache-chiave corretta (index o redirect)
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    const htmlReq = normalizeHTMLRequest(req);
    event.respondWith((async () => {
      try {
        const fresh = await fetch(htmlReq, { cache: 'no-store', credentials: 'same-origin' });

        // Decidi la chiave cache in base al path richiesto
        const url = new URL(htmlReq.url);
        let cacheKey = '/turni-pds/index.html';
        if (url.pathname.startsWith('/turni-pds/redirect/')) {
          cacheKey = '/turni-pds/redirect/index.html';
        }

        const cache = await caches.open(CACHE_NAME);
        cache.put(cacheKey, fresh.clone());
        return fresh;
      } catch {
        // Fallback: prova la pagina coerente con la richiesta
        const isRedirect = new URL(htmlReq.url).pathname.startsWith('/turni-pds/redirect/');
        const fallbackKey = isRedirect ? '/turni-pds/redirect/index.html' : '/turni-pds/index.html';
        const cached = await caches.match(fallbackKey);
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
      // Aggiorna in background
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
      // Fallback estremo: se è una navigazione prova la home
      if (req.mode === 'navigate') {
        const home = await caches.match('/turni-pds/index.html');
        if (home) return home;
      }
      return new Response('', { status: 504 });
    }
  })());
});
