// Service Worker for Web Push Notifications
// This file handles push notifications even when the app is closed

console.log('[Service Worker] Service Worker script loaded and ready');

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);
  console.log('[Service Worker] Push event data:', event.data);
  console.log('[Service Worker] Push event type:', event.type);

  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  try {
    console.log('[Service Worker] Attempting to parse JSON data');
    const data = event.data.json();
    console.log('[Service Worker] Parsed data:', data);
    const { title, body, icon, badge, tag, data: notificationData } = data;

    const options = {
      body: body || 'New notification',
      icon: icon || '/barrel-logo.png',
      badge: badge || '/barrel-logo.png',
      tag: tag || 'barrel-delivery-notification',
      data: notificationData || {},
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Open',
        },
        {
          action: 'close',
          title: 'Close',
        },
      ],
    };

    console.log('[Service Worker] Showing notification with title:', title || 'Barrel Delivery');
    event.waitUntil(
      self.registration.showNotification(title || 'Barrel Delivery', options).then(() => {
        console.log('[Service Worker] Notification displayed successfully');
      }).catch((error) => {
        console.error('[Service Worker] Failed to show notification:', error);
      })
    );
  } catch (error) {
    console.error('[Service Worker] Error handling push notification:', error);
    console.error('[Service Worker] Error stack:', error instanceof Error ? error.stack : 'No stack');
    // Fallback: show a simple notification
    console.log('[Service Worker] Attempting fallback notification');
    event.waitUntil(
      self.registration.showNotification('Barrel Delivery', {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/barrel-logo.png',
      }).then(() => {
        console.log('[Service Worker] Fallback notification displayed successfully');
      }).catch((fallbackError) => {
        console.error('[Service Worker] Failed to show fallback notification:', fallbackError);
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  console.log('[Service Worker] Click action:', event.action);
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';
  const fullUrl = targetUrl.startsWith('http') ? targetUrl : self.location.origin + targetUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      console.log('[Service Worker] Found', clientList.length, 'clients');
      // Check if there's already a window/tab open for this app
      for (const client of clientList) {
        // Check if the client is on the same origin
        if (client.url.startsWith(self.location.origin)) {
          console.log('[Service Worker] Navigating existing client to:', fullUrl);
          // Navigate to the target URL
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        console.log('[Service Worker] Opening new window to:', fullUrl);
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  console.log('[Service Worker] Claiming all clients');
  event.waitUntil(clients.claim().then(() => {
    console.log('[Service Worker] All clients claimed');
  }));
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  console.log('[Service Worker] Skipping waiting period');
  self.skipWaiting();
});
