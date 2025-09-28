import { useEffect } from 'react';
import { useAppStore } from './store';
import { AuthGuard } from './components/AuthGuard';
import { WelcomeScreen } from './components/WelcomeScreen';
import { EmployeeActionScreen } from './components/EmployeeActionScreen';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { ErrorScreen } from './components/ErrorScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ActivityConfirmationScreen } from './components/ActivityConfirmationScreen';
import { CategorySelectorScreen } from './components/CategorySelectorScreen';
import { ActivitySelectorScreen } from './components/ActivitySelectorScreen';
import { useAppSync } from './hooks/useAppSync';
import { useNetworkStatus } from './hooks/useNetworkStatus';

function AppContent() {
  const {
    currentScreen,
    isLoading,
    error
  } = useAppStore();

  // Inicializace synchronizace a sledování síťového stavu
  useAppSync();
  useNetworkStatus();

  // Debug informace v development
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🏠 Current screen:', currentScreen);
    }
  }, [currentScreen]);

  // Během načítání zobrazí loading screen
  if (isLoading) {
    return <LoadingScreen message="Načítám zaměstnance..." />;
  }

  // Při kritické chybě zobrazí error screen
  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Tmavé elegantní gradient pozadí */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-black"></div>
      
      {/* Statické jemné background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-400/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-400/4 rounded-full blur-3xl"></div>
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-purple-400/3 rounded-full blur-3xl"></div>
      </div>

      {/* Hlavní obsah aplikace */}
      <main className="relative z-10">
        {currentScreen === 'welcome' && <WelcomeScreen />}
        {currentScreen === 'employee-action' && <EmployeeActionScreen />}
        {currentScreen === 'confirmation' && <ConfirmationScreen />}
        {currentScreen === 'error' && <ErrorScreen />}
        {currentScreen === 'activity-confirmation' && <ActivityConfirmationScreen />}
        {currentScreen === 'category-selector' && <CategorySelectorScreen />}
        {currentScreen === 'activity-selector' && <ActivitySelectorScreen />}
      </main>

      {/* Offline indikátor - vždy viditelný v rohu */}
      <OfflineIndicator />

      {/* PWA Install Prompt - bude implementován později */}
      {/* <InstallPrompt /> */}
    </div>
  );
}

function App() {
  return (
    <AuthGuard>
      <AppContent />
    </AuthGuard>
  );
}

export default App;