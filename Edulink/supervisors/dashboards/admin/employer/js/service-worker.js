/**
 * Service Worker for Client-Side Caching
 * Implements caching strategies for static assets and API responses
 */

const CACHE_NAME = 'edulink-employer-dashboard-v1.0.0';
const STATIC_CACHE = 'edulink-static-v1.0.0';
const API_CACHE = 'edulink-api-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/js/modules/api-utils.js',
    '/js/modules/dom-utils.js',
    '/js/modules/chart-utils.js',
    '/js/modules/dashboard-manager.js',
    '/js/modules/lazy-loader.js',
    '/js/dashboard-backend.js',
    '/js/employer-auth-security.js',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
    'https://cdn.jsdelivr.net/npm/flatpickr'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/dashboard/stats/',
    '/api/applications/',
    '/api/analytics/',
    '/api/notifications/'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE).then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url => {
                    return new Request(url, { mode: 'cors' });
                })).catch(error => {
                    console.warn('Service Worker: Failed to cache some static assets:', error);
                });
            }),
            
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== API_CACHE && 
                            cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all clients
            self.clients.claim()
        ])
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (isStaticAsset(url)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(url)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isHTMLRequest(request)) {
        event.respondWith(handleHTMLRequest(request));
    } else {
        event.respondWith(handleOtherRequest(request));
    }
});

// Check if request is for static asset
function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.otf'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
           url.hostname.includes('cdn.') ||
           url.hostname.includes('fonts.');
}

// Check if request is for API
function isAPIRequest(url) {
    return url.pathname.startsWith('/api/') ||
           API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint));
}

// Check if request is for HTML
function isHTMLRequest(request) {
    return request.headers.get('accept')?.includes('text/html');
}

// Handle static assets - Cache First strategy
async function handleStaticAsset(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Return cached version and update in background
            updateCacheInBackground(request, cache);
            return cachedResponse;
        }
        
        // Fetch and cache
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('Service Worker: Error handling static asset:', error);
        return new Response('Asset not available', { status: 503 });
    }
}

// Handle API requests - Network First with cache fallback
async function handleAPIRequest(request) {
    try {
        const cache = await caches.open(API_CACHE);
        
        try {
            // Try network first
            const response = await fetch(request);
            
            if (response.ok) {
                // Cache successful responses for 5 minutes
                const responseToCache = response.clone();
                const headers = new Headers(responseToCache.headers);
                headers.set('sw-cached-at', Date.now().toString());
                
                const cachedResponse = new Response(responseToCache.body, {
                    status: responseToCache.status,
                    statusText: responseToCache.statusText,
                    headers: headers
                });
                
                cache.put(request, cachedResponse);
            }
            
            return response;
        } catch (networkError) {
            // Network failed, try cache
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                const cachedAt = cachedResponse.headers.get('sw-cached-at');
                const age = Date.now() - parseInt(cachedAt || '0');
                
                // Return cached response if less than 5 minutes old
                if (age < 5 * 60 * 1000) {
                    return cachedResponse;
                }
            }
            
            throw networkError;
        }
    } catch (error) {
        console.error('Service Worker: Error handling API request:', error);
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle HTML requests - Network First
async function handleHTMLRequest(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (error) {
        console.error('Service Worker: Error handling HTML request:', error);
        return new Response('Page not available', { status: 503 });
    }
}

// Handle other requests - Network only
async function handleOtherRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        console.error('Service Worker: Error handling request:', error);
        return new Response('Resource not available', { status: 503 });
    }
}

// Update cache in background
async function updateCacheInBackground(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
    } catch (error) {
        console.warn('Service Worker: Background cache update failed:', error);
    }
}

// Handle cache cleanup
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }
    
    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        event.waitUntil(
            getCacheSize().then(size => {
                event.ports[0].postMessage({ size });
            })
        );
    }
});

// Get total cache size
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}