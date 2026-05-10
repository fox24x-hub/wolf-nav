const CACHE_NAME = 'wolf-v4';
const STATIC_ASSETS = [
  './',
  './index.htm',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap'
];

// Установка: кешируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Кеширование статических ресурсов');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.error('[SW] Ошибка кеширования:', err);
    })
  );
  self.skipWaiting();
});

// Активация: чистим старые кеши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: кэш тайлов карты + статика + всё остальное
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Тайлы карты — кешируем агрессивно
  if (request.url.includes('cartocdn.com') || request.url.includes('tile')) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          const clone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return fetchResponse;
        });
      })
    );
    return;
  }

  // Статика — сначала кеш, потом сеть
  if (STATIC_ASSETS.some(url => request.url.includes(url))) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Всё остальное — сначала сеть, потом кеш
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});
