import { useEffect, useMemo } from 'react';
import { Home, Grid3X3, Wheat, Heart, Truck, Package, FileText, Settings, Lightbulb } from 'lucide-react';
import { useAppStore } from '../store';
import { appConfig } from '../services/config';

// Mapování kategorií na ikony a barvy
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'ROSTLINNÁ VÝROBA':
      return { Icon: Wheat, color: 'emerald' };
    case 'ŽIVOČIŠNÁ VÝROBA':
      return { Icon: Heart, color: 'blue' };
    case 'MECHANIZACE A STROJE':
      return { Icon: Truck, color: 'orange' };
    case 'SKLADOVÁNÍ A ZPRACOVÁNÍ':
      return { Icon: Package, color: 'purple' };
    case 'ADMINISTRATIVA A LOGISTIKA':
      return { Icon: FileText, color: 'cyan' };
    case 'REŽIJNÍ ČINNOSTI':
      return { Icon: Settings, color: 'slate' };
    case 'SPECIÁLNÍ PROJEKTY':
      return { Icon: Lightbulb, color: 'yellow' };
    default:
      return { Icon: Grid3X3, color: 'gray' };
  }
};

export function CategorySelectorScreen() {
  const { 
    selectedEmployee, 
    activities,
    setCurrentScreen, 
    setSelectedEmployee,
    setSelectedCategory
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

  // Získání unikátních kategorií z aktivit
  const categories = useMemo(() => {
    const categorySet = new Set(activities.map(activity => activity.activityCategory));
    return Array.from(categorySet).sort();
  }, [activities]);

  // Počítání optimálního rozložení gridu pro kategorie
  const getOptimalGridLayout = (itemCount: number) => {
    if (itemCount === 0) return { cols: 1, rows: 1 };
    if (itemCount <= 4) return { cols: Math.min(itemCount, 2), rows: Math.ceil(itemCount / 2) };
    if (itemCount <= 6) return { cols: 3, rows: 2 };
    if (itemCount <= 9) return { cols: 3, rows: 3 };
    
    // Pro více kategorií (což je nepravděpodobné)
    const maxRows = 4;
    const cols = Math.min(Math.ceil(itemCount / maxRows), 4);
    const rows = Math.ceil(itemCount / cols);
    return { cols, rows };
  };

  const { cols, rows } = getOptimalGridLayout(categories.length);

  const handleCategorySelect = (category: string) => {
    console.log('📂 Vybrána kategorie:', category);
    setSelectedCategory(category);
    
    // Zkontroluj, zda má kategorie nějaké subkategorie
    const categoryActivities = activities.filter(a => a.activityCategory === category);
    const hasSubCategories = categoryActivities.some(a => a.activitySubCategory && a.activitySubCategory.trim() !== '');
    
    if (hasSubCategories) {
      console.log('📂 Kategorie má subkategorie - přechod na subcategory-selector');
      setCurrentScreen('subcategory-selector');
    } else {
      console.log('📂 Kategorie nemá subkategorie - přechod rovnou na activity-selector');
    setCurrentScreen('activity-selector');
    }
  };

  if (!selectedEmployee) {
    console.error('❌ CategorySelectorScreen: Žádný zaměstnanec není vybrán!');
    setCurrentScreen('welcome');
    return null;
  }

  // Kontrola kategorií v useEffect místo během renderu
  useEffect(() => {
    if (categories.length === 0) {
      console.warn('⚠️ Žádné kategorie aktivit k dispozici - návrat na employee-action');
      setCurrentScreen('employee-action');
    }
  }, [categories.length, setCurrentScreen]);

  if (categories.length === 0) {
    return null; // Čekáme na useEffect redirect
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden px-6 py-4 relative">
      
      {/* Domů tlačítko */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 p-3 text-slate-300 hover:text-slate-100 hover:bg-slate-600/30 rounded-full transition-all duration-200 backdrop-blur-sm z-20"
        aria-label="Domů"
      >
        <Home className="w-6 h-6" />
      </button>

      {/* Header sekce */}
      <div className="flex-shrink-0 mb-6 text-center pt-16">
        <h3 className="text-4xl font-bold text-slate-100">
          Vyberte kategorii činnosti
        </h3>
        <p className="text-slate-300 mt-3 text-lg">
          {selectedEmployee.fullName}
        </p>
      </div>

      {/* Responzivní grid kategorií */}
      <div className="flex-1 min-h-0 overflow-hidden px-4">
        <div 
          className="h-full grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`
          }}
        >
          {categories.map((category) => {
            const { Icon, color } = getCategoryIcon(category);
            const activitiesInCategory = activities.filter(a => a.activityCategory === category).length;
            
            return (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-700/20 hover:bg-slate-600/30 border border-slate-600/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent hover:scale-105 hover:shadow-lg min-h-0 relative"
              >
                {/* Ikona kategorie */}
                <div className={`flex-shrink-0 p-4 rounded-2xl ${
                  color === 'emerald' ? 'bg-emerald-500/10 border border-emerald-400/20' :
                  color === 'blue' ? 'bg-blue-500/10 border border-blue-400/20' :
                  color === 'orange' ? 'bg-orange-500/10 border border-orange-400/20' :
                  color === 'purple' ? 'bg-purple-500/10 border border-purple-400/20' :
                  color === 'cyan' ? 'bg-cyan-500/10 border border-cyan-400/20' :
                  color === 'slate' ? 'bg-slate-500/10 border border-slate-400/20' :
                  color === 'yellow' ? 'bg-yellow-500/10 border border-yellow-400/20' :
                  'bg-gray-500/10 border border-gray-400/20'
                }`}>
                  <Icon className={`w-10 h-10 ${
                    color === 'emerald' ? 'text-emerald-400' :
                    color === 'blue' ? 'text-blue-400' :
                    color === 'orange' ? 'text-orange-400' :
                    color === 'purple' ? 'text-purple-400' :
                    color === 'cyan' ? 'text-cyan-400' :
                    color === 'slate' ? 'text-slate-400' :
                    color === 'yellow' ? 'text-yellow-400' :
                    'text-gray-400'
                  }`} />
                </div>
                
                {/* Název kategorie */}
                <div className="text-center min-w-0 w-full">
                  <p className="text-xl font-semibold text-slate-100 leading-tight mb-1">
                    {category.replace('_', ' ')}
                  </p>
                  
                  {/* Počet aktivit v kategorii */}
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-600/20 text-slate-400 text-base">
                    {activitiesInCategory} {activitiesInCategory === 1 ? 'činnost' : 'činností'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
