// ── Formblatt Offline Service Worker (sw.js) ──────────────────────────
// Enables 100% client-side offline execution (PWA) — works in Airplane Mode.

const CACHE_NAME = "formblatt-cache-v3.9";
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
    "/vendor/pdf.min.js",
    "/vendor/pdf.worker.min.js",
    "/vendor/pdf-lib.min.js",
    "/vendor/lucide.min.js",
    "/vendor/fontkit.umd.min.js",
    "/js/main.js",
    "/js/core/state.js",
    "/js/core/constants.js",
    "/js/core/storage-manager.js",
    "/js/core/data-exporter.js",
    "/js/engines/pdf-engine.js",
    "/js/engines/acroform-builder.js",
    "/js/engines/auto-detector.js",
    "/js/engines/onnx-detector.js",
    "/js/engines/ocr-engine.js",
    "/js/engines/templates-engine.js",
    "/js/controllers/editor-app.js",
    "/js/controllers/landing-controller.js",
    "/js/ui/canvas-controller.js",
    "/js/ui/overlay-manager.js",
    "/js/ui/properties-panel.js",
    "/js/ui/layers-panel.js",
    "/js/ui/command-palette.js",
    "/js/ui/signature-pad.js",
    "/js/ui/onboarding-tour.js",
    "/js/ui/gradient-waves.js",
    "/js/utils/toast.js",
    "/js/utils/tooltip.js",
    "/js/utils/haptics.js"
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
