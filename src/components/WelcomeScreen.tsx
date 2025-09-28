import { useState, useEffect } from 'react';
import { Clock, Users, CreditCard, LogOut, Settings, RefreshCw } from 'lucide-react';
import { NFCListener } from './IdentificationMethods/NFCListener';
import { ManualSelector } from './IdentificationMethods/ManualSelector';
import { authService } from '../services/auth';

export function WelcomeScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showManualSelector, setShowManualSelector] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('cs-CZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Admin menu activation (5 quick taps on time)
  const handleTimeClick = () => {
    const newCount = adminTapCount + 1;
    setAdminTapCount(newCount);
    
    if (newCount >= 5) {
      setShowAdminMenu(true);
      setAdminTapCount(0);
    }
    
    // Reset counter after 3 seconds of inactivity
    setTimeout(() => {
      if (adminTapCount === newCount) {
        setAdminTapCount(0);
      }
    }, 3000);
  };

  const handleLogout = () => {
    if (confirm('Opravdu se chcete odhlásit?')) {
      authService.logout();
      window.location.reload();
    }
  };

  const handleUpdateData = async () => {
    if (confirm('Provést aktualizaci dat ze serveru?\n\n🔄 AKTUALIZUJE:\n• Seznam zaměstnanců\n• Seznam aktivit\n• Jména a nastavení\n\n✅ ZACHOVÁ:\n• Pracovní stavy (kdo je v práci)\n• Čekající akce\n• Všechny docházkové údaje')) {
      try {
        const { useAppStore } = await import('../store');
        
        console.log('🔄 Spouštím aktualizaci metadat ze serveru...');
        
        // Zavolej syncWithAPI pro načtení fresh dat z API
        await useAppStore.getState().syncWithAPI();
        
        console.log('✅ Metadata aktualizována ze serveru - docházkové stavy zachovány');
        
        // Krátká notifikace o úspěchu
        alert('✅ Data byla úspěšně aktualizována ze serveru!');
        
      } catch (error) {
        console.error('❌ Chyba při aktualizaci dat:', error);
        alert('❌ Chyba při aktualizaci dat. Zkuste to znovu.');
      }
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden px-4 py-2 sm:px-6 sm:py-4">
      {/* Background listeners - běží automaticky na pozadí */}
      <NFCListener />

      {/* Střední sekce - nadpis, hodiny a identifikační metody */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2 sm:py-4">
        
        {/* Nadpis - responzivní velikost podle aspect ratio */}
        <div className="text-center mb-4 sm:mb-6 relative z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100 drop-shadow-2xl">
            Docházková Evidence
          </h1>
        </div>

        {/* Velké hodiny ve středu - klikatelné pro admin menu */}
        <div 
          className="time-display p-4 sm:p-6 tablet:p-8 mx-auto max-w-4xl mb-4 sm:mb-8 cursor-pointer select-none"
          style={{ maxHeight: '35vh' }}
          onClick={handleTimeClick}
        >
          <div className="flex items-center justify-center gap-3 sm:gap-4 tablet:gap-6 lg:gap-8">
            <div className="p-2 sm:p-3 tablet:p-4 lg:p-5 rounded-full bg-slate-600/30 backdrop-blur border border-slate-400/20">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 tablet:w-8 tablet:h-8 lg:w-10 lg:h-10 text-slate-300" />
            </div>
            <div className="text-4xl sm:text-6xl tablet:text-7xl lg:text-8xl font-light text-slate-100 tabular-nums tracking-tight">
              {formatTime(currentTime)}
            </div>
          </div>
          
          <div className="text-base sm:text-lg tablet:text-xl lg:text-2xl text-slate-300 font-medium mt-2 sm:mt-3 text-center">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* Identifikační metody - adaptivní velikost podle výšky */}
        <div className="w-full max-w-4xl mx-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 sm:gap-8 tablet:gap-12 h-full">
            
            {/* NFC instrukce */}
            <div className="glass-card p-4 sm:p-8 tablet:p-10 text-center hover:scale-105 transition-all duration-300 min-h-[150px] sm:min-h-[200px] tablet:min-h-[220px] flex flex-col justify-center">
              <div className="flex justify-center mb-4 sm:mb-8">
                <div className="p-4 sm:p-6 bg-blue-500/10 rounded-2xl border border-blue-400/20 min-w-[60px] min-h-[60px] sm:min-w-[80px] sm:min-h-[80px] flex items-center justify-center">
                  <CreditCard className="w-8 h-8 sm:w-12 sm:h-12 tablet:w-16 tablet:h-16 text-blue-400" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl tablet:text-3xl font-bold text-slate-100 leading-tight">
                Přiložte<br />NFC čip
              </h3>
            </div>

            {/* Manuální výběr - CELÁ KARTA KLIKATELNÁ */}
            <div 
              onClick={() => setShowManualSelector(true)}
              className="glass-card p-4 sm:p-8 tablet:p-10 text-center hover:scale-105 transition-all duration-300 min-h-[150px] sm:min-h-[200px] tablet:min-h-[220px] flex flex-col justify-center cursor-pointer"
            >
              <div className="flex justify-center mb-4 sm:mb-8">
                <div className="p-4 sm:p-6 bg-emerald-500/10 rounded-2xl border border-emerald-400/20 min-w-[60px] min-h-[60px] sm:min-w-[80px] sm:min-h-[80px] flex items-center justify-center">
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 tablet:w-16 tablet:h-16 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl tablet:text-3xl font-bold text-slate-100 leading-tight">
                Vyberte<br />z nabídky
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Manual selector modal - fullscreen */}
      {showManualSelector && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          onClick={() => setShowManualSelector(false)}
        >
          <div 
            className="glass-card w-full h-full flex flex-col relative"
            style={{ 
              borderRadius: 0, // Remove border radius for fullscreen
              margin: 0,
              padding: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ManualSelector onClose={() => setShowManualSelector(false)} />
          </div>
        </div>
      )}

      {/* Admin menu modal */}
      {showAdminMenu && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAdminMenu(false)}
        >
          <div 
            className="glass-card max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <Settings className="w-6 h-6 text-blue-400 mr-2" />
              <h3 className="text-xl font-bold text-slate-100">Admin Menu</h3>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm text-slate-300">
                Session: {authService.getSessionInfo().timeLeft} zbývá
              </div>
              
              <button
                onClick={handleUpdateData}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Aktualizace</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Odhlásit se</span>
              </button>
              
              <button
                onClick={() => setShowAdminMenu(false)}
                className="w-full py-2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

