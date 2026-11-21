/* =============================================================================
 * HU Trader — service worker
 * -----------------------------------------------------------------------------
 * Caches the app shell for instant repeat visits and serves product imagery
 * cache-first (they never change once built). Banners and HTML are
 * stale-while-revalidate so a deploy is picked up on the next visit.
 * ========================================================================== */
const VERSION = 'hu-trader-v21';
/* Stamped automatically by tools/build-images.mjs from a hash of the photo set.
 * Change any product photo and the cache name changes with it, so a stale copy
 * is never served from the old image cache. */
const IMAGE_VERSION = '51a47efe2609';
const SHELL = `${VERSION}-shell`;
const IMAGES = `${VERSION}-images-${IMAGE_VERSION}`;

const SHELL_ASSETS = [
    './',
    './index.html',
    './store.html',
    './parts.html',
    './laptops.html',
    './gaming-pc.html',
    './custom-workstation-servers.html',
    './graphics-cards.html',
    './repair.html',
    './terms.html',
    './reviews.html',
    './css/site.css?v=14',
    './js/site.js?v=16',
    './js/app.js?v=24',
    './js/product-details.js?v=1',
    './js/products.js?v=14',
    './js/catalogue-order.js?v=1',
    './js/search.js?v=2',
    './js/price-filter.js?v=5',
    './js/photo-ids.js?v=3',
    './js/product-images.js?v=3',
    './js/catalogue-laptop-parts.js?v=1',
    './js/catalogue-macbook-parts.js?v=1',
    './js/ad-slider.js?v=3',
    './js/ads.js?v=8',
    './js/theme.js?v=4',
    './js/install.js?v=6',
    './js/protect.js?v=3',
    './js/blueprint.js?v=1',
    './js/laptop-issues.js?v=1',
    './js/ai-search.js?v=1',
    './js/pc-builder.js?v=2',
    './assets/fonts/inter-latin.woff2',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(SHELL)
            .then(c => Promise.allSettled(SHELL_ASSETS.map(u => c.add(u))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== SHELL && k !== IMAGES).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

const isImage = (url) =>
    /\.(?:webp|jpe?g|png|svg|gif|ico)$/i.test(url.pathname) ||
    url.pathname.includes('/assets/products/') ||
    url.pathname.includes('/assets/banners/') ||
    url.pathname.includes('/assets/archetypes/');

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;

    // Product imagery: cache-first, it is immutable once built.
    if (sameOrigin && isImage(url)) {
        e.respondWith(
            caches.open(IMAGES).then(async (cache) => {
                const hit = await cache.match(req);
                if (hit) return hit;
                try {
                    const res = await fetch(req);
                    // Only ever cache a complete, successful response — a
                    // truncated body would otherwise be served forever.
                    if (res.ok && res.status === 200 && res.type === 'basic') {
                        const buf = await res.clone().arrayBuffer();
                        if (buf.byteLength > 0) {
                            cache.put(req, new Response(buf, {
                                status: 200,
                                headers: res.headers,
                            }));
                        }
                    }
                    return res;
                } catch (err) {
                    const fallback = await cache.match(req, { ignoreSearch: true });
                    if (fallback) return fallback;
                    throw err;
                }
            })
        );
        return;
    }

    // Everything else same-origin: network first, fall back to cache.
    if (sameOrigin) {
        e.respondWith(
            fetch(req)
                .then(res => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(SHELL).then(c => c.put(req, copy));
                    }
                    return res;
                })
                .catch(async () => {
                    const hit = await caches.match(req, { ignoreSearch: true });
                    if (hit) return hit;
                    if (req.mode === 'navigate') {
                        const fallback = await caches.match('./index.html');
                        if (fallback) return fallback;
                    }
                    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
                })
        );
    }
});
