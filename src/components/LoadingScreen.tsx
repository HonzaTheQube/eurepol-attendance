import { Loader2, Wifi, Lightbulb } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-950">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
      
      {/* Content */}
      <div className="relative h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="glass-card p-8 text-center">
            {/* Loading spinner */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-blue-400 animate-spin" />
                <Wifi className="w-8 h-8 text-blue-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Hlavní nadpis */}
            <h1 className="text-3xl font-bold text-white mb-4">
              Načítám aplikaci
            </h1>

            {/* Zpráva */}
            <p className="text-lg text-gray-300 mb-8">
              {message || 'Synchronizuji data...'}
            </p>

            {/* Loading progress indicator */}
            <div className="max-w-xs mx-auto mb-8">
              <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full animate-[shimmer_2s_linear_infinite]"></div>
              </div>
            </div>

            {/* Detailní kroky */}
            <div className="mb-8 text-sm text-gray-300 space-y-3">
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                <span>Načítám seznam zaměstnanců</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Synchronizuji docházkové stavy</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span>Připravuji rozhraní</span>
              </div>
            </div>

            {/* Tip pro uživatele */}
            <div className="glass-card p-4 bg-slate-800/30">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <strong>Tip:</strong> Aplikace funguje i bez internetového připojení. 
                  Vaše akce budou synchronizovány po obnovení spojení.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
