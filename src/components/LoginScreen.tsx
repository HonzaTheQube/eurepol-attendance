import { useState } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { authService } from '../services/auth';
import { authConfig } from '../services/config';
import { NumericKeypad } from './ui/NumericKeypad';

interface LoginScreenProps {
  onAuthSuccess: () => void;
}

export function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNumberClick = (num: string) => {
    if (pin.length < 10) { // Max 10 číslic
      setPin(pin + num);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (pin.length === 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.authenticate(pin);
      
      if (result.success) {
        onAuthSuccess();
      } else {
        setError(result.error || 'Chyba při přihlašování');
        // Vyčisti PIN při chybě
        setPin('');
      }
    } catch (error) {
      setError('Systémová chyba při přihlašování');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Tmavé gradient pozadí stejně jako hlavní app */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-black"></div>
      
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-400/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-400/4 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card - optimalizovaný pro tablet landscape */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-4 text-center">
          
          {/* Header - minimalistický */}
          <div className="mb-3">
            <h1 className="text-xl font-bold text-slate-100 mb-1">
              {authConfig.appName}
            </h1>
            <p className="text-slate-400 text-sm">
              Přihlášení
            </p>
          </div>

          {/* PIN Display & Keypad - kompaktní */}
          <div className="space-y-3">
            {/* PIN Display */}
            <div className="relative">
              <div className="w-full px-3 py-2 bg-slate-800/50 border-2 border-slate-600/50 rounded-lg text-center min-h-[45px] flex items-center justify-center">
                <div className="text-xl font-bold tracking-widest select-none">
                  {pin.length === 0 ? (
                    <span className="text-slate-500 text-base">Zadejte PIN</span>
                  ) : showPin ? (
                    <span className="text-slate-100">{pin}</span>
                  ) : (
                    <span className="text-slate-100">{'•'.repeat(pin.length)}</span>
                  )}
                </div>
              </div>
              
              {/* Show/Hide toggle */}
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors p-1"
                disabled={isLoading}
                aria-label={showPin ? 'Skrýt PIN' : 'Zobrazit PIN'}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2 bg-red-500/10 border border-red-400/20 rounded-lg">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            {/* Virtuální numerická klávesnice */}
            <NumericKeypad
              onNumberClick={handleNumberClick}
              onBackspace={handleBackspace}
              onSubmit={handleSubmit}
              disabled={isLoading}
            />

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center justify-center space-x-2 mt-2 text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Ověřuji...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
