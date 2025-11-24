// ==============================
// Turni PDS — Service Worker
// ==============================

const VERSION    = '2025-11-20 V1.7'; // VERSIONE APP CORRENTE
const CACHE_NAME = `turni-pds-${VERSION}`;

// Scope e root dinamici
const SCOPE_URL = new URL(self.registration.scope);
const ROOT = SCOPE_URL.pathname.replace(/\/$/, '');

// Precache minimo per offline affidabile
const PRECACHE_URLS = [
  `${ROOT}/`,
  `${ROOT}/index.html`,
  `${ROOT}/manifest.webmanifest`,

  // CSS/JS
  `${ROOT}/css/base.css`,
  `${ROOT}/css/calendar.css`,
  `${ROOT}/css/settings.css`,
  `${ROOT}/css/components.css`,
  `${ROOT}/css/tabbar.css`,
  `${ROOT}/css/turni.css`,
  `${ROOT}/js/calendar.js`,
  `${ROOT}/js/theme.js`,
  `${ROOT}/js/status.js`,
  `${ROOT}/js/icons.js`,
  `${ROOT}/js/settings.js`,
  `${ROOT}/js/turni.js`,
  `${ROOT}/js/app.js`,
  `${ROOT}/js/sw-register.js`,

  // Icone / SVG / favicon
`${ROOT}/favicon.ico`,

// Cartella ICO completa
`${ROOT}/ico/apple-touch-icon-120x120.png`,
`${ROOT}/ico/apple-touch-icon-152x152.png`,
`${ROOT}/ico/apple-touch-icon-167x167.png`,
`${ROOT}/ico/apple-touch-icon-180x180-flat.png`,
`${ROOT}/ico/apple-touch-icon-180x180.png`,
`${ROOT}/ico/favicon-16x16.png`,
`${ROOT}/ico/favicon-32x32.png`,
`${ROOT}/ico/favicon-48x48.png`,
`${ROOT}/ico/icon-1024.png`,
`${ROOT}/ico/icon-192.png`,
`${ROOT}/ico/icon-512.png`,
`${ROOT}/ico/mstile-150x150.png`,

// SVG UI
`${ROOT}/svg/add.svg`,
`${ROOT}/svg/arrow-back.svg`,
`${ROOT}/svg/arrow-right.svg`,
`${ROOT}/svg/arrow-down.svg`,
`${ROOT}/svg/arrow-up.svg`,
`${ROOT}/svg/cancel.svg`,
`${ROOT}/svg/calendar.svg`,
`${ROOT}/svg/inspag.svg`,
`${ROOT}/svg/riepilogo.svg`,
`${ROOT}/svg/settings.svg`,
`${ROOT}/svg/login.svg`,

];

// Normalizza richieste HTML verso index
function normalizeHTMLRequest(req) {
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return req;
  if (!(url.pathname === ROOT || url.pathname.startsWith(ROOT + '/'))) return req;

  const wantsHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (wantsHTML && (url.pathname === ROOT || url.pathname === ROOT + '/')) {
    return new Request(`${ROOT}/index.html`, { credentials: 'same-origin' });
  }
  return req;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );

    // Abilita navigationPreload per velocizzare i navigate fetch
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }

    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return;

  // NON intercettare il file del service worker
  if (url.pathname === `${ROOT}/service-worker.js`) {
    return;
  }

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  // HTML → app shell
  if (isHTML) {
    const htmlReq = normalizeHTMLRequest(req);

    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      const preload = event.preloadResponse ? await event.preloadResponse : null;
      if (preload) {
        try { cache.put(`${ROOT}/index.html`, preload.clone()); } catch {}
        return preload;
      }

      try {
        const fresh = await fetch(htmlReq, { cache: 'no-store', credentials: 'same-origin' });
        try { cache.put(`${ROOT}/index.html`, fresh.clone()); } catch {}
        return fresh;
      } catch {
        const cached = await caches.match(`${ROOT}/index.html`);
        return cached || new Response('<h1>Offline</h1><p>Nessuna cache disponibile.</p>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 503
        });
      }
    })());
    return;
  }

  // =========================
  // SVG icone → NETWORK-FIRST
  // =========================
  if (url.pathname.startsWith(`${ROOT}/svg/`)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // Prima rete, niente HTTP cache
        const fresh = await fetch(req, { cache: 'no-store' });
        try { cache.put(req, fresh.clone()); } catch {}
        return fresh;
      } catch {
        // Se rete KO → fallback alla cache
        const cached = await cache.match(req);
        if (cached) return cached;
        return new Response('', { status: 504 });
      }
    })());
    return;
  }

  // =========================
  // Asset statici → CACHE-FIRST con refresh in background
  // =========================
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
      if (req.mode === 'navigate') {
        const home = await caches.match(`${ROOT}/index.html`);
        if (home) return home;
      }
      return new Response('', { status: 504 });
    }
  })());
});
