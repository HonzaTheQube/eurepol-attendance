import { useState } from 'react';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { authService } from '../services/auth';
import { authConfig } from '../services/config';

interface LoginScreenProps {
  onAuthSuccess: () => void;
}

export function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.authenticate(pin);
      
      if (result.success) {
        onAuthSuccess();
      } else {
        setError(result.error || 'Chyba při přihlašování');
      }
    } catch (error) {
      setError('Systémová chyba při přihlašování');
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

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-8 text-center">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-blue-500/10 rounded-2xl border border-blue-400/20">
                <Shield className="w-16 h-16 text-blue-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-100 mb-3">
              {authConfig.appName}
            </h1>
            <p className="text-slate-300 text-lg">
              Přihlášení do systému
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                PIN kód
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Zadejte PIN"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                  autoFocus
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  disabled={isLoading}
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-400/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !pin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Přihlásit se</span>
                </>
              )}
            </button>
          </form>

          {/* Security Info */}
          <div className="mt-8 pt-6 border-t border-slate-600/30">
            <p className="text-xs text-slate-400">
              Zabezpečený přístup k docházkovému systému
            </p>
            {import.meta.env.DEV && (
              <p className="text-xs text-slate-500 mt-1">
                🔧 Vývojový režim aktivní
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
