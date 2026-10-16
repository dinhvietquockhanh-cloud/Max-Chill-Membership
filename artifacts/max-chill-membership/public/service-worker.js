self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (
    request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin ||
    /(?:^|\/)api(?:\/|$)/.test(requestUrl.pathname)
  ) {
    return;
  }

  // Forward page and asset requests only. Never cache member or visit data.
  event.respondWith(fetch(request));
});
