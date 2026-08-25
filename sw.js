const CACHE='my-trips-v3-7-0-20260825';
const CORE=[
  './',
  './index.html',
  './styles.css',
  './utils.js',
  './app.js',
  './finance.js',
  './map.js',
  './trips.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './bali-2026-09.json',
  './trip-pack.schema.json',
  './bali-kelingking-640.webp',
  './bali-kelingking-1280.webp',
  './bali-kelingking-fallback.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isAppFile = event.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    /\.(html|js|css|json|webmanifest)$/i.test(url.pathname);

  if (isAppFile) {
    // Online: get newest GitHub version first.
    // Offline: fall back to the cached copy.
    event.respondWith(
      fetch(event.request,{cache:event.request.mode==='navigate'?'no-store':'default'})
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(hit => hit || caches.match(new URL('./index.html',self.registration.scope)))
        )
    );
    return;
  }

  // Icons and other static assets can remain cache-first.
  event.respondWith(
    caches.match(event.request).then(hit =>
      hit ||
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
    )
  );
});
