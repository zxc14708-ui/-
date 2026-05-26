const CACHE = 'portfolio-v3';

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/-/')) return;

  // JS/CSS assets have content hashes → cache-first (safe, immutable)
  // HTML → network-first so users always get the latest index.html
  const isAsset = /\.(js|css|png|svg|ico|woff2?)(\?|$)/.test(url.pathname);

  if (isAsset) {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached ?? fetch(e.request).then(res => {
          if (res.ok) {
            const cloned = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, cloned));
          }
          return res;
        })
      )
    );
  } else {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const cloned = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, cloned));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
