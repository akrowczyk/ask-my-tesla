const CACHE_NAME = "amt-v1";
const PRECACHE_URLS = ["/", "/icons/icon-192x192.png", "/icons/icon-512x512.png"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Skip non-GET and API/auth requests
    if (request.method !== "GET" || request.url.includes("/api/")) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful responses for static assets
                if (response.ok && (request.url.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/) || request.mode === "navigate")) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
});
