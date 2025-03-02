const cacheName = 'jadwal-sholat-v1';
const assets = [
  './'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
    .then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
    .then(response => response || fetch(event.request))
  );
});
