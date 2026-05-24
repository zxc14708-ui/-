const CACHE = 'portfolio-v1';
const PRECACHE = [
  '/-/',
  '/-/index.html',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only handle GET requests for same-origin assets
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Let API/proxy requests pass through uncached
  if (!url.origin.includes(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok && url.pathname.startsWith('/-/')) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached ?? fresh;
    })
  );
});
