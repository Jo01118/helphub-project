self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // basic pass-through fetch to satisfy PWA requirements
  // We don't need offline caching just yet, only the SW presence
  e.respondWith(fetch(e.request).catch(() => new Response("Network error.")));
});
