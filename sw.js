const CACHE = 'gyankrida-v1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'logo.png', 'gyankrida-extras.js', 'gyankrida-ncert.js'];
const EXTERNAL = ['https://cdn.tailwindcss.com/3.4.17']; // styling script, saved so the design also works offline
const WAIT_MS = 4000; // on a slow network, use the saved copy after 4 seconds

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // one missing file must not break offline mode, so each file is added on its own
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await Promise.all(EXTERNAL.map(async u => {
      try { await c.put(u, await fetch(new Request(u, { mode: 'no-cors' }))); } catch (_) {}
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    });
    net.catch(() => {});
    try {
      return await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('slow')), WAIT_MS))]);
    } catch (_) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try { return await net; } catch (__) {
        if (req.mode === 'navigate') return (await cache.match('index.html')) || (await cache.match('./'));
        return Response.error();
      }
    }
  })());
});
