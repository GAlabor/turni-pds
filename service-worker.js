// ==============================
// Turni PDS — Service Worker
// ==============================

const VERSION    = '2025-11-20 V7.6';
const CACHE_NAME = `turni-pds-${VERSION}`;

const SCOPE_URL = new URL(self.registration.scope);
const ROOT = SCOPE_URL.pathname.replace(/\/$/, '');

// ==============================
// PRECACHE COMPLETO (APP READY)
// ==============================
// Tutto ciò che serve per avere l’app pienamente
// funzionante offline già dal primo avvio.
const PRECACHE_URLS = [
  // Shell base
  `${ROOT}/`,
  `${ROOT}/index.html`,
  `${ROOT}/manifest.webmanifest`,

  // CSS
  `${ROOT}/css/base.css`,
  `${ROOT}/css/calendar.css`,
  `${ROOT}/css/settings.css`,
  `${ROOT}/css/components.css`,
  `${ROOT}/css/tabbar.css`,
  `${ROOT}/css/turni.css`,

  // JS core + moduli UI
  `${ROOT}/js/config.js`,
  `${ROOT}/js/app.js`,
  `${ROOT}/js/sw-register.js`,
  `${ROOT}/js/calendar.js`,
  `${ROOT}/js/theme.js`,
  `${ROOT}/js/status.js`,
  `${ROOT}/js/icons.js`,
  `${ROOT}/js/settings.js`,
  `${ROOT}/js/turni.js`,

  // Icone / favicon
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

  // SVG UI (tabbar + status + frecce)
  `${ROOT}/svg/add.svg`,
  `${ROOT}/svg/arrow-back.svg`,
  `${ROOT}/svg/arrow-right.svg`,
  //`${ROOT}/svg/arrow-down.svg`,
  //`${ROOT}/svg/arrow-up.svg`,
  //`${ROOT}/svg/cancel.svg`,
  `${ROOT}/svg/calendar.svg`,
  //`${ROOT}/svg/check.svg`,
  `${ROOT}/svg/inspag.svg`,
  `${ROOT}/svg/riepilogo.svg`,
  `${ROOT}/svg/settings.svg`,
  `${ROOT}/svg/login.svg`
];

// ==============================
// NORMALIZZAZIONE HTML
// ==============================
function normalizeHTMLRequest(req) {
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return req;

  const wantsHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (!wantsHTML) return req;

  if (url.pathname === ROOT || url.pathname === ROOT + '/') {
    return new Request(`${ROOT}/index.html`, { credentials: 'same-origin' });
  }

  return req;
}

// ==============================
// HANDLER HTML
// ==============================
async function handleHtmlFetch(event, req) {
  const htmlReq = normalizeHTMLRequest(req);
  const cache = await caches.open(CACHE_NAME);

  // navigationPreload se disponibile
  let preload = null;
  if (event.preloadResponse) {
    try {
      preload = await event.preloadResponse;
    } catch (e) {
      preload = null;
    }
  }

  if (preload) {
    try {
      await cache.put(`${ROOT}/index.html`, preload.clone());
    } catch (e) {
      // ignorato
    }
    return preload;
  }

  // rete → cache → fallback
  try {
    const fresh = await fetch(htmlReq, { cache: 'no-store', credentials: 'same-origin' });
    try {
      await cache.put(`${ROOT}/index.html`, fresh.clone());
    } catch (e) {
      // ignorato
    }
    return fresh;
  } catch (e) {
    const cached = await cache.match(`${ROOT}/index.html`);
    if (cached) return cached;

    return new Response('<h1>Offline</h1><p>Nessuna cache disponibile.</p>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 503
    });
  }
}

// ==============================
// HANDLER SVG (network-first)
// ==============================
async function handleSvgFetch(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    try {
      await cache.put(req, fresh.clone());
    } catch (e) {
      // ignorato
    }
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response('', { status: 504 });
  }
}

// ==============================
// HANDLER STATICI (SWR reale)
// ==============================
async function handleStaticFetch(event, req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  if (cached) {
    // Aggiornamento in background
    event.waitUntil((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        await cache.put(req, fresh.clone());
      } catch (e) {
        // ignorato
      }
    })());
    return cached;
  }

  // non in cache → rete diretta
  try {
    const fresh = await fetch(req);
    await cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    return new Response('', { status: 504 });
  }
}

// ==============================
// INSTALL
// ==============================
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

// ==============================
// ACTIVATE
// ==============================
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    );

    if (self.registration.navigationPreload) {
      try {
        await self.registration.navigationPreload.enable();
      } catch (e) {
        // ignorato
      }
    }

    await self.clients.claim();
  })());
});

// ==============================
// MESSAGGI (SKIP WAITING)
// ==============================
self.addEventListener('message', ev => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ==============================
// FETCH
// ==============================
self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') {
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Non catturare il file del service worker
  if (url.pathname.endsWith('/service-worker.js')) {
    return;
  }

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  // 1) HTML → app shell veloce
  if (isHTML) {
    event.respondWith(handleHtmlFetch(event, req));
    return;
  }

  // 2) SVG → network-first
  if (url.pathname.startsWith(`${ROOT}/svg/`)) {
    event.respondWith(handleSvgFetch(req));
    return;
  }

  // 3) Statici → stale-while-revalidate
  event.respondWith(handleStaticFetch(event, req));
});
