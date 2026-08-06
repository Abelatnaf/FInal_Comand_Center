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

// A reminder that arrives when the app is closed. The payload is written by
// the send route; the fallbacks exist because a push with no data at all is a
// legal thing for a push service to deliver, and showing nothing would look
// like a bug from the outside.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Command Deck";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "Something's due soon.",
      icon: "/icons/192",
      badge: "/icons/192",
      // Same tag means a newer reminder replaces the older one rather than
      // stacking three copies of "rent is due" in the tray.
      tag: payload.tag || "due-soon",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus a tab that's already open rather than opening a fourth copy of
      // the app.
      for (const client of clientList) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (clientList.length > 0 && "focus" in clientList[0]) {
        await clientList[0].focus();
        return clientList[0].navigate(target);
      }
      return self.clients.openWindow(target);
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
