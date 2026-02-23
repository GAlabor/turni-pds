const VERSION = '2.5.5';
const APP_VERSION = VERSION;

const ICO_VERSION = 'v1.0';
const SPLASH_VERSION = 'v1.0';
const SVG_VERSION = 'v1.1';

const CACHE_APP = `turni-app-${APP_VERSION}`;
const CACHE_ICO = `turni-ico-${ICO_VERSION}`;
const CACHE_SPLASH = `turni-splash-${SPLASH_VERSION}`;
const CACHE_SVG = `turni-svg-${SVG_VERSION}`;

const SCOPE_URL = new URL(self.registration.scope);
const ROOT = SCOPE_URL.pathname.replace(/\/$/, '');

function cacheKeyFor(req) {
  const url = new URL(req.url);
  url.search = "";
  url.hash = "";
  return url.toString();
}

const APP_URLS = [
  `${ROOT}/`,
  `${ROOT}/index.html`,
  `${ROOT}/app.css`,
  `${ROOT}/app.js`,
  `${ROOT}/manifest.webmanifest`
];

const ICO_URLS = [
  `${ROOT}/favicon.ico`,
  `${ROOT}/ico/favicon.ico`,
  `${ROOT}/ico/favicon-16.png`,
  `${ROOT}/ico/favicon-32.png`,
  `${ROOT}/ico/favicon.svg`,
  `${ROOT}/ico/icon-192x192.png`,
  `${ROOT}/ico/icon-512x512.png`,
  `${ROOT}/ico/apple-touch-icon-180x180-flat.png`
];

const SPLASH_URLS = [
  `${ROOT}/splash/ios-splash_1080x2340_portrait.png`,
  `${ROOT}/splash/ios-splash_1125x2436_portrait.png`,
  `${ROOT}/splash/ios-splash_1170x2532_portrait.png`,
  `${ROOT}/splash/ios-splash_1179x2556_portrait.png`,
  `${ROOT}/splash/ios-splash_1242x2208_portrait.png`,
  `${ROOT}/splash/ios-splash_1242x2688_portrait.png`,
  `${ROOT}/splash/ios-splash_1284x2778_portrait.png`,
  `${ROOT}/splash/ios-splash_1290x2796_portrait.png`,
  `${ROOT}/splash/ios-splash_1536x2048_portrait.png`,
  `${ROOT}/splash/ios-splash_1620x2160.png`,
  `${ROOT}/splash/ios-splash_1668x2224_portrait.png`,
  `${ROOT}/splash/ios-splash_1668x2388_portrait.png`,
  `${ROOT}/splash/ios-splash_2048x2732_portrait.png`,
  `${ROOT}/splash/ios-splash_640x1136_portrait.png`,
  `${ROOT}/splash/ios-splash_750x1334_portrait.png`,
  `${ROOT}/splash/ios-splash_828x1792_portrait.png`
];

const SVG_URLS = [
  `${ROOT}/svg/calendar.svg`,
  `${ROOT}/svg/inspag.svg`,
  `${ROOT}/svg/riepilogo.svg`,
  `${ROOT}/svg/settings.svg`,
  `${ROOT}/svg/login.svg`,
  `${ROOT}/svg/circle.svg`
];

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

async function handleHtmlFetch(event, req) {
  const htmlReq = normalizeHTMLRequest(req);
  const cache = await caches.open(CACHE_APP);

  let preload = null;
  if (event.preloadResponse) {
    try { preload = await event.preloadResponse; } catch {}
  }

  if (preload) {
    try { await cache.put(`${ROOT}/index.html`, preload.clone()); } catch {}
    return preload;
  }

  try {
    const fresh = await fetch(htmlReq, { cache: 'no-store', credentials: 'same-origin' });
    try { await cache.put(`${ROOT}/index.html`, fresh.clone()); } catch {}
    return fresh;
  } catch {
    const cached = await cache.match(`${ROOT}/index.html`);
    if (cached) return cached;

    return new Response(
      '<h1>Offline</h1><p>Nessuna cache disponibile.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const key = cacheKeyFor(req);
  const cached = await cache.match(key);
  if (cached) return cached;

  try {
    const fresh = await fetch(req, { cache: 'no-store', credentials: 'same-origin' });
    try { await cache.put(key, fresh.clone()); } catch {}
    return fresh;
  } catch {
    return new Response('', { status: 504 });
  }
}

async function staleWhileRevalidate(event, req, cacheName) {
  const cache = await caches.open(cacheName);
  const key = cacheKeyFor(req);
  const cached = await cache.match(key);

  if (cached) {
    event.waitUntil((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store', credentials: 'same-origin' });
        try { await cache.put(key, fresh.clone()); } catch {}
      } catch {}
    })());
    return cached;
  }

  try {
    const fresh = await fetch(req, { cache: 'no-store', credentials: 'same-origin' });
    try { await cache.put(key, fresh.clone()); } catch {}
    return fresh;
  } catch {
    return new Response('', { status: 504 });
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const appCache = await caches.open(CACHE_APP);
    const icoCache = await caches.open(CACHE_ICO);
    const splashCache = await caches.open(CACHE_SPLASH);
    const svgCache = await caches.open(CACHE_SVG);

    await Promise.allSettled(APP_URLS.map(u => appCache.add(u)));
    await Promise.allSettled(ICO_URLS.map(u => icoCache.add(u)));
    await Promise.allSettled(SPLASH_URLS.map(u => splashCache.add(u)));
    await Promise.allSettled(SVG_URLS.map(u => svgCache.add(u)));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([CACHE_APP, CACHE_ICO, CACHE_SPLASH, CACHE_SVG]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)));

    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }

    await self.clients.claim();
  })());
});

self.addEventListener('message', ev => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') self.skipWaiting();
});

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

  if (url.pathname.startsWith(`${ROOT}/ico/`) || url.pathname === `${ROOT}/favicon.ico`) {
    event.respondWith(cacheFirst(req, CACHE_ICO));
    return;
  }

  if (url.pathname.startsWith(`${ROOT}/splash/`)) {
    event.respondWith(cacheFirst(req, CACHE_SPLASH));
    return;
  }

  if (url.pathname.startsWith(`${ROOT}/svg/`)) {
    event.respondWith(cacheFirst(req, CACHE_SVG));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, req, CACHE_APP));
});
