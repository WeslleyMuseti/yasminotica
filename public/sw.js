// ══════════════════════════════════════════════════════════════════
// SERVICE WORKER - SISTEMA YASMIN ÓTICA (CONTINGÊNCIA OFFLINE PWA)
// Permite que o sistema abra, opere e finalize vendas mesmo sem internet!
// ══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'yasmin-otica-offline-v1';

// Recursos essenciais para inicialização da casca do aplicativo (App Shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
  '/logo-yasmin.png',
  '/logo-yasmin-transparent.png',
  '/logo-yasmin-white.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Aviso ao cachear assets estáticos no SW:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Não interceptar requisições para o Firebase / Firestore (o SDK possui persistência própria em IndexedDB)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // Requisições de Navegação (HTML da página)
  // Estratégia: Network First com Fallback para o index.html em cache se estiver offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedIndex = await cache.match('/index.html') || await cache.match('/');
        return cachedIndex || fetch(request);
      })
    );
    return;
  }

  // Arquivos estáticos empacotados (assets .js, .css, imagens, fontes)
  // Estratégia: Cache First com atualização em segundo plano (Stale-While-Revalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualiza o cache em segundo plano se tiver internet
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Se não estiver no cache, busca na rede e salva no cache
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Se falhar e for imagem, tenta fallback de logo
        if (request.destination === 'image') {
          return caches.match('/logo-yasmin.png');
        }
      });
    })
  );
});
