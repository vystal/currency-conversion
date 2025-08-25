// sw.js
const VERSION = 'v2'; // bump to flush old caches at wrong scope
const STATIC_CACHE = `static-${VERSION}`;

// Derive the controlled base path, e.g. "/currency-conversion/"
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/+$/, '/') || '/';

const STATIC_ASSETS = [
  '',                 // => BASE_PATH
  'index.html',
  'script.js',
  'site.webmanifest',
  // a few representative icons (add more if you want)
  'icons/icon-any-192x192.png',
  'icons/icon-any-512x512.png',
  'icons/icon-maskable-192x192.png',
  'icons/icon-maskable-512x512.png'
].map(p => BASE_PATH + p);

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((k) => k !== STATIC_CACHE)
        .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Navigations (HTML): network-first with cache fallback to app shell
// - Others (CSS/JS/images/manifest): cache-first with network fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(req);
    // Fallback to app shell at the scoped base path
    return cached || caches.match(BASE_PATH);
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
