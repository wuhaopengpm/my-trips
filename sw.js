const CACHE='my-trips-v3-5-1-visual-20260814';
const CORE=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './finance.js',
  './map.js',
  './trips.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './bali-2026-09.json',
  './bali-kelingking.jpg'
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

  // V3.5.1 fix:
  // Root path must always get the newest index.html.
  // Prevent iOS Safari/PWA from returning an old cached entry page.
  if (
    url.pathname.endsWith('/my-trips/') ||
    url.pathname.endsWith('/my-trips')
  ) {
    event.respondWith(
      fetch('./index.html', { cache: 'no-store' })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const isAppFile =
    url.pathname.endsWith('/') ||
    /\.(html|js|css|json|webmanifest)$/i.test(url.pathname);

  if (isAppFile) {
    // Online: get newest GitHub version first.
    // Offline: fall back to the cached copy.
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(hit => hit || caches.match('./index.html'))
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
