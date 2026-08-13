const CACHE='my-trips-v3-6-5-library-cover-20260814';
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

// FORCE_UPDATE_MERGED
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (
    requestUrl.pathname.endsWith('/my-trips/') ||
    requestUrl.pathname.endsWith('/my-trips/index.html') ||
    requestUrl.pathname.endsWith('/my-trips/sw.js')
  ) {
    event.respondWith(
      fetch(event.request, {cache:'no-store'})
        .catch(() => caches.match(event.request))
    );
    return;
  }
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

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
