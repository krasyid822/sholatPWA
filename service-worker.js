const cacheName = 'jadwal-sholat-v2';
const assets = [
  './adzan_subuh',
  './adzan1',
  './beeps',
  './favicon.png',
  './PrayTimes.js'
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
