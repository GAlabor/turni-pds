// ==============================
// Turni PdS — Service Worker
// ==============================

const VERSION    = '2025-12-15 V1.4';
const CACHE_NAME = `turni-pds-${VERSION}`;

const SCOPE_URL = new URL(self.registration.scope);
const ROOT = SCOPE_URL.pathname.replace(/\/$/, '');

// ==============================
// PRECACHE COMPLETO (APP READY)
// ==============================
const PRECACHE_URLS = [
  // Shell base
  `${ROOT}/`,
  `${ROOT}/index.html`,
  `${ROOT}/manifest.webmanifest`,

  // CSS
  `${ROOT}/css/base.css`,
  `${ROOT}/css/calendar.css`,
  `${ROOT}/css/settings.css`,
  `${ROOT}/css/turni-panel.css`,
  `${ROOT}/css/turni-form.css`,
  `${ROOT}/css/turnazioni.css`,
  `${ROOT}/css/components.css`,
  `${ROOT}/css/tabbar.css`,

  // JS core + moduli UI
  `${ROOT}/js/config.js`,

  // UI core
  `${ROOT}/js/calendar.js`,
  `${ROOT}/js/theme.js`,
  `${ROOT}/js/status.js`,
  `${ROOT}/js/icons.js`,
  `${ROOT}/js/ui-feedback.js`,

  // Settings navigation
  `${ROOT}/js/settings.js`,

  // Turni: storage/render/interactions
  `${ROOT}/js/turni-storage.js`,
  `${ROOT}/js/turni-render.js`,
  `${ROOT}/js/turni-interactions.js`,

  // Turnazioni (nuovi moduli)
  `${ROOT}/js/turnazioni-list.js`,
  `${ROOT}/js/turnazioni-add.js`,
  `${ROOT}/js/turnazioni.js`,

  // Turno iniziale (nuovo modulo)
  `${ROOT}/js/turni-start.js`,

  // Turni orchestratore
  `${ROOT}/js/turni.js`,

  // App bootstrap
  `${ROOT}/js/app.js`,
  `${ROOT}/js/sw-register.js`,

  // Compat: opzionale (puoi anche toglierlo dal precache)
  `${ROOT}/js/turnazione.js`,


  // Favicon
  `${ROOT}/favicon.ico`,

  // ICO
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
  `${ROOT}/svg/calendar.svg`,
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

  // ROOT -> index.html
  if (url.pathname === ROOT || url.pathname === ROOT + '/') {
    return new Request(`${ROOT}/index.html`, {
      credentials: 'same-origin'
    });
  }

  return req;
}

// ==============================
// HANDLER HTML (network-first)
// ==============================
async function handleHtmlFetch(event, req) {
  const htmlReq = normalizeHTMLRequest(req);
  const cache = await caches.open(CACHE_NAME);

  let preload = null;
  if (event.preloadResponse) {
    try { preload = await event.preloadResponse; } catch {}
  }

  if (preload) {
    try { await cache.put(`${ROOT}/index.html`, preload.clone()); } catch {}
    return preload;
  }

  try {
    const fresh = await fetch(htmlReq, {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    try { await cache.put(`${ROOT}/index.html`, fresh.clone()); } catch {}
    return fresh;
  } catch {
    const cached = await cache.match(`${ROOT}/index.html`);
    if (cached) return cached;

    return new Response(
      '<h1>Offline</h1><p>Nessuna cache disponibile.</p>',
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 503
      }
    );
  }
}

// ==============================
// HANDLER SVG (network-first, match ignoring search)
// ==============================
async function handleSvgFetch(req) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const fresh = await fetch(req, {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    try { await cache.put(req, fresh.clone()); } catch {}
    return fresh;
  } catch {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    return new Response('', { status: 504 });
  }
}

// ==============================
// HANDLER STATICI (SWR coerente + ignoreSearch)
// ==============================
async function handleStaticFetch(event, req) {
  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(req, { ignoreSearch: true });

  if (cached) {
    event.waitUntil((async () => {
      try {
        const fresh = await fetch(req, {
          cache: 'no-store',
          credentials: 'same-origin'
        });
        try { await cache.put(req, fresh.clone()); } catch {}
      } catch {}
    })());
    return cached;
  }

  try {
    const fresh = await fetch(req, {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    try { await cache.put(req, fresh.clone()); } catch {}
    return fresh;
  } catch {
    return new Response('', { status: 504 });
  }
}

// ==============================
// INSTALL (robusto: non fallisce se manca 1 asset)
// ==============================
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Precache "best effort": se manca qualcosa, install non muore.
    await Promise.allSettled(
      PRECACHE_URLS.map((u) => cache.add(u))
    );

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
      try { await self.registration.navigationPreload.enable(); } catch {}
    }

    await self.clients.claim();
  })());
});

// ==============================
// MESSAGGI
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
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/service-worker.js')) return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(handleHtmlFetch(event, req));
    return;
  }

  if (url.pathname.startsWith(`${ROOT}/svg/`)) {
    event.respondWith(handleSvgFetch(req));
    return;
  }

  event.respondWith(handleStaticFetch(event, req));
});
