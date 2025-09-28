import { useEffect } from 'react';
import { useAppStore } from '../store';

export function useNetworkStatus() {
  const { setOnline } = useAppStore();

  useEffect(() => {
    // Nastavení počátečního stavu
    setOnline(navigator.onLine);

    const handleOnline = () => {
      console.log('🌐 Připojení obnoveno');
      setOnline(true);
    };

    const handleOffline = () => {
      console.log('📵 Připojení ztraceno');
      setOnline(false);
    };

    // Event listeners pro změny síťového stavu
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodická kontrola síťového stavu (fallback)
    const checkConnection = async () => {
      try {
        // Pokus o fetch na jednoduché API
        await fetch('/favicon.ico', { 
          method: 'HEAD', 
          mode: 'no-cors',
          cache: 'no-cache'
        });
        
        if (!navigator.onLine) {
          console.log('🌐 Připojení detekováno (fallback check)');
          setOnline(true);
        }
      } catch {
        if (navigator.onLine) {
          console.log('📵 Připojení ztraceno (fallback check)');
          setOnline(false);
        }
      }
    };

    // Kontrola každých 30 sekund
    const connectionCheckInterval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionCheckInterval);
    };
  }, [setOnline]);

  // Kontrola při focus window (uživatel se vrátil k aplikaci)
  useEffect(() => {
    const handleFocus = () => {
      setOnline(navigator.onLine);
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [setOnline]);
}
