self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intentionally no fetch handler or runtime cache. Authenticated ERP/API data
// must always continue through the browser and existing application API layer.
