const CACHE = "carnet-de-bord-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180-maskable.png"
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-first, since this app has zero network dependencies anyway.
self.addEventListener("fetch", (ev) => {
  if (ev.request.method !== "GET") return;
  ev.respondWith(
    caches.match(ev.request).then(cached => cached || fetch(ev.request).then(res => {
      const resClone = res.clone();
      caches.open(CACHE).then(c => c.put(ev.request, resClone));
      return res;
    }).catch(() => cached))
  );
});
