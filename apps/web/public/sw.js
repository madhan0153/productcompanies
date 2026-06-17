/*
 * ProdMatch.ai — service worker (hand-rolled, zero deps).
 *
 * Goals:
 *  1. Make the app reliably installable (a fetch handler + manifest is what
 *     Chrome/Edge/Samsung need before firing `beforeinstallprompt`).
 *  2. Offline resilience without breaking Next 16 App Router semantics.
 *
 * Strategy (deliberately conservative so we never serve stale/auth'd HTML):
 *  - Navigations           → network-first (+ navigation preload), offline.html fallback.
 *  - /_next/static/*       → cache-first (content-hashed, immutable).
 *  - Images / fonts / css  → stale-while-revalidate, image cache LRU-trimmed.
 *  - /api/*, /auth/*, RSC  → pass-through to network, never cached.
 *  - Cross-origin          → untouched.
 *
 * Updates are user-controlled: a new SW waits until the page posts SKIP_WAITING
 * (see components/pwa-register.tsx) so we never hot-swap assets mid-session.
 */

const VERSION = "v1";
const STATIC_CACHE = `pm-static-${VERSION}`;
const RUNTIME_CACHE = `pm-runtime-${VERSION}`;
const IMAGE_CACHE = `pm-images-${VERSION}`;
const KNOWN_CACHES = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE];

const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/logo-prodmatchai.png"];

const IMAGE_CACHE_MAX = 60;

const IMMUTABLE = /\/_next\/static\//;
const IMAGE_ASSET = /\.(?:png|jpe?g|gif|svg|webp|avif|ico)$/i;
const STATIC_ASSET = /\.(?:js|css|woff2?|ttf|otf|eot)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Precache failure must not block install (e.g. a 404 on one asset).
      .catch(() => undefined),
  );
  // Note: no skipWaiting() here — activation is gated on the page's consent.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Navigation preload lets the browser fetch the page in parallel with
      // SW boot, removing the network-first latency penalty.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !KNOWN_CACHES.includes(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let the browser own cross-origin
  if (url.pathname.startsWith("/api/")) return; // dynamic / authenticated — never cache
  if (url.pathname.startsWith("/auth/")) return;

  // Full-page navigations only. RSC payload fetches are mode:"cors"/"same-origin"
  // (not "navigate"), so they fall through to the network untouched.
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(event));
    return;
  }

  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (IMAGE_ASSET.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, IMAGE_CACHE_MAX));
    return;
  }

  if (STATIC_ASSET.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }
  // Everything else (data fetches, RSC, etc.) → default browser handling.
});

async function navigationHandler(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return (
      offline ??
      new Response("You are offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return cached ?? Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).then(() => {
          if (maxEntries) trimCache(cacheName, maxEntries);
        });
      }
      return response;
    })
    .catch(() => cached);
  return cached ?? network;
}

// Simple FIFO trim to bound cache growth on long-lived installs.
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}

/* -------------------------------------------------------------------------- */
/* Web Push                                                                   */
/* -------------------------------------------------------------------------- */

// The server sends a JSON body: { title, body, url, type, data }.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "ProdMatch.ai", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "ProdMatch.ai";
  const options = {
    body: payload.body || "",
    icon: "/logo-prodmatchai.png",
    badge: "/logo-prodmatchai.png",
    // Coalesce repeats of the same type into one notification, but re-alert.
    tag: payload.type || "prodmatch",
    renotify: true,
    data: { url: payload.url || "/dashboard", ...(payload.data || {}) },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus an existing tab on the target path if one is open; otherwise open it.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const targetUrl = new URL(target, self.location.origin);
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === targetUrl.pathname && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl.href);
    })(),
  );
});
