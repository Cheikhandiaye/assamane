const VERSION = "assirik-v1";
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const MAX_PAGE_ENTRIES = 50;
const MAX_ASSET_ENTRIES = 150;
const PAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ASSET_TTL_MS = 30 * 24 * 60 * 60 * 1000;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("assirik-") && ![PAGE_CACHE, ASSET_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/~oauth") || url.pathname.startsWith("/__")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE, MAX_PAGE_ENTRIES, PAGE_TTL_MS));
    return;
  }

  if (["script", "style", "worker", "font", "image"].includes(request.destination)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE, MAX_ASSET_ENTRIES, ASSET_TTL_MS));
  }
});

async function networkFirst(request, cacheName, maxEntries, ttlMs) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      await cache.put(request, withTimestamp(response.clone()));
      await trimCache(cacheName, maxEntries, ttlMs);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached && !isExpired(cached, ttlMs)) return stripTimestamp(cached);
    throw new Error("ASSIRIK offline cache miss");
  }
}

async function cacheFirst(request, cacheName, maxEntries, ttlMs) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached && !isExpired(cached, ttlMs)) return stripTimestamp(cached);

  const response = await fetch(request);
  if (isCacheable(response)) {
    await cache.put(request, withTimestamp(response.clone()));
    await trimCache(cacheName, maxEntries, ttlMs);
  }
  return response;
}

function isCacheable(response) {
  return response && response.ok && response.type !== "opaque";
}

function withTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set("x-assirik-cache-time", Date.now().toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function stripTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.delete("x-assirik-cache-time");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isExpired(response, ttlMs) {
  const cachedAt = Number(response.headers.get("x-assirik-cache-time") || 0);
  return !cachedAt || Date.now() - cachedAt > ttlMs;
}

async function trimCache(cacheName, maxEntries, ttlMs) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  await Promise.all(
    requests.map(async (request) => {
      const response = await cache.match(request);
      if (response && isExpired(response, ttlMs)) await cache.delete(request);
    }),
  );

  const remaining = await cache.keys();
  if (remaining.length <= maxEntries) return;
  await Promise.all(remaining.slice(0, remaining.length - maxEntries).map((request) => cache.delete(request)));
}