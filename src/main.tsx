import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { appConfig } from './services/config'

// 🔒 SECURE PWA Service Worker registrace with environment variables
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered:', registration);
      
      // 🔒 SECURE: Send env variables to Service Worker
      const sendConfig = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SW_CONFIG',
            config: {
              apiBaseUrl: appConfig.api.baseUrl,
              completionWebhookUrl: appConfig.api.endpoints.completionWebhook,
              initialDataUrl: appConfig.api.endpoints.getInitialData
            }
          });
          console.log('🔒 Config sent to Service Worker');
        }
      };
      
      // Send config immediately if SW is already controlling
      if (navigator.serviceWorker.controller) {
        sendConfig();
      }
      
      // Send config when SW becomes controller
      navigator.serviceWorker.addEventListener('controllerchange', sendConfig);
      
      // Update handler
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New Service Worker available');
              // Send config to new SW
              sendConfig();
            }
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// DEBUG: Vystavit funkce pro testování v konzoli (pouze v dev mode)
if (import.meta.env.DEV) {
  const exposeDebugFunctions = async () => {
    const { useAppStore } = await import('./store');
    const { storageService } = await import('./services/storage');
    
    (window as any).debugApp = {
      // Reset IndexedDB pro testování první inicializace
      resetDB: () => {
        console.log('🧹 Resetuji IndexedDB...');
        console.log('DEBUG: resetIndexedDB not available');
      },
      
      // Force API refresh (ignoruje cache)
      forceRefresh: () => {
        console.log('🔄 FORCE: Načítám fresh data z API...');
        return useAppStore.getState().initializeCacheFirst();
      },
      
      // Debug info o lokální databázi
      getDebugInfo: async () => {
        const debugInfo = await storageService.getLocalFirstDebugInfo();
        console.table(debugInfo);
        return debugInfo;
      },
      
      // Zobraz všechny zaměstnance v lokální databázi
      showEmployees: () => {
        const { localEmployees } = useAppStore.getState();
        console.log('👥 Lokální zaměstnanci:');
        if (localEmployees.size === 0) {
          console.log('📭 Žádní zaměstnanci v lokální databázi');
          return [];
        }
        localEmployees.forEach((state, id) => {
          console.log(`${state.fullName} (${id}): ${state.isAtWork ? '🟢 v práci' : '🔴 volný'}`);
        });
        return Array.from(localEmployees.values());
      },
      
      // Spusť první sync
      firstSync: () => {
        console.log('🔄 Spouštím první sync...');
        return useAppStore.getState().syncWithAPI();
      },
      
      // Zpracuj action queue manuálně
      processQueue: () => {
        console.log('⚡ Manuálně spouštím zpracování action queue...');
        return useAppStore.getState().processActionQueue();
      },
      
      // Vyčisti action queue
      clearQueue: () => {
        console.log('🗑️ DEBUG: clearQueue not available');
      },
      
      // Zobraz aktuální frontu
      showQueue: () => {
        console.log(`📋 DEBUG: showQueue not available`);
        return { queue: [], isProcessing: false };
      },
      
      // Force unlock processing (emergency)
      forceUnlock: () => {
        console.log('🔓 DEBUG: forceUnlock not available');
      },
      
      // Info o posledním sync
      getLastSync: () => {
        const { lastSync } = useAppStore.getState();
        const lastSyncDate = lastSync ? new Date(lastSync) : null;
        console.log('📅 Poslední sync:', lastSyncDate?.toLocaleString('cs-CZ') || 'Nikdy');
        const timeSinceSync = lastSyncDate ? (Date.now() - lastSyncDate.getTime()) / 1000 : null;
        console.log('⏱️ Čas od posledního sync:', timeSinceSync ? `${Math.round(timeSinceSync)}s` : 'N/A');
        return { lastSync, timeSinceSync };
      },
      
      // Test background sync timing
      testBackgroundSync: async () => {
        console.log('⏳ Testuji background sync...');
        const start = Date.now();
        try {
          await useAppStore.getState().syncWithAPI();
          console.log(`✅ Background sync dokončen za ${(Date.now() - start) / 1000}s`);
        } catch (error) {
          console.log(`❌ Background sync selhal za ${(Date.now() - start) / 1000}s:`, error);
        }
      },
      
      // Testování offline/online stavů
      goOffline: () => {
        console.log('📵 Simuluji offline stav...');
        useAppStore.getState().setOnline(false);
        window.dispatchEvent(new Event('offline'));
      },
      
      goOnline: () => {
        console.log('🌐 Simuluji online stav...');
        useAppStore.getState().setOnline(true);
        window.dispatchEvent(new Event('online'));
      },
      
      // Zobraz frontu akcí (duplicate function fixed)
      showQueueDetailed: async () => {
        const { localEmployees } = useAppStore.getState();
        console.log(`📋 DEBUG: showQueueDetailed - employees: ${localEmployees.size}`);
      },
      
      // Test refresh persistence
      testRefreshPersistence: async () => {
        const { localEmployees } = useAppStore.getState();
        
        console.log('🧪 TEST: Aktuální lokální stavy před refresh:');
        Array.from(localEmployees.values()).forEach(emp => {
          if (emp.isAtWork) {
            console.log(`👤 ${emp.fullName}: V PRÁCI (${emp.attendanceStart ? new Date(emp.attendanceStart).toLocaleTimeString('cs-CZ') : 'bez času'})`);
          }
        });
        
        console.log(`📋 Action queue: DEBUG mode`);
        
        console.log('🔄 Proveďte refresh stránky a zkontrolujte, zda se stav zachová!');
      },
      
      // Trigger background sync přes Service Worker
      triggerBackgroundSync: () => {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then(registration => {
            console.log('🔄 Registruji background sync...');
            return (registration as any).sync.register('attendance-actions');
          }).then(() => {
            console.log('✅ Background sync registrován');
          }).catch(error => {
            console.error('❌ Background sync failed:', error);
          });
        } else {
          console.warn('⚠️ Background sync není podporován');
        }
      }
    };
    
  console.log('🔧 DEBUG funkce dostupné v konzoli jako window.debugApp:');
  console.log('• debugApp.resetDB() - resetuje IndexedDB pro test první spuštění');
  console.log('• debugApp.forceRefresh() - 🔄 FORCE refresh aplikace');
  console.log('• debugApp.getDebugInfo() - info o lokální databázi');
  console.log('• debugApp.showEmployees() - zobrazí všechny zaměstnance');
  console.log('• debugApp.firstSync() - spustí FULL sync s API');
  console.log('• debugApp.getLastSync() - info o posledním sync');
  console.log('• debugApp.testBackgroundSync() - test background sync timing');
  console.log('• debugApp.processQueue() - ⚡ ZPRACUJE ACTION QUEUE!');
  console.log('• debugApp.showQueue() - zobrazí aktuální frontu');
  console.log('• debugApp.clearQueue() - vyčistí action queue');
  console.log('• debugApp.forceUnlock() - 🔓 emergency unlock processing');
  console.log('• debugApp.triggerBackgroundSync() - spustí Service Worker background sync');
  };
  
  // Počkej na load a pak vystavit debug funkce
  setTimeout(exposeDebugFunctions, 1000);
}
