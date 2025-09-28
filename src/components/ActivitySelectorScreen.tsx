import { useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store';
import { appConfig } from '../services/config';
import type { Activity } from '../types';

export function ActivitySelectorScreen() {
  const { 
    selectedEmployee, 
    activities,
    selectedCategory,
    setCurrentScreen, 
    setSelectedEmployee,
    setSelectedActivity,
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

  const handleBackToCategories = () => {
    setCurrentScreen('category-selector');
  };

  // Filtrování aktivit podle vybrané kategorie
  const categoryActivities = useMemo(() => {
    if (!selectedCategory) return [];
    return activities
      .filter(activity => activity.activityCategory === selectedCategory)
      .sort((a, b) => a.activityName.localeCompare(b.activityName, 'cs'));
  }, [activities, selectedCategory]);

  // Počítání optimálního rozložení gridu pro aktivity
  const getOptimalGridLayout = (itemCount: number) => {
    if (itemCount === 0) return { cols: 1, rows: 1 };
    if (itemCount <= 4) return { cols: Math.min(itemCount, 2), rows: Math.ceil(itemCount / 2) };
    if (itemCount <= 6) return { cols: 3, rows: 2 };
    if (itemCount <= 9) return { cols: 3, rows: 3 };
    if (itemCount <= 12) return { cols: 4, rows: 3 };
    if (itemCount <= 16) return { cols: 4, rows: 4 };
    if (itemCount <= 20) return { cols: 5, rows: 4 };
    
    // Pro více aktivit - omezujeme řádky kvůli aspect ratio
    const maxRows = 5;
    const cols = Math.min(Math.ceil(itemCount / maxRows), 6);
    const rows = Math.ceil(itemCount / cols);
    return { cols, rows };
  };

  const { cols, rows } = getOptimalGridLayout(categoryActivities.length);

  const handleActivitySelect = async (activity: Activity) => {
    if (!selectedEmployee) return;
    
    console.log('✅ Vybrána aktivita:', activity.activityName);
    console.log('🔴 Ukončování práce S reportováním aktivity...');
    
    // Uložit vybranou aktivitu
    setSelectedActivity(activity);
    
    // Ukončit práci s aktivitou (activityID se předá do API)
    await stopWork(selectedEmployee.employeeID, activity.activityID);
    
    // Přejít na potvrzovací obrazovku
    setCurrentScreen('confirmation');
    
    // Po potvrzení zpět na welcome
    setTimeout(() => {
      setCurrentScreen('welcome');
      setSelectedEmployee(undefined);
      setSelectedActivity(undefined);
    }, appConfig.ui.confirmationDurationMs);
  };

  if (!selectedEmployee) {
    console.error('❌ ActivitySelectorScreen: Žádný zaměstnanec není vybrán!');
    setCurrentScreen('welcome');
    return null;
  }

  if (!selectedCategory) {
    console.error('❌ ActivitySelectorScreen: Žádná kategorie není vybrána!');
    setCurrentScreen('category-selector');
    return null;
  }

  if (categoryActivities.length === 0) {
    console.warn('⚠️ Žádné aktivity v kategorii:', selectedCategory);
    setCurrentScreen('category-selector');
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

      {/* Header sekce */}
      <div className="flex-shrink-0 mb-6 text-center pt-16">
        {/* Breadcrumb navigace */}
        <div className="mb-4">
          <button
            onClick={handleBackToCategories}
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Zpět na kategorie</span>
          </button>
        </div>
        
        <h3 className="text-4xl font-bold text-slate-100 mb-2">
          Vyberte činnost
        </h3>
        <p className="text-slate-300 text-lg mb-1">
          {selectedCategory.replace('_', ' ')}
        </p>
        <p className="text-slate-400">
          {selectedEmployee.fullName}
        </p>
      </div>

      {/* Responzivní grid aktivit */}
      <div className="flex-1 min-h-0 overflow-hidden px-2">
        <div 
          className="h-full grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`
          }}
        >
          {categoryActivities.map((activity) => (
            <button
              key={activity.activityID}
              onClick={() => handleActivitySelect(activity)}
              className="flex items-center justify-center p-4 bg-slate-700/20 hover:bg-slate-600/30 border border-slate-600/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent hover:scale-105 hover:shadow-lg min-h-0"
            >
              {/* Název aktivity - pouze text */}
              <p className={`font-semibold text-slate-100 text-center leading-tight ${
                rows <= 3 ? 'text-lg' : rows <= 4 ? 'text-base' : 'text-sm'
              }`} 
                 style={{ 
                   display: '-webkit-box',
                   WebkitLineClamp: rows <= 3 ? 3 : rows <= 4 ? 2 : 1,
                   WebkitBoxOrient: 'vertical',
                   overflow: 'hidden'
                 }}
              >
                {activity.activityName}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
