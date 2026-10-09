/*
 * Service worker: rende l'app installabile e utilizzabile offline.
 * I file dell'app vengono messi in cache all'installazione; i font di Google
 * vengono salvati la prima volta che si scaricano.
 * Quando cambi i file dell'app, aumenta VERSION così i telefoni scaricano
 * la versione nuova.
 */
const VERSION = 'v1';
const APP_CACHE = `visualviewer-app-${VERSION}`;
const FONT_CACHE = 'visualviewer-fonts';

const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/aiff.js',
  'js/player.js',
  'js/features.js',
  'js/scenes.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('visualviewer-app-') && k !== APP_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Font: cache, poi rete (e aggiorna la cache).
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // File dell'app: prima la rete (così gli aggiornamenti arrivano subito),
  // la cache se si è offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      })
  );
});
