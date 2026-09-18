// Minimal app-shell cache so a cold reload with zero signal (the "no
// underground signal" scenario in the brief) still loads the UI, which can
// then show whatever ticket is already in localStorage. Deliberately
// narrow: only same-origin GET requests are touched, and /api/* is never
// cached -- a live-vs-demo data badge that came from a stale cache instead
// of a real request would be exactly the kind of "mocked data presented as
// live" the brief penalises.
const CACHE = "scc-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave map tiles / cross-origin alone
  if (url.pathname.startsWith("/api/")) return; // never cache API responses

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const shell = await caches.match("/index.html");
          if (shell) return shell;
        }
        throw new Error("offline and not cached");
      }),
  );
});
