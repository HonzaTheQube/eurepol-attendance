import { useEffect, useState } from 'react';
import { Play, Square, User, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store';
import { appConfig } from '../services/config';

export function EmployeeActionScreen() {
  const { 
    selectedEmployee, 
    setCurrentScreen, 
    setSelectedEmployee,
    getEmployeeState,
    activities,
    localEmployees,
    startWork,
    stopWork
  } = useAppStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [countdown, setCountdown] = useState(Math.floor(appConfig.ui.autoReturnToWelcomeMs / 1000));

  // Aktualizace času každou minutu pro real-time odpracované hodiny
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Každou minutu

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Automatický návrat na welcome screen pokud není vybrán zaměstnanec
    if (!selectedEmployee) {
      setCurrentScreen('welcome');
    }
  }, [selectedEmployee, setCurrentScreen]);

  useEffect(() => {
    // Auto-return timer (po určité době nečinnosti)
    const timer = setTimeout(() => {
      handleBack();
    }, appConfig.ui.autoReturnToWelcomeMs);

    return () => clearTimeout(timer);
  }, []);

  // Countdown timer pro vizuální indikátor
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  const handleBack = () => {
    setSelectedEmployee(undefined);
    setCurrentScreen('welcome');
  };

  const handleAction = async () => {
    if (!selectedEmployee) return;

    console.log('🎯 Akce spuštěna - zaměstnanec:', selectedEmployee.fullName);

    // START akce - vždy stejná
    if (!selectedEmployee.isAtWork) {
      console.log('🟢 START akce - okamžitý přechod na confirmation');
      startWork(selectedEmployee.employeeID); // Bez await - async na pozadí
      
      // Okamžitě přejít na confirmation (neblokuje se na API)
      setCurrentScreen('confirmation');

      // Po zobrazení potvrzení se vrátí na welcome
      setTimeout(() => {
        setCurrentScreen('welcome');
        setSelectedEmployee(undefined);
      }, appConfig.ui.confirmationDurationMs);
      return;
    }

    // STOP akce - kontrola reportActivity
    const employeeState = getEmployeeState(selectedEmployee.employeeID);
    
    if (employeeState?.reportActivity) {
      console.log('📋 Zaměstnanec má reportActivity - přechod na activity-confirmation');
      setCurrentScreen('activity-confirmation');
    } else {
      console.log('🔴 Normální STOP bez reportActivity');
      stopWork(selectedEmployee.employeeID); // Bez await - async na pozadí
      
      // Okamžitě přejít na confirmation (neblokuje se na API)
      setCurrentScreen('confirmation');

      // Po zobrazení potvrzení se vrátí na welcome
      setTimeout(() => {
        setCurrentScreen('welcome');
        setSelectedEmployee(undefined);
      }, appConfig.ui.confirmationDurationMs);
    }
  };

  // Pokud není vybrán zaměstnanec, je to chyba - měl by být vždy načten před přechodem na tento screen
  if (!selectedEmployee) {
    console.error('❌ EmployeeActionScreen: Žádný zaměstnanec není vybrán!');
    setCurrentScreen('welcome');
    return null;
  }

  const isAtWork = selectedEmployee.isAtWork;
  const actionText = isAtWork ? 'Ukončit práci' : 'Začít práci';
  const actionIcon = isAtWork ? Square : Play;
  const ActionIcon = actionIcon;

  // Výpočet odpracovaných hodin (real-time)
  const calculateWorkedHours = () => {
    if (!selectedEmployee.attendanceStart) return null;
    
    const startTime = new Date(selectedEmployee.attendanceStart);
    const diffMs = currentTime.getTime() - startTime.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  const formatWorkStartTime = (attendanceStart: string) => {
    return new Date(attendanceStart).toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const workedTime = calculateWorkedHours();


  return (
    <div className="h-screen flex flex-col overflow-hidden px-6 py-4 relative">

      {/* Zpět tlačítko */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 p-3 text-slate-300 hover:text-slate-100 hover:bg-slate-600/30 rounded-full transition-all duration-200 backdrop-blur-sm z-20"
        aria-label="Zpět"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Střední sekce - zaměstnanec vycentrovaný */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-8">
        
        {/* Informace o zaměstnanci - vycentrované */}
        <div className="glass-card p-8 text-center max-w-3xl w-full mb-8">
          <div className="flex items-center justify-center gap-8">
            {/* Avatar - větší */}
            <div className="w-20 h-20 bg-slate-600/30 rounded-full flex items-center justify-center backdrop-blur-sm border border-slate-400/20">
              <User className="w-10 h-10 text-slate-300" />
            </div>

            {/* Jméno a stav */}
            <div className="flex-1 text-left">
              <h2 className="text-3xl font-bold text-slate-100 mb-3">
                {selectedEmployee.fullName || 'Neznámý zaměstnanec'}
              </h2>
              
              {/* Aktuální stav - detailní informace při práci */}
              {isAtWork && selectedEmployee.attendanceStart ? (
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Čas příchodu */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-blue-500/15 text-blue-300 border border-blue-400/20">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    Příchod: {formatWorkStartTime(selectedEmployee.attendanceStart)}
                  </div>
                  
                  {/* Odpracované hodiny */}
                  {workedTime && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      Odpracováno: {workedTime.hours}h {workedTime.minutes}m
                    </div>
                  )}
                </div>
              ) : !isAtWork ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-slate-600/20 text-slate-400 border border-slate-500/20">
                  <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                  {/* Prázdný text pro volný stav */}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Akční tlačítko - vycentrované */}
        <button
          onClick={handleAction}
          className={`
            relative w-full max-w-3xl mx-auto flex items-center justify-center gap-4 p-8 text-2xl font-bold rounded-2xl transition-all duration-300 min-h-[100px] hover:scale-105 active:scale-95
            ${isAtWork 
              ? 'btn-warning' 
              : 'btn-success'
            }
          `}
          aria-label={actionText}
        >
          <ActionIcon className="w-10 h-10" />
          {actionText}
        </button>

        {/* Countdown indikátor - kompaktní */}
        <div className="mt-8">
          <div className="inline-block bg-slate-800/60 backdrop-blur-sm border border-slate-600/30 rounded-lg px-4 py-2 mx-auto">
            <p className="text-slate-300 text-sm whitespace-nowrap">
              Návrat na hlavní obrazovku za {countdown}s
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
