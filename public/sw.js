// Deliberately does no caching. This app is fully dynamic (live Supabase
// auth + data) and a caching service worker risks serving stale data or
// interfering with auth cookies. It exists purely so browsers consider the
// app installable — every request falls through to the network untouched.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
