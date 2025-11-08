const CACHE_NAME = 'fermitoday-v0.8.5';
const BACKEND_URL = 'https://purring-celesta-fermitoday-f00679ea.koyeb.app';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_NAME);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch - Network first for API calls, cache first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Network first for API calls
  if (url.origin.includes('koyeb.app') || event.request.url.includes('/events')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache first for static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          
          return response;
        });
      })
  );
});

// ============================================
// PUSH NOTIFICATION HANDLERS (iOS Compatible)
// ============================================

// Handle push notification received (background)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'FermiToday',
    body: 'Nuova notifica',
    icon: '/icons/logo192.png',
    badge: '/icons/logo192.png',
    data: { url: '/' },
    tag: 'default',
    requireInteraction: false,
    silent: false,
    timestamp: Date.now(),
    vibrate: [200, 100, 200],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Push data:', data);
      
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        data: data.data || notificationData.data,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        timestamp: data.timestamp || Date.now(),
        vibrate: [200, 100, 200],
        actions: data.actions || [],
      };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      timestamp: notificationData.timestamp,
      vibrate: notificationData.vibrate,
      actions: notificationData.actions,
    })
  );
});

// Handle notification click (iOS compatible)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  console.log('[SW] Notification data:', event.notification.data);
  
  event.notification.close();

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      console.log('[SW] Found', clientList.length, 'clients');
      
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        console.log('[SW] Client URL:', client.url);
        
        // If we find a matching client, focus it and send message
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // Send notification data to client
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: event.notification.data
          });
          return client.focus();
        }
      }
      
      // If no matching client, open a new window
      if (clients.openWindow) {
        console.log('[SW] Opening new window:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close (optional analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Handle push subscription change (important for iOS)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  
  event.waitUntil(
    // Fetch VAPID public key from backend
    fetch(`${BACKEND_URL}/vapid-public-key`)
      .then(response => response.json())
      .then(data => {
        console.log('[SW] Got VAPID key from backend');
        
        // Get new subscription
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey)
        });
      })
      .then((newSubscription) => {
        console.log('[SW] New subscription created');
        
        // Send new subscription to your server
        return fetch(`${BACKEND_URL}/register-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSubscription
          })
        });
      })
      .then(() => {
        console.log('[SW] Subscription updated on backend');
      })
      .catch(error => {
        console.error('[SW] Error handling subscription change:', error);
      })
  );
});

// Utility function for VAPID key conversion
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }
  
  // Handle other messages
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background sync for offline actions (iOS 16.4+ limited support)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-preferences') {
    event.waitUntil(
      syncPreferences()
    );
  }
});

async function syncPreferences() {
  console.log('[SW] Syncing preferences...');
  // Placeholder for syncing preferences when back online
  return Promise.resolve();
}

// Error handling for unhandled rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

// Log when service worker is controlling the page
self.addEventListener('controllerchange', () => {
  console.log('[SW] Controller changed');
});