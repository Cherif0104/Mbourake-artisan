
const CACHE_NAME = 'senegal-pro-connect-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Note: In a real build, you would add JS, CSS, and image assets here.
  // The CDN for Tailwind is external and won't be cached by this service worker.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
