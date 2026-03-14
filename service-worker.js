const CACHE_NAME = 'sachin-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './js/app.js',
    './js/state.js',
    './js/storage.js',
    './js/ui.js',
    './js/events.js',
    './js/utils.js',
    './js/thumbnails.js',
    './manifest.json',
    './offline.html'
];

// 1. Install - Pre-cache essential assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// 2. Activate - Cleanup old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
});

// 3. Fetch Strategy: Stale-While-Revalidate
self.addEventListener('fetch', event => {
    // Handle image runtime caching separately
    if (event.request.destination === 'image') {
        event.respondWith(cacheFirst(event.request));
    } else {
        event.respondWith(staleWhileRevalidate(event.request));
    }
});

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        cache.put(request, networkResponse.clone());
        return networkResponse;
    });

    return cachedResponse || fetchPromise;
}

async function cacheFirst(request) {
    const cache = await caches.open('sachin-images');
    const cached = await cache.match(request);
    if (cached) return cached;
    
    try {
        const fresh = await fetch(request);
        cache.put(request, fresh.clone());
        return fresh;
    } catch (e) {
        if (request.mode === 'navigate') {
            return caches.match('./offline.html');
        }
        return caches.match('./favicon.ico'); // Fallback for images
    }
}
