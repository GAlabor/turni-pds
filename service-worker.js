// ===================== SPLIT meta : START =====================
// ==============================
// Turni PdS — Service Worker
// ==============================

const VERSION    = '2025-12-15 v1.4.0';
const CACHE_NAME = `turni-pds-${VERSION}`;

const SCOPE_URL = new URL(self.registration.scope);
const ROOT = SCOPE_URL.pathname.replace(/\/$/, '');

// ==============================
// Cache key normalizzata: ignora ?query e #hash
// (evita duplicati e rende coerente match/put)
// ==============================
function cacheKeyFor(req) {
  const url = new URL(req.url);
  url.search = "";
  url.hash = "";
  return url.toString();
}

// ===================== SPLIT meta : END   =====================


// ===================== SPLIT precache : START =====================
// ==============================
// PRECACHE COMPLETO (APP READY)
// ==============================
const PRECACHE_URLS = [
  // Shell base
  `${ROOT}/`,
  `${ROOT}/index.html`,
  `${ROOT}/manifest.webmanifest`,

  // CSS
  `${ROOT}/app.css`,


  // JS
`${ROOT}/app.js`,



  // Favicon
  `${ROOT}/favicon.ico`,

  // ICO
  `${ROOT}/ico/favicon.ico`,
  `${ROOT}/ico/favicon-16.png`,
  `${ROOT}/ico/favicon-32.png`,
  `${ROOT}/ico/favicon.svg`,
  `${ROOT}/ico/icon-192x192.png`,
  `${ROOT}/ico/icon-512x512.png`,
  `${ROOT}/ico/apple-touch-icon-180x180-flat.png`,


  // SPLASH iOS
  `${ROOT}/splash/ios-splash_1080x2340_portrait.png`,
  `${ROOT}/splash/ios-splash_1125x2436_portrait.png`,
  `${ROOT}/splash/ios-splash_1136x640_landscape.png`,
  `${ROOT}/splash/ios-splash_1170x2532_portrait.png`,
  `${ROOT}/splash/ios-splash_1179x2556_portrait.png`,
  `${ROOT}/splash/ios-splash_1242x2208_portrait.png`,
  `${ROOT}/splash/ios-splash_1242x2688_portrait.png`,
  `${ROOT}/splash/ios-splash_1284x2778_portrait.png`,
  `${ROOT}/splash/ios-splash_1290x2796_portrait.png`,
  `${ROOT}/splash/ios-splash_1334x750_landscape.png`,
  `${ROOT}/splash/ios-splash_1536x2048_portrait.png`,
  `${ROOT}/splash/ios-splash_1620x2160.png`,
  `${ROOT}/splash/ios-splash_1668x2224_portrait.png`,
  `${ROOT}/splash/ios-splash_1668x2388_portrait.png`,
  `${ROOT}/splash/ios-splash_1792x828_landscape.png`,
  `${ROOT}/splash/ios-splash_2048x1536_landscape.png`,
  `${ROOT}/splash/ios-splash_2048x2732_portrait.png`,
  `${ROOT}/splash/ios-splash_2208x1242_landscape.png`,
  `${ROOT}/splash/ios-splash_2224x1668_landscape.png`,
  `${ROOT}/splash/ios-splash_2340x1080_landscape.png`,
  `${ROOT}/splash/ios-splash_2388x1668_landscape.png`,
  `${ROOT}/splash/ios-splash_2436x1125_landscape.png`,
  `${ROOT}/splash/ios-splash_2532x1170_landscape.png`,
  `${ROOT}/splash/ios-splash_2556x1179_landscape.png`,
  `${ROOT}/splash/ios-splash_2688x1242_landscape.png`,
  `${ROOT}/splash/ios-splash_2732x2048_landscape.png`,
  `${ROOT}/splash/ios-splash_2778x1284_landscape.png`,
  `${ROOT}/splash/ios-splash_2796x1290_landscape.png`,
  `${ROOT}/splash/ios-splash_640x1136_portrait.png`,
  `${ROOT}/splash/ios-splash_750x1334_portrait.png`,
  `${ROOT}/splash/ios-splash_828x1792_portrait.png`,


  // SVG UI
  `${ROOT}/svg/calendar.svg`,
  `${ROOT}/svg/inspag.svg`,
  `${ROOT}/svg/riepilogo.svg`,
  `${ROOT}/svg/settings.svg`,
  `${ROOT}/svg/login.svg`
];
// ===================== SPLIT precache : END   =====================


// ===================== SPLIT normalize-html : START =====================
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
// ===================== SPLIT normalize-html : END   =====================


// ===================== SPLIT handler-html : START =====================
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
// ===================== SPLIT handler-html : END   =====================


// ===================== SPLIT handler-svg : START =====================
// ==============================
// HANDLER SVG (network-first, match ignoring search)
// ==============================
async function handleSvgFetch(req) {
  const cache = await caches.open(CACHE_NAME);
  const key = cacheKeyFor(req);

  try {
    const fresh = await fetch(req, {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    try { await cache.put(key, fresh.clone()); } catch {}
    return fresh;
  } catch {
    const cached = await cache.match(key);
    if (cached) return cached;
    return new Response('', { status: 504 });
  }
}
// ===================== SPLIT handler-svg : END   =====================


// ===================== SPLIT handler-static : START =====================
// ==============================
// HANDLER STATICI (SWR coerente + ignoreSearch)
// ==============================
async function handleStaticFetch(event, req) {
  const cache = await caches.open(CACHE_NAME);
  const key = cacheKeyFor(req);

  const cached = await cache.match(key);

  if (cached) {
    event.waitUntil((async () => {
      try {
        const fresh = await fetch(req, {
          cache: 'no-store',
          credentials: 'same-origin'
        });
        try { await cache.put(key, fresh.clone()); } catch {}
      } catch {}
    })());
    return cached;
  }

  try {
    const fresh = await fetch(req, {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    try { await cache.put(key, fresh.clone()); } catch {}
    return fresh;
  } catch {
    return new Response('', { status: 504 });
  }
}
// ===================== SPLIT handler-static : END   =====================


// ===================== SPLIT lifecycle-install : START =====================
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
// ===================== SPLIT lifecycle-install : END   =====================


// ===================== SPLIT lifecycle-activate : START =====================
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
// ===================== SPLIT lifecycle-activate : END   =====================


// ===================== SPLIT messages : START =====================
// ==============================
// MESSAGGI
// ==============================
self.addEventListener('message', ev => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
// ===================== SPLIT messages : END   =====================


// ===================== SPLIT fetch : START =====================
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
// ===================== SPLIT fetch : END   =====================
