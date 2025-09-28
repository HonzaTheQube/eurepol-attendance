import { useEffect } from 'react';
import { ArrowLeft, Activity, X } from 'lucide-react';
import { useAppStore } from '../store';
import { appConfig } from '../services/config';

export function ActivityConfirmationScreen() {
  const { 
    selectedEmployee, 
    setCurrentScreen, 
    setSelectedEmployee,
    stopWork 
  } = useAppStore();

  // Auto-return timer
  useEffect(() => {
    const timer = setTimeout(() => {
      handleBack();
    }, appConfig.ui.autoReturnToWelcomeMs);

    return () => clearTimeout(timer);
  }, []);

  const handleBack = () => {
    setSelectedEmployee(undefined);
    setCurrentScreen('welcome');
  };

  const handleNoActivity = async () => {
    if (!selectedEmployee) return;
    
    console.log('🔴 Ukončení práce BEZ reportování aktivity');
    
    // Ukončit práci bez aktivity
    await stopWork(selectedEmployee.employeeID);
    
    // Přejít na potvrzovací obrazovku
    setCurrentScreen('confirmation');
    
    // Po potvrzení zpět na welcome
    setTimeout(() => {
      setCurrentScreen('welcome');
      setSelectedEmployee(undefined);
    }, appConfig.ui.confirmationDurationMs);
  };

  const handleYesActivity = () => {
    console.log('📋 Zaměstnanec chce reportovat aktivitu - přechod na výběr kategorií');
    setCurrentScreen('category-selector');
  };

  if (!selectedEmployee) {
    console.error('❌ ActivityConfirmationScreen: Žádný zaměstnanec není vybrán!');
    setCurrentScreen('welcome');
    return null;
  }

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

      {/* Střední sekce - otázka a tlačítka */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-8">
        
        {/* Ikona a otázka */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="p-8 bg-blue-500/10 rounded-full border border-blue-400/20">
              <Activity className="w-16 h-16 text-blue-400" />
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-slate-100 mb-6">
            Zaznamenat činnost?
          </h2>
          
          <p className="text-xl text-slate-300 max-w-2xl">
            Chcete k ukončení práce přidat záznam o vykonané činnosti?
          </p>
          
          <div className="mt-6 text-slate-400">
            <p className="text-lg font-medium">{selectedEmployee.fullName}</p>
          </div>
        </div>

        {/* Tlačítka volby */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-4xl">
          
          {/* NE - bez aktivity */}
          <button
            onClick={handleNoActivity}
            className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-700/20 hover:bg-slate-600/30 border border-slate-600/20 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent hover:scale-105 hover:shadow-lg min-h-[180px]"
          >
            <div className="p-4 bg-slate-600/30 rounded-full">
              <X className="w-8 h-8 text-slate-300" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-100 mb-2">
                Ne, děkuji
              </h3>
              <p className="text-slate-400">
                Pouze ukončit práci
              </p>
            </div>
          </button>

          {/* ANO - s aktivitou */}
          <button
            onClick={handleYesActivity}
            className="flex flex-col items-center justify-center gap-4 p-8 bg-emerald-700/20 hover:bg-emerald-600/30 border border-emerald-600/20 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent hover:scale-105 hover:shadow-lg min-h-[180px]"
          >
            <div className="p-4 bg-emerald-600/30 rounded-full">
              <Activity className="w-8 h-8 text-emerald-300" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-100 mb-2">
                Ano, přidat činnost
              </h3>
              <p className="text-emerald-300">
                Vybrat vykonanou práci
              </p>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
