/**
 * =========================================================
 * DHYEY CLINIC MANAGEMENT SYSTEM - SERVICE WORKER (PWA)
 * Version: v1.0.0
 * Provides offline caching, network-first fallbacks, and instant updates
 * =========================================================
 */

const CACHE_NAME = 'dhyey-cms-cache-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Core essential assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/pages/login.html',
  '/assets/icons/icon.svg',
  '/assets/icons/icon-maskable.svg',
  '/css/style.css',
  '/css/dashboard.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/pwa.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install Event: Precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching app shell and core assets...');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Service Worker Precache Warning]: Some assets could not be cached immediately:', err);
      });
    })
  );
  // Activate worker immediately without waiting for old tabs to close
  self.skipWaiting();
});

// Activate Event: Clear outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache version:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Smart caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests (e.g. POST, PUT, DELETE for API)
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: API requests -> Network First with error handling
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          // If offline and fetching API, return offline JSON fallback
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              message: 'You are currently offline. Local data will be synced when back online.'
            }),
            {
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Strategy 2: Navigation requests (HTML pages) -> Network First with Offline Fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If response is valid, clone to cache for future offline visits
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response('<h1>Offline</h1><p>Please check your connection.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // Strategy 3: Static Assets (CSS, JS, Fonts, Images) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Return cached asset immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for message events (e.g. skipWaiting trigger from client)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
