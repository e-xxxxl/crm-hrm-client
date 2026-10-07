/* Service worker: makes the app installable and fast on repeat visits.
 *
 * It only ever caches the static app shell and build assets. API traffic and
 * anything carrying credentials is never touched, so no business data or
 * tokens end up in a cache. Bump VERSION to force every client to drop old caches.
 */
const VERSION = "v2";
const SHELL_CACHE = `crmhrm-shell-${VERSION}`;
const ASSET_CACHE = `crmhrm-assets-${VERSION}`;
const FONT_CACHE = `crmhrm-fonts-${VERSION}`;
const CURRENT = [SHELL_CACHE, ASSET_CACHE, FONT_CACHE];

const PRECACHE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/mainlogo.jpeg"];
const NAV_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CURRENT.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Web fonts: serve instantly from cache, refresh quietly.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Page loads: the network wins when it's responsive (so deploys show up
  // immediately); on a slow or dead connection fall back to the cached shell
  // rather than a blank page.
  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
    return;
  }

  // Build output is content-hashed, so a cached copy is always correct.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

async function navigate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const network = fetch(request).then((res) => {
    if (res.ok) cache.put("/", res.clone());
    return res;
  });
  try {
    return await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), NAV_TIMEOUT_MS)),
    ]);
  } catch {
    const cached = await cache.match("/");
    if (cached) {
      network.catch(() => {}); // let the in-flight request finish and refresh the cache
      return cached;
    }
    return network;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || refresh;
}
