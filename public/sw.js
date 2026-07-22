const CACHE_SHELL = 'vistoria-shell-v2';
const CACHE_API = 'vistoria-api-v1';
const CACHE_FOTOS = 'vistoria-fotos-v1';
const APP_VERSION = '3.1.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('vistoria-shell-v')).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Estratégia: network-first para API, cache-first para assets
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

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp.ok && event.request.destination !== 'document') {
          const clone = resp.clone();
          caches.open(CACHE_SHELL).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});

// Mensagens do app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  // Checar versão
  if (event.data === 'checkVersion') {
    fetch('/api/version')
      .then((r) => r.json())
      .then((data) => {
        const hasUpdate = data.version !== APP_VERSION;
        // Notificar todos os clients
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
        // Offline, sem atualização disponível
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
});
