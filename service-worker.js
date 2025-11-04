// ==============================
// Turni PDS — Service Worker
// ==============================
// Nota: la registrazione nell'index usa BASE '' in localhost e '/turni-pds' su Pages.
// Qui ricaviamo dinamicamente il ROOT dallo scope registrato, così i percorsi non rompono.

const VERSION    = '2025-11-04-01';                 // bump ad ogni deploy assieme all’index
const CACHE_NAME = `turni-pds-${VERSION}`;

// Scope reale della registrazione, es:
// - localhost  → scope "http://localhost:8000/"
// - GitHub     → scope "https://.../turni-pds/"
// Da qui ricaviamo il ROOT da premettere ai path ("" o "/turni-pds")
const SCOPE_URL = new URL(self.registration.scope);
const ROOT = SCOPE_URL.pathname.replace(/\/$/, ''); // "" oppure "/turni-pds"

// Precache minimo per offline affidabile (icone spostate in /ico)
const PRECACHE_URLS = [
  `${ROOT}/`,
  `${ROOT}/index.html`,
  `${ROOT}/manifest.webmanifest`,
  `${ROOT}/ico/icon-192.png`,
  `${ROOT}/ico/icon-512.png`,
  `${ROOT}/redirect/`,
  `${ROOT}/redirect/index.html`
];

// Normalizza richieste HTML verso l’index corretto nello scope
function normalizeHTMLRequest(req) {
  const url = new URL(req.url);

  // Solo same-origin
  if (url.origin !== self.location.origin) return req;

  // Fuori dallo scope? Non tocchiamo nulla
  if (!(url.pathname === ROOT || url.pathname.startsWith(ROOT + '/'))) return req;

  // Navigazioni o Accept: text/html → potremmo rimpiazzare con la nostra index
  const wantsHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (wantsHTML) {
    // Home dello scope → servi index.html
    if (url.pathname === ROOT || url.pathname === ROOT + '/') {
      return new Request(`${ROOT}/index.html`, { credentials: 'same-origin' });
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
    await Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    );
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

  // Ignora cross-origin (Drive/OAuth/Google ecc.)
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (!sameOrigin) return;

  // HTML: network-first con fallback coerente alla pagina richiesta
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    const htmlReq = normalizeHTMLRequest(req);
    event.respondWith((async () => {
      try {
        const fresh = await fetch(htmlReq, { cache: 'no-store', credentials: 'same-origin' });

        // Decidi la chiave cache in base al path richiesto
        const url = new URL(htmlReq.url);
        let cacheKey = `${ROOT}/index.html`;
        if (url.pathname.startsWith(`${ROOT}/redirect/`)) {
          cacheKey = `${ROOT}/redirect/index.html`;
        }

        const cache = await caches.open(CACHE_NAME);
        cache.put(cacheKey, fresh.clone());
        return fresh;
      } catch {
        // Fallback: prova la pagina coerente con la richiesta
        const isRedirect = new URL(htmlReq.url).pathname.startsWith(`${ROOT}/redirect/`);
        const fallbackKey = isRedirect ? `${ROOT}/redirect/index.html` : `${ROOT}/index.html`;
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
        const home = await caches.match(`${ROOT}/index.html`);
        if (home) return home;
      }
      return new Response('', { status: 504 });
    }
  })());
});
