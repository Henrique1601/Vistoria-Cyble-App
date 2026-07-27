const CACHE_SHELL = 'vistoria-shell-v4';
const CACHE_API = 'vistoria-api-v1';
const CACHE_FOTOS = 'vistoria-fotos-v1';
const APP_VERSION = '3.4.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const KEEP = new Set([CACHE_SHELL, CACHE_API, CACHE_FOTOS]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // API calls: network-first com cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_API).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation (app shell): stale-while-revalidate
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_SHELL).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((resp) => {
            if (resp.ok) cache.put(event.request, resp.clone());
            return resp;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Static assets: stale-while-revalidate (sempre busca versao nova em background)
  event.respondWith(
    caches.open(CACHE_SHELL).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((resp) => {
          if (resp.ok) cache.put(event.request, resp.clone());
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Mensagens do app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'checkVersion') {
    fetch('/api/version')
      .then((r) => r.json())
      .then((data) => {
        const hasUpdate = data.version !== APP_VERSION;
        self.clients.matchAll().then((clients) => {
          for (const client of clients) {
            client.postMessage({
              type: 'versionCheck',
              hasUpdate,
              currentVersion: APP_VERSION,
              latestVersion: data.version,
            });
          }
        });
      })
      .catch(() => {
        self.clients.matchAll().then((clients) => {
          for (const client of clients) {
            client.postMessage({
              type: 'versionCheck',
              hasUpdate: false,
              currentVersion: APP_VERSION,
              latestVersion: APP_VERSION,
            });
          }
        });
      });
  }

  // Trigger background sync from app
  if (event.data === 'requestSync') {
    self.registration.sync.register('sync-fotos').catch(() => {});
  }
});

// Background Sync - trigger when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-fotos') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'syncTriggered' });
        }
      })
    );
  }
});
