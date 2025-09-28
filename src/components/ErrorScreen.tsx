import { AlertTriangle, RefreshCw, Home, Info, UserX } from 'lucide-react';
import { useAppStore } from '../store';

interface ErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  const { setCurrentScreen, setError } = useAppStore();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Výchozí retry - vyčistí error a vrátí na welcome
      setError(undefined);
      setCurrentScreen('welcome');
    }
  };

  const handleReturnHome = () => {
    setError(undefined);
    setCurrentScreen('welcome');
  };

  // Detekce typu chyby
  const isEmployeeNotFound = message?.toLowerCase().includes('nenalezen') || 
                            message?.toLowerCase().includes('not found');

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-950">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
      
      {/* Content */}
      <div className="relative h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="glass-card p-8 text-center">
            {/* Error ikona */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                {isEmployeeNotFound ? (
                  <UserX className="w-10 h-10 text-red-400" />
                ) : (
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                )}
              </div>
            </div>

            {/* Hlavní nadpis */}
            <h1 className="text-2xl font-bold text-white mb-4">
              {isEmployeeNotFound ? 'Zaměstnanec nenalezen' : 'Chyba'}
            </h1>

            {/* Error zpráva */}
            <div className="mb-8">
              <p className="text-lg text-gray-300 mb-4">
                {message || 'Došlo k neočekávané chybě'}
              </p>

              {/* Detailní error info */}
              {!isEmployeeNotFound && (
                <div className="bg-red-500/10 border border-red-400/20 rounded-lg p-4">
                  <p className="text-sm text-red-300">
                    Aplikace nemohla dokončit požadovanou operaci. Zkuste to prosím znovu.
                  </p>
                </div>
              )}
            </div>

            {/* Akční tlačítka */}
            <div className="space-y-4">
              <button
                onClick={handleRetry}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Zkusit znovu
              </button>

              <button
                onClick={handleReturnHome}
                className="w-full py-3 px-6 glass-card text-gray-300 hover:text-white font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Zpět na hlavní obrazovku
              </button>
            </div>

            {/* Nápověda */}
            <div className="mt-8">
              <div className="glass-card p-4 bg-slate-800/30">
                <h3 className="font-semibold text-white mb-3 flex items-center justify-center gap-2">
                  <Info className="w-4 h-4" />
                  Co můžete zkusit:
                </h3>
                <ul className="text-sm text-gray-300 space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 mt-0.5">•</span>
                    <span>{isEmployeeNotFound ? 'Ověřte správnost NFC čipu' : 'Zkontrolujte internetové připojení'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 mt-0.5">•</span>
                    <span>{isEmployeeNotFound ? 'Zkuste jiný NFC čip' : 'Obnovte stránku v prohlížeči'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 mt-0.5">•</span>
                    <span>{isEmployeeNotFound ? 'Použijte ruční výběr ze seznamu' : 'Zkuste znovu za chvilku'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 mt-0.5">•</span>
                    <span>Kontaktujte správce systému</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
