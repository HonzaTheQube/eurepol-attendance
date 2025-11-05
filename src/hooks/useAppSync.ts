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
      useActionQueueStore.setState({ 
        isProcessing: false,
        processingStartTime: undefined
      });
      
      // Malý delay pro stabilizaci připojení
      const timeoutId = setTimeout(() => {
        console.log(`🚀 Spouštím zpracování ${queue.length} čekajících akcí...`);
        processActionQueue().catch(error => {
          console.error('❌ Chyba při zpracování fronty po obnovení připojení:', error);
          // Uvolnit lock při chybě
          useActionQueueStore.setState({ 
            isProcessing: false,
            processingStartTime: undefined
          });
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
        useActionQueueStore.setState({ 
          isProcessing: false,
          processingStartTime: undefined
        });
      });
    }
  }, [queue.length, isOnline, isLoaded, isInitialized, isProcessing, processActionQueue]);

  // NOVÉ: Pravidelná kontrola fronty (každých 60 sekund)
  useEffect(() => {
    if (!isInitialized || !isLoaded) return;

    const periodicCheck = () => {
      const queueState = useActionQueueStore.getState();
      const appState = useAppStore.getState();
      
      // 🚨 KRITICKÉ: Safety timeout pro zaseknutý processing lock
      const PROCESSING_TIMEOUT = 5 * 60 * 1000; // 5 minut
      
      if (queueState.isProcessing && queueState.processingStartTime) {
        const elapsed = Date.now() - queueState.processingStartTime;
        const elapsedMinutes = (elapsed / 1000 / 60).toFixed(1);
        
        console.log(`⏱️ Processing lock aktivní: ${elapsedMinutes} minut`);
        
        if (elapsed > PROCESSING_TIMEOUT) {
          console.error('🚨 KRITICKÉ: Processing lock zaseknutý více než 5 minut!');
          console.error('🔓 FORCE UNLOCK - uvolňuji lock a pokusím se zpracovat frontu znovu');
          console.error('📊 Debug info:', {
            processingStartTime: new Date(queueState.processingStartTime).toLocaleString('cs-CZ'),
            elapsed: `${elapsedMinutes} minut`,
            queueLength: queueState.queue.length
          });
          
          // FORCE UNLOCK
          useActionQueueStore.setState({ 
            isProcessing: false,
            processingStartTime: undefined
          });
          
          // Zkus zpracovat frontu znovu
          if (appState.isOnline && queueState.queue.length > 0) {
            console.log('🔄 Pokus o zpracování fronty po force unlock...');
            processActionQueue().catch(error => {
              console.error('❌ Chyba při zpracování po force unlock:', error);
            });
          }
          
          return; // Ukonči tuto kontrolu
        }
      }
      
      // Normální periodická kontrola fronty
      if (appState.isOnline && queueState.queue.length > 0 && !queueState.isProcessing) {
        console.log(`⏰ Periodická kontrola fronty: ${queueState.queue.length} akcí čeká na zpracování`);
        processActionQueue().catch(error => {
          console.error('❌ Chyba při periodické kontrole fronty:', error);
          // Uvolnit lock při chybě
          useActionQueueStore.setState({ 
            isProcessing: false,
            processingStartTime: undefined
          });
        });
      }
    };

    // Kontrola každých 60 sekund
    const intervalId = setInterval(periodicCheck, 60000);
    
    // První kontrola hned po startu (pro detekci zaseknutého locku z předchozí session)
    setTimeout(() => {
      const queueState = useActionQueueStore.getState();
      if (queueState.isProcessing) {
        console.warn('🔒 Processing lock je aktivní po startu aplikace - možný zaseknutý lock z předchozí session');
        console.log('🔓 Uvolňuji lock...');
        useActionQueueStore.setState({ 
          isProcessing: false,
          processingStartTime: undefined
        });
      }
    }, 2000); // 2 sekundy po startu
    
    return () => clearInterval(intervalId);
  }, [isInitialized, isLoaded, processActionQueue]);

  // NOVÉ: Kontrola při focus window (uživatel se vrátil k aplikaci)
  useEffect(() => {
    if (!isInitialized || !isLoaded) return;

    const handleFocus = () => {
      const queueState = useActionQueueStore.getState();
      const isCurrentlyOnline = useAppStore.getState().isOnline;
      
      console.log('👁️ Window focus - kontrola fronty a processing lock');
      
      // Kontrola zaseknutého locku (může být z předchozí session před focus-out)
      if (queueState.isProcessing && queueState.processingStartTime) {
        const elapsed = Date.now() - queueState.processingStartTime;
        if (elapsed > 5 * 60 * 1000) { // 5 minut
          console.warn('🔓 Focus: Detekován zaseknutý lock, uvolňuji...');
          useActionQueueStore.setState({ 
            isProcessing: false,
            processingStartTime: undefined
          });
        }
      }
      
      // Normální kontrola fronty
      if (isCurrentlyOnline && queueState.queue.length > 0 && !queueState.isProcessing) {
        console.log(`📋 Window focus - fronta: ${queueState.queue.length} akcí`);
        processActionQueue().catch(error => {
          console.error('❌ Chyba při focus kontrole fronty:', error);
          // Uvolnit lock při chybě
          useActionQueueStore.setState({ 
            isProcessing: false,
            processingStartTime: undefined
          });
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

  // ✅ NOVÉ: Denní cleanup starých akcí (které překročily maxAttempts)
  useEffect(() => {
    if (!isInitialized || !isLoaded) return;

    const dailyCleanup = async () => {
      console.log('🧹 DENNÍ CLEANUP - mazání starých akcí které vyčerpaly pokusy...');
      
      try {
        const { storageService } = await import('../services/storage');
        
        // Smaž akce starší než 48 hodin které vyčerpaly všechny pokusy
        const removed = await storageService.cleanupOldActions(48);
        
        if (removed > 0) {
          console.log(`✅ Cleanup dokončen: Vymazáno ${removed} starých akcí`);
        } else {
          console.log('✅ Cleanup dokončen: Žádné staré akce k vymazání');
        }
        
        // Zobraz statistiky po cleanupu
        const queue = useActionQueueStore.getState().queue;
        const failedActions = queue.filter(a => a.attempts >= a.maxAttempts);
        
        if (failedActions.length > 0) {
          console.warn(`⚠️ Pozor: ${failedActions.length} akcí stále čeká (vyčerpaly pokusy ale mladší než 48h)`);
        }
        
      } catch (error) {
        console.error('❌ Chyba při cleanup starých akcí:', error);
      }
    };

    // První cleanup za 10 minut po startu, pak každých 24 hodin
    const initialDelay = 10 * 60 * 1000; // 10 minut
    const dailyInterval = 24 * 60 * 60 * 1000; // 24 hodin
    
    const timeoutId = setTimeout(() => {
      dailyCleanup(); // První cleanup
      
      // Pak opakuj každých 24 hodin
      const intervalId = setInterval(dailyCleanup, dailyInterval);
      
      // Cleanup při unmount
      return () => clearInterval(intervalId);
    }, initialDelay);
    
    return () => clearTimeout(timeoutId);
  }, [isInitialized, isLoaded]);

}