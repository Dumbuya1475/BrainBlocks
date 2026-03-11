const CACHE = 'brainblocks-v4';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg', '/icon-maskable.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;

  if (req.method !== 'GET') return;

  const isNavigation = req.mode === 'navigate';

  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      return await fetch(req);
    } catch {
      if (isNavigation) {
        return (await caches.match('/')) || (await caches.match('/index.html'));
      }

      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
