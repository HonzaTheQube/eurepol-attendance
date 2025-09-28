/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// 🔒 SECURE: Environment variables storage
interface SwConfig {
  apiBaseUrl: string;
  completionWebhookUrl: string;
  initialDataUrl: string;
}

let swConfig: SwConfig | null = null;

// Listen for config from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SW_CONFIG') {
    swConfig = event.data.config;
    console.log('🔒 SW: Config received from main app');
  }
});

// Workbox precaching
precacheAndRoute(self.__WB_MANIFEST);

// Clean old assets
self.skipWaiting();
clientsClaim();

// App Shell
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }: { request: Request; url: URL }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL('/index.html')
);

// 🔒 SECURE: API Cache Strategy - Make.com endpoints (base URL OK, specific webhooks from env)
registerRoute(
  ({ url }) => url.hostname === 'hook.eu2.make.com',
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5, // 5 minutes
      }),
    ],
  })
);

// Static Assets Cache
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'worker',
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Images Cache
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// 🚀 BACKGROUND SYNC for Action Queue
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'attendance-actions') {
    console.log('🔄 SW: Background sync triggered');
    event.waitUntil(processActionQueue());
  }
});

/**
 * 🔒 SECURE: Zpracování action queue s environment variables
 */
async function processActionQueue() {
  console.log('📤 SW: Začínám zpracování action queue...');
  
  // Check if we have config from main app
  if (!swConfig) {
    console.warn('⚠️ SW: Čekám na config od main aplikace...');
    return;
  }

  try {
    // Otevři IndexedDB
    const dbName = 'dochazka-app';
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    const storeName = 'action-queue';
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    const actions = await new Promise<any[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log(`📤 SW: Našel ${actions.length} akcí k synchronizaci`);
    
    // Zpracování každé akce s SECURE webhook URLs
    for (const action of actions) {
      if (action.attempts >= action.maxAttempts) {
        console.log('❌ SW: Akce překročila max pokusy:', action.id);
        continue;
      }
      
      try {
        console.log('📤 SW: Zpracovávám akci přes SECURE webhook:', action);
        
        let result;
        
        if (action.action === 'start') {
          // 🔒 SECURE: START using env variable webhook
          result = await fetch(swConfig.completionWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              attendanceData: {
                employeeID: action.employeeID,
                attendanceStart: action.timestamp,
                attendanceEnd: '',
                ...(action.activityID && { activityID: action.activityID })
              }
            })
          });
        } else {
          // STOP: UPDATE nebo CREATE podle attendanceID
          if (action.attendanceID) {
            // 🔒 SECURE: NORMAL STOP using env variable webhook
            result = await fetch(swConfig.completionWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update',
                attendanceData: {
                  attendanceID: action.attendanceID,
                  employeeID: action.employeeID,
                  attendanceStart: '',
                  attendanceEnd: action.timestamp,
                  ...(action.activityID && { activityID: action.activityID })
                }
              })
            });
          } else {
            // 🔒 SECURE: OFFLINE STOP using env variable webhook
            result = await fetch(swConfig.completionWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'create',
                attendanceData: {
                  employeeID: action.employeeID,
                  attendanceStart: action.attendanceStart || '',
                  attendanceEnd: action.timestamp,
                  ...(action.activityID && { activityID: action.activityID })
                }
              })
            });
          }
        }
        
        if (result.ok) {
          console.log('✅ SW: Akce úspěšně zpracována:', action.id);
          
          // Odstraň úspěšně zpracovanou akci z IndexedDB
          const writeTransaction = db.transaction([storeName], 'readwrite');
          const writeStore = writeTransaction.objectStore(storeName);
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = writeStore.delete(action.id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
          
        } else {
          throw new Error(`HTTP ${result.status}: ${result.statusText}`);
        }
        
      } catch (error) {
        console.error('❌ SW: Chyba při zpracování akce:', action.id, error);
        
        // Zvýš počet pokusů
        const updateTransaction = db.transaction([storeName], 'readwrite');
        const updateStore = updateTransaction.objectStore(storeName);
        
        const updatedAction = {
          ...action,
          attempts: action.attempts + 1
        };
        
        await new Promise<void>((resolve, reject) => {
          const updateRequest = updateStore.put(updatedAction);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        });
      }
    }
    
    db.close();
    console.log('✅ SW: Background sync dokončen');
    
  } catch (error) {
    console.error('❌ SW: Kritická chyba při background sync:', error);
  }
}

// 🔔 PUSH NOTIFICATIONS (pro budoucí použití)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nová notifikace z docházkové aplikace',
      icon: '/pwa-192x192.png',
      badge: '/masked-icon.svg',
      tag: data.tag || 'attendance-notification',
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Otevřít aplikaci'
        },
        {
          action: 'dismiss',
          title: 'Zavřít'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Docházkový systém',
        options
      )
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients: readonly WindowClient[]) => {
        // Pokud už je aplikace otevřená, focus na ni
        const client = clients.find((c) => c.visibilityState === 'visible');
        if (client) {
          client.focus();
        } else {
          // Jinak otevři novou instanci
          self.clients.openWindow('/');
        }
      })
    );
  }
});

console.log('🔒 SW: Enhanced Service Worker s SECURE environment variables načten');
