const CACHE_SHELL = 'vistoria-shell-v10';
const CACHE_API = 'vistoria-api-v1';
const CACHE_FOTOS = 'vistoria-fotos-v1';
const APP_VERSION = '3.7.2';

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

  // Skip non-http(s) requests (chrome-extension://, etc)
  if (!event.request.url.startsWith('http')) {
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
          .catch(() => cached || new Response(offlinePage(), { headers: { 'Content-Type': 'text/html' } }));
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_SHELL).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((resp) => {
          if (resp.ok && event.request.url.startsWith('http')) cache.put(event.request, resp.clone());
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Offline fallback page
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sem conexao - Vistoria Cyble</title>
  <style>
    body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; line-height: 1.6; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>Sem conexao com a internet</h1>
    <p>Suas fotos estao salvas no celular. Quando a conexao voltar, elas serao enviadas automaticamente.</p>
  </div>
</body>
</html>`;
}

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

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Vistoria Cyble', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'vistoria-cyble',
        renotify: true,
        data: data.url || '/',
      })
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification('Vistoria Cyble', {
        body: event.data.text(),
        icon: '/icon-192.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data || '/');
    })
  );
});
