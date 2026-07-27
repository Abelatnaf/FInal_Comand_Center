// Network-first, cache-as-fallback for same-origin GET requests. This is
// what makes "the app still opens" in airplane mode true: whatever was last
// successfully rendered (Now, Add, Bills, Ledger, Settings, and their
// static assets) is available offline, even though it may be stale --
// OfflineBanner is what marks it as such, not this file.
//
// POST requests (Server Actions) are deliberately left untouched here --
// queuing a failed write is handled client-side (lib/offline/*), not by
// this service worker, since replaying a Server Action correctly needs
// React context this file doesn't have.
const CACHE_NAME = "command-deck-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })()
  );
});
