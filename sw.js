const CACHE = 'turni-pds-v1';

// Elenca gli asset minimi da mettere in cache all'install
const ASSETS = [
  '/turni-pds/',
  '/turni-pds/index.html',
  '/turni-pds/redirect/',        // usi la cartella redirect/ su GitHub Pages
  '/turni-pds/manifest.webmanifest',
  '/turni-pds/icon-192.png',
  '/turni-pds/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Lascia stare le chiamate alle API Dropbox: devono andare in rete
  const url = req.url;
  if (url.startsWith('https://api.dropboxapi.com/') ||
      url.startsWith('https://content.dropboxapi.com/')) {
    return; // default fetch
  }

  // Cache-first per tutto il resto, con fallback alla home se offline
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(res => {
        // Cache dinamica solo per GET same-origin
        try {
          if (req.method === 'GET' && res.ok && new URL(url).origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
        } catch {}
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('/turni-pds/index.html');
        }
      });
    })
  );
});
