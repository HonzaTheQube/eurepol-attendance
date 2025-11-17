import { useEffect, useMemo } from 'react';
import { Home, ArrowLeft, Grid3X3 } from 'lucide-react';
import { useAppStore } from '../store';
import { appConfig } from '../services/config';

export function SubCategorySelectorScreen() {
  const { 
    selectedEmployee, 
    activities,
    selectedCategory,
    setCurrentScreen, 
    setSelectedEmployee,
    setSelectedSubCategory
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

  // Filtrování subkategorií podle vybrané kategorie
  const subCategories = useMemo(() => {
    if (!selectedCategory) return [];
    
    // Získej všechny unikátní subkategorie pro danou kategorii
    const subCatsSet = new Set<string>();
    activities
      .filter(activity => activity.activityCategory === selectedCategory)
      .forEach(activity => {
        if (activity.activitySubCategory && activity.activitySubCategory.trim() !== '') {
          subCatsSet.add(activity.activitySubCategory);
        }
      });
    
    return Array.from(subCatsSet).sort((a, b) => a.localeCompare(b, 'cs'));
  }, [activities, selectedCategory]);

  // Počítání optimálního rozložení gridu pro subkategorie
  const getOptimalGridLayout = (itemCount: number) => {
    if (itemCount === 0) return { cols: 1, rows: 1 };
    if (itemCount <= 4) return { cols: Math.min(itemCount, 2), rows: Math.ceil(itemCount / 2) };
    if (itemCount <= 6) return { cols: 3, rows: 2 };
    if (itemCount <= 9) return { cols: 3, rows: 3 };
    
    // Pro více subkategorií
    const maxRows = 4;
    const cols = Math.min(Math.ceil(itemCount / maxRows), 4);
    const rows = Math.ceil(itemCount / cols);
    return { cols, rows };
  };

  const { cols, rows } = getOptimalGridLayout(subCategories.length);

  const handleSubCategorySelect = (subCategory: string) => {
    console.log('📂 Vybrána subkategorie:', subCategory);
    setSelectedSubCategory(subCategory);
    setCurrentScreen('activity-selector');
  };

  if (!selectedEmployee) {
    console.error('❌ SubCategorySelectorScreen: Žádný zaměstnanec není vybrán!');
    setCurrentScreen('welcome');
    return null;
  }

  if (!selectedCategory) {
    console.error('❌ SubCategorySelectorScreen: Žádná kategorie není vybrána!');
    setCurrentScreen('category-selector');
    return null;
  }

  // Pokud nejsou žádné subkategorie, přejdi rovnou na activity selector
  useEffect(() => {
    if (subCategories.length === 0) {
      console.log('⚠️ Žádné subkategorie - přechod rovnou na výběr aktivit');
      setSelectedSubCategory(undefined); // Clear subkategorie
      setCurrentScreen('activity-selector');
    }
  }, [subCategories.length, setCurrentScreen, setSelectedSubCategory]);

  if (subCategories.length === 0) {
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
        {/* Breadcrumb navigace */}
        <div className="mb-4">
          <button
            onClick={handleBackToCategories}
            className="inline-flex items-center gap-2 px-4 py-2 text-blue-400 hover:text-blue-300 bg-slate-700/20 hover:bg-slate-600/30 border border-slate-600/30 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Zpět na kategorie</span>
          </button>
        </div>
        
        <h3 className="text-4xl font-bold text-slate-100 mb-2">
          Vyberte podkategorii
        </h3>
        <p className="text-slate-300 text-lg mb-1">
          {selectedCategory.replace('_', ' ')}
        </p>
        <p className="text-slate-400">
          {selectedEmployee.fullName}
        </p>
      </div>

      {/* Responzivní grid subkategorií */}
      <div className="flex-1 min-h-0 overflow-hidden px-4">
        <div 
          className="h-full grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`
          }}
        >
          {subCategories.map((subCategory) => {
            const activitiesInSubCategory = activities.filter(
              a => a.activityCategory === selectedCategory && a.activitySubCategory === subCategory
            ).length;
            
            return (
              <button
                key={subCategory}
                onClick={() => handleSubCategorySelect(subCategory)}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-700/20 hover:bg-slate-600/30 border border-slate-600/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent hover:scale-105 hover:shadow-lg min-h-0 relative"
              >
                {/* Ikona subkategorie */}
                <div className="flex-shrink-0 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/20">
                  <Grid3X3 className="w-10 h-10 text-emerald-400" />
                </div>
                
                {/* Název subkategorie */}
                <div className="text-center min-w-0 w-full">
                  <p className="text-2xl font-semibold text-slate-100 leading-tight mb-1">
                    {subCategory}
                  </p>
                  
                  {/* Počet aktivit v subkategorii */}
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-600/20 text-slate-400 text-lg">
                    {activitiesInSubCategory} {activitiesInSubCategory === 1 ? 'činnost' : 'činností'}
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
