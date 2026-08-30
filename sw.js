// ── JustForms Offline Service Worker (sw.js) ──────────────────────────
// Enables 100% client-side offline execution (PWA) — works in Airplane Mode.

const CACHE_NAME = "justforms-cache-v2.5";
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/favicon.svg",
    "/site.webmanifest",
    "/styles/base.css",
    "/styles/fonts.css",
    "/styles/main.css",
    "/styles/landing.css",
    "/styles/canvas.css",
    "/styles/editor.css",
    "/styles/modals.css",
    "/js/main.js",
    "/js/state.js",
    "/js/constants.js",
    "/js/toast.js",
    "/js/pdf-engine.js",
    "/js/canvas-controller.js",
    "/js/overlay-manager.js",
    "/js/properties-panel.js",
    "/js/layers-panel.js",
    "/js/acroform-builder.js",
    "/js/auto-detector.js",
    "/js/templates-engine.js",
    "/js/storage-manager.js",
    "/js/signature-pad.js",
    "/js/landing-controller.js",
    "/js/onboarding-tour.js"
];

// Install event: cache all core static assets
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn("[ServiceWorker] Pre-caching non-fatal warning:", err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate event: purge outdated caches
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event: Network-First with Cache Fallback (guarantees newest code while preserving 100% offline PWA)
self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    // Skip non-GET or chrome-extension requests
    if (event.request.method !== "GET" || url.protocol.startsWith("chrome-extension")) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Offline fallback from Cache Storage
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    if (event.request.mode === "navigate") {
                        return caches.match("/index.html") || caches.match("/");
                    }
                });
            })
    );
});
