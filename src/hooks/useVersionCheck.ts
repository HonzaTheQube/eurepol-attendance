import { useEffect } from 'react';
import { APP_VERSION } from '../version';

const VERSION_KEY = 'app-version';
const FORCE_UPDATE_DONE_KEY = 'force-update-done';

export function useVersionCheck() {
  useEffect(() => {
    const checkVersion = async () => {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      const forceUpdateDone = sessionStorage.getItem(FORCE_UPDATE_DONE_KEY);
      
      console.log('🔍 Version check:', {
        current: APP_VERSION,
        stored: storedVersion,
        forceUpdateDone
      });
      
      // První spuštění nebo nová verze
      if (!storedVersion) {
        console.log('ℹ️ První spuštění aplikace');
        localStorage.setItem(VERSION_KEY, APP_VERSION);
        return;
      }
      
      // Detekce starší verze
      if (storedVersion !== APP_VERSION && !forceUpdateDone) {
        console.warn('⚠️ STARÁ VERZE DETEKOVÁNA!');
        console.log(`📦 Stored: ${storedVersion} → Current: ${APP_VERSION}`);
        
        // Označ že force update probíhá (aby se neopakoval)
        sessionStorage.setItem(FORCE_UPDATE_DONE_KEY, 'true');
        
        try {
          console.log('🧹 Čistím starou cache...');
          
          // 1. Unregister starý Service Worker
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
              console.log('🗑️ Service Worker unregistrován');
            }
          }
          
          // 2. Vyčisti všechny cache (kromě IndexedDB!)
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              await caches.delete(cacheName);
              console.log(`🗑️ Cache smazána: ${cacheName}`);
            }
          }
          
          // 3. Aktualizuj verzi
          localStorage.setItem(VERSION_KEY, APP_VERSION);
          
          console.log('✅ Stará cache vyčištěna - refreshuji...');
          
          // 4. Hard reload
          setTimeout(() => {
            window.location.reload();
          }, 500);
          
        } catch (error) {
          console.error('❌ Chyba při force update:', error);
          // Zkus alespoň refresh
          window.location.reload();
        }
      } else if (storedVersion !== APP_VERSION && forceUpdateDone) {
        // Force update už proběhl, jen aktualizuj verzi
        localStorage.setItem(VERSION_KEY, APP_VERSION);
        sessionStorage.removeItem(FORCE_UPDATE_DONE_KEY);
        console.log(`✅ Aplikace aktualizována na verzi ${APP_VERSION}`);
      }
    };
    
    // Spusť check po 2 sekundách (po inicializaci)
    const timeoutId = setTimeout(checkVersion, 2000);
    
    return () => clearTimeout(timeoutId);
  }, []);
}

