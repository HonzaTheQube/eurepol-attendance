import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Pouze v production (kde je SW aktivní)
    if (!import.meta.env.PROD) return;

    const checkForUpdates = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          // Detekce nového Service Workera
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🆕 Nová verze aplikace k dispozici!');
                  setRegistration(reg);
                  setShowPrompt(true);
                }
              });
            }
          });

          // Pokud už čeká nový SW
          if (reg.waiting) {
            console.log('🆕 Nová verze aplikace už čeká!');
            setRegistration(reg);
            setShowPrompt(true);
          }
        });
      }
    };

    checkForUpdates();

    // Kontrola každou hodinu
    const intervalId = setInterval(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.update().then(() => {
            console.log('✅ Update check dokončen');
          });
        });
      }
    }, 60 * 60 * 1000); // 1 hodina

    return () => clearInterval(intervalId);
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Pošli zprávu novému SW aby převzal kontrolu
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Počkej na controllerchange a pak reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Nový Service Worker převzal kontrolu - refreshuji stránku...');
        window.location.reload();
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    console.log('ℹ️ Update prompt dismissed - uživatel aktualizuje později');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] animate-in slide-in-from-bottom-4 duration-500">
      <div className="glass-card p-4 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          {/* Ikona */}
          <div className="flex-shrink-0 p-2 bg-blue-500/10 rounded-lg">
            <Download className="w-5 h-5 text-blue-400" />
          </div>
          
          {/* Obsah */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              Nová verze k dispozici
            </h3>
            <p className="text-xs text-slate-300 mb-3">
              Je dostupná aktualizace aplikace s vylepšeními a opravami chyb.
            </p>
            
            {/* Tlačítka */}
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Aktualizovat
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Později
              </button>
            </div>
          </div>
          
          {/* Zavřít */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Zavřít"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

