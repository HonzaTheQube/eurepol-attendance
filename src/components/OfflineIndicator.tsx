import { useEffect, useState } from 'react';
import { WifiOff, Wifi, Clock, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { useActionQueueStore } from '../store';

export function OfflineIndicator() {
  const { isOnline, lastSync } = useAppStore();
  const { queue } = useActionQueueStore();
  const [showDetails, setShowDetails] = useState(false);

  const pendingActions = queue.length;
  const failedActions = queue.filter(action => action.attempts >= action.maxAttempts).length;

  // Auto-hide details po chvíli
  useEffect(() => {
    if (showDetails) {
      const timer = setTimeout(() => {
        setShowDetails(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showDetails]);

  const formatLastSync = () => {
    if (!lastSync) return 'Nikdy';
    
    const syncDate = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Právě teď';
    if (diffMinutes < 60) return `Před ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Před ${diffHours} h`;
    
    return syncDate.toLocaleDateString('cs-CZ');
  };

  // Pokud je vše v pořádku a online, nezobrazuj nic
  if (isOnline && pendingActions === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Hlavní indikátor */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200
          ${isOnline 
            ? 'bg-blue-500 bg-opacity-90 text-white hover:bg-blue-600' 
            : 'bg-red-500 bg-opacity-90 text-white hover:bg-red-600'
          }
          ${pendingActions > 0 ? 'animate-pulse' : ''}
        `}
        aria-label={`Stav připojení: ${isOnline ? 'Online' : 'Offline'}`}
      >
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        
        {pendingActions > 0 && (
          <span className="bg-white bg-opacity-30 rounded-full px-2 py-0.5 text-xs font-medium">
            {pendingActions}
          </span>
        )}

        {failedActions > 0 && (
          <AlertCircle className="w-4 h-4 text-yellow-300" />
        )}
      </button>

      {/* Rozšířené detaily */}
      {showDetails && (
        <div className="absolute top-12 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 animate-in slide-in-from-top-2 duration-200">
          {/* Stav připojení */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="font-semibold text-gray-900">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
            `}>
              {isOnline ? 'Připojeno' : 'Odpojeno'}
            </div>
          </div>

          {/* Poslední synchronizace */}
          <div className="flex items-center justify-between mb-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Poslední sync:</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatLastSync()}
            </span>
          </div>

          {/* Fronta akcí */}
          {pendingActions > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900">Čekající akce</h4>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  {pendingActions}
                </span>
              </div>
              
              <p className="text-sm text-blue-700 mb-2">
                {pendingActions === 1 
                  ? 'Jedna akce čeká na synchronizaci'
                  : `${pendingActions} akcí čeká na synchronizaci`
                }
              </p>

              {queue.slice(0, 3).map((action) => (
                <div key={action.id} className="bg-white bg-opacity-50 rounded p-2 mb-1 last:mb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono">{action.employeeID.substring(0, 8)}...</span>
                    <span className={`
                      px-1.5 py-0.5 rounded text-xs
                      ${action.action === 'start' ? 'bg-green-200 text-green-700' : 'bg-orange-200 text-orange-700'}
                    `}>
                      {action.action === 'start' ? 'Začátek' : 'Konec'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {new Date(action.timestamp).toLocaleTimeString('cs-CZ')}
                  </div>
                </div>
              ))}

              {pendingActions > 3 && (
                <p className="text-xs text-blue-600 mt-2">
                  ... a {pendingActions - 3} dalších
                </p>
              )}
            </div>
          )}

          {/* Chybové akce */}
          {failedActions > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <h4 className="font-medium text-red-900">Chybné akce</h4>
              </div>
              
              <p className="text-sm text-red-700">
                {failedActions === 1 
                  ? 'Jedna akce selhala po několika pokusech'
                  : `${failedActions} akcí selhalo po několika pokusech`
                }
              </p>
            </div>
          )}

          {/* Status zpráva */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
            {isOnline 
              ? 'Aplikace je připojena a synchronizuje data'
              : 'Aplikace pracuje v offline režimu. Data budou synchronizována po obnovení připojení.'
            }
          </div>
        </div>
      )}
    </div>
  );
}
