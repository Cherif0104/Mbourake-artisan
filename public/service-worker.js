// Bumper la version à chaque déploiement pour forcer la mise à jour des clients (skipWaiting + controllerchange → reload)
const CACHE_NAME = 'mbourake-v2.6.3';
const STATIC_CACHE_NAME = 'mbourake-static-v2.6.3';
const DYNAMIC_CACHE_NAME = 'mbourake-dynamic-v2.6.3';

// Assets à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// Stratégie de cache : Cache First pour les assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting(); // Activer le service worker immédiatement
      })
  );
});

// Nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
    .then(() => {
      return self.clients.claim(); // Prendre le contrôle de toutes les pages
    })
  );
});

// Cache.put() n'accepte que les requêtes http/https (pas chrome-extension://, etc.)
function canCache(request) {
  const u = new URL(request.url);
  return u.protocol === 'http:' || u.protocol === 'https:';
}

// Stratégie de cache : Network First avec fallback cache pour les requêtes API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ne jamais mettre en cache les schémas non supportés (chrome-extension, etc.)
  if (!canCache(request)) {
    return;
  }

  // Ignorer les requêtes vers Supabase (toujours en ligne)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Cache First pour les assets statiques
  if (request.destination === 'image' || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200 && canCache(request)) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache).catch(() => {});
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Ne jamais mettre en cache : OAuth, onboard, login, callback (évite bugs connexion PWA sur mobile)
  const path = url.pathname || '';
  const isAuthFlow = url.search || /\/onboard|\/auth|callback|redirect/.test(path);
  if (request.destination === 'document' && isAuthFlow) {
    event.respondWith(fetch(request));
    return;
  }

  // Network First pour les pages HTML — SPA : 404/500 → servir index.html pour éviter écran blanc au refresh
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            return response;
          }
          if (response.status === 404 || response.status === 500) {
            return caches.match('/index.html').then((cached) => cached || response);
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Par défaut : Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200 && canCache(request)) {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
