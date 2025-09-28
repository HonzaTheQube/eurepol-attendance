import { useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth';
import { LoginScreen } from './LoginScreen';
import { LoadingScreen } from './LoadingScreen';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * 🔒 AUTH GUARD
 * 
 * Zabezpečuje přístup k aplikaci:
 * 1. Kontroluje autentifikaci při načtení
 * 2. Zobrazí LoginScreen pokud není přihlášen
 * 3. Chrání IndexedDB data
 * 4. Persistent session při refresh
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      console.log('🔒 AuthGuard: Kontroluji autentifikaci...');
      
      try {
        // Zkontroluj existující session
        const isAuth = authService.isAuthenticated();
        
        if (!isAuth) {
          // Není přihlášen - aktivuj ochranu dat
          await authService.protectSensitiveData();
        }
        
        setIsAuthenticated(isAuth);
        
        const sessionInfo = authService.getSessionInfo();
        console.log('🔒 Auth check result:', {
          isAuthenticated: isAuth,
          sessionInfo: isAuth ? sessionInfo : 'N/A'
        });
        
      } catch (error) {
        console.error('❌ Chyba při kontrole autentifikace:', error);
        setIsAuthenticated(false);
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuthentication();
  }, []);

  // Loading state při inicializaci
  if (isInitializing) {
    return <LoadingScreen message="Kontroluji přihlášení..." />;
  }

  // Není přihlášen - zobraz LoginScreen
  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onAuthSuccess={() => {
          console.log('✅ Úspěšné přihlášení');
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  // Je přihlášen - zobraz hlavní aplikaci
  return <>{children}</>;
}
