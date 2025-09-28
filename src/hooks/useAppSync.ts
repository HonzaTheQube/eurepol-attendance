import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { useActionQueueStore } from '../store';

export function useAppSync() {
  const { 
    initializeCacheFirst,
    processActionQueue,
    isInitialized,
    isOnline
  } = useAppStore();
  
  const { queue, isLoaded, isProcessing } = useActionQueueStore();
  
  const isInitializedRef = useRef<boolean>(false);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);

  // Inicializace CACHE-FIRST aplikace při každém spuštění/refreshi
  useEffect(() => {
    if (!isInitializedRef.current && !initializationPromiseRef.current) {
      console.log('⚡ Spouštím CACHE-FIRST inicializaci...');
      isInitializedRef.current = true;
      initializationPromiseRef.current = initializeCacheFirst();
    }
  }, [initializeCacheFirst]);

  // KRITICKÉ: Při obnovení připojení zpracuj čekající frontu!
  useEffect(() => {
    if (isOnline && isInitialized && queue.length > 0 && isLoaded && !isProcessing) {
      console.log(`🔥 PŘIPOJENÍ OBNOVENO! Čekám 2s před zpracováním ${queue.length} akcí...`);
      
      // Uvolnit možný zaseknutý lock před zpracováním
      useActionQueueStore.setState({ isProcessing: false });
      
      // Malý delay pro stabilizaci připojení
      const timeoutId = setTimeout(() => {
        console.log(`🚀 Spouštím zpracování ${queue.length} čekajících akcí...`);
        processActionQueue().catch(error => {
          console.error('❌ Chyba při zpracování fronty po obnovení připojení:', error);
          // Uvolnit lock při chybě
          useActionQueueStore.setState({ isProcessing: false });
        });
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline]); // Reaguj POUZE na změnu online stavu!

  // Zpracování action queue při změnách
  useEffect(() => {
    if (isOnline && queue.length > 0 && isLoaded && isInitialized && !isProcessing) {
      console.log(`🔄 Zpracovávám ${queue.length} akcí ve frontě...`);
      processActionQueue().catch(error => {
        console.error('❌ Chyba při zpracování action queue:', error);
        // Uvolnit lock při chybě
        useActionQueueStore.setState({ isProcessing: false });
      });
    }
  }, [queue.length, isOnline, isLoaded, isInitialized, isProcessing, processActionQueue]);

  // NOVÉ: Pravidelná kontrola fronty (každých 60 sekund)
  useEffect(() => {
    if (!isInitialized || !isLoaded) return;

    const periodicCheck = () => {
      const queueState = useActionQueueStore.getState();
      const appState = useAppStore.getState();
      
      // Safety: Uvolnit zaseknutý lock (po 5 minutách)
      const PROCESSING_TIMEOUT = 5 * 60 * 1000; // 5 minut
      if (queueState.isProcessing) {
        console.log('⚠️ Processing lock je aktivní - kontrola timeoutu...');
        // Poznámka: Pro plnou implementaci by bylo potřeba timestamp kdy začal processing
        // Pro teď pouze logujeme - v produkci by měl být timeout mechanismus
      }
      
      if (appState.isOnline && queueState.queue.length > 0 && !queueState.isProcessing) {
        console.log(`⏰ Periodická kontrola fronty: ${queueState.queue.length} akcí čeká na zpracování`);
        processActionQueue().catch(error => {
          console.error('❌ Chyba při periodické kontrole fronty:', error);
          // Uvolnit lock při chybě
          useActionQueueStore.setState({ isProcessing: false });
        });
      }
    };

    // Kontrola každých 60 sekund
    const intervalId = setInterval(periodicCheck, 60000);
    
    return () => clearInterval(intervalId);
  }, [isInitialized, isLoaded, processActionQueue]);

  // NOVÉ: Kontrola při focus window (uživatel se vrátil k aplikaci)
  useEffect(() => {
    if (!isInitialized || !isLoaded) return;

    const handleFocus = () => {
      const currentQueue = useActionQueueStore.getState().queue;
      const isCurrentlyOnline = useAppStore.getState().isOnline;
      
      if (isCurrentlyOnline && currentQueue.length > 0 && !useActionQueueStore.getState().isProcessing) {
        console.log(`👁️ Window focus - kontrola fronty: ${currentQueue.length} akcí`);
        processActionQueue().catch(error => {
          console.error('❌ Chyba při focus kontrole fronty:', error);
          // Uvolnir lock při chybě
          useActionQueueStore.setState({ isProcessing: false });
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isInitialized, isLoaded, processActionQueue]);

  // BEZPEČNÁ hodinová synchronizace metadat (ne pracovních stavů)
  useEffect(() => {
    if (!isInitialized) return;

    const hourlyMetadataSync = async () => {
      console.log('⏰ HODINOVÁ METADATA SYNC - aktualizuji jen jména a aktivity...');
      
      const { syncWithAPI } = useAppStore.getState();
      syncWithAPI().catch(error => {
        console.error('❌ Chyba při hodinové metadata sync:', error);
      });
    };

    // Spusť první sync za 1 hodinu, pak každou hodinu
    const intervalId = setInterval(hourlyMetadataSync, 60 * 60 * 1000); // 1 hodina
    
    return () => clearInterval(intervalId);
  }, [isInitialized]);

}