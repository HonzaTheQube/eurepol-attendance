import { useState, useMemo } from 'react';
import { X, User, Users } from 'lucide-react';
import { useAppStore } from '../../store';

interface ManualSelectorProps {
  onClose: () => void;
}

export function ManualSelector({ onClose }: ManualSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingEmployeeId, setLoadingEmployeeId] = useState<string | null>(null);
  const { localEmployees, getEmployeeWithState, setSelectedEmployee, setCurrentScreen } = useAppStore();

  // Všichni zaměstnanci vždy viditelní - s informací o stavu, seřazení podle abecedy
  const allEmployees = useMemo(() => {
    // Konverze Map na Array s informací o stavu
    return Array.from(localEmployees.values())
      .map(localState => ({
        employeeID: localState.employeeID,
        fullName: localState.fullName,
        reportActivity: localState.reportActivity || false,
        tagID: localState.tagID || 'N/A', // Pro debugging
        isAtWork: localState.isAtWork || false
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'cs')); // Abecední řazení podle českých pravidel
  }, [localEmployees]);

  const handleEmployeeSelect = async (employee: { employeeID: string; fullName: string; reportActivity: boolean; tagID: string; isAtWork: boolean }) => {
    setIsLoading(true);
    setLoadingEmployeeId(employee.employeeID);
    
    try {
      console.log('⚡ LOCAL-FIRST lookup stavu zaměstnance:', employee.fullName);
      
      // LOCAL-FIRST: okamžitý lookup (0ms) místo API volání
      const employeeWithStatus = getEmployeeWithState(employee.employeeID);
      
      if (employeeWithStatus) {
        console.log('✅ Stav načten, zaměstnanec je:', employeeWithStatus.isAtWork ? 'v práci' : 'volný');
        
        // Teprve po načtení stavu zavřeme modal a přejdeme na akční screen
        setSelectedEmployee(employeeWithStatus);
        setCurrentScreen('employee-action');
        onClose();
      } else {
        console.error('❌ Zaměstnanec nenalezen:', employee.fullName);
        
        // Zobrazit chybovou zprávu
        const { setError, setCurrentScreen } = useAppStore();
        setError(`Zaměstnanec "${employee.fullName}" nebyl nalezen v systému. Zkuste to prosím znovu.`);
        setCurrentScreen('error');
        onClose();
        
        // Automatický návrat na welcome po 3 sekundách
        setTimeout(() => {
          setError(undefined);
          setCurrentScreen('welcome');
        }, 3000);
      }
      
    } catch (error) {
      console.error('❌ Chyba při načítání stavu zaměstnance:', error);
      
      // Zobrazit chybovou zprávu
      const { setError, setCurrentScreen } = useAppStore();
      setError('Chyba při načítání stavu zaměstnance z lokální databáze.');
      setCurrentScreen('error');
      onClose();
      
      // Automatický návrat na welcome po 3 sekundách
      setTimeout(() => {
        setError(undefined);
        setCurrentScreen('welcome');
      }, 3000);
    } finally {
      // Rychle skrýt loading - místní lookup je rychlý
      setTimeout(() => {
        setIsLoading(false);
        setLoadingEmployeeId(null);
      }, 100);
    }
  };

  // Počítání optimálního rozložení gridu s ohledem na aspect ratio
  const getOptimalGridLayout = (itemCount: number) => {
    if (itemCount === 0) return { cols: 1, rows: 1 };
    if (itemCount <= 4) return { cols: Math.min(itemCount, 2), rows: Math.ceil(itemCount / 2) };
    if (itemCount <= 6) return { cols: 3, rows: 2 };
    if (itemCount <= 9) return { cols: 3, rows: 3 };
    if (itemCount <= 12) return { cols: 4, rows: 3 };
    if (itemCount <= 16) return { cols: 4, rows: 4 };
    if (itemCount <= 20) return { cols: 5, rows: 4 };
    
    // Pro více zaměstnanců - omezujeme řádky kvůli aspect ratio
    // Na 16:9 můžeme mít max 4-5 řádků, na 4:3 max 6 řádků
    const maxRows = 5; // Bezpečná hranice pro všechny aspect ratio
    const cols = Math.min(Math.ceil(itemCount / maxRows), 8); // Max 8 sloupců
    const rows = Math.ceil(itemCount / cols);
    return { cols, rows };
  };

  const { cols, rows } = getOptimalGridLayout(allEmployees.length);

  return (
    <div className="flex flex-col h-full">
      {/* Zavírací tlačítko */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 rounded-full hover:bg-slate-700/70 transition-colors"
        aria-label="Zavřít výběr zaměstnanců"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header sekce */}
      <div className="flex-shrink-0 mb-6">
        <div className="text-center">
          <h3 className="text-4xl font-bold text-slate-100">
            Vyberte zaměstnance
          </h3>
          <p className="text-slate-300 mt-3 text-lg">
            Klikněte na své jméno pro načtení aktuálního stavu
          </p>
        </div>
      </div>

      {/* Responzivní grid zaměstnanců - zabírá zbývající prostor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {allEmployees.length > 0 ? (
          <div 
            className="h-full grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`
            }}
          >
            {allEmployees.map((employee) => (
              <button
                key={employee.employeeID}
                onClick={() => handleEmployeeSelect(employee)}
                disabled={isLoading}
                className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-700/20 hover:bg-slate-600/30 border border-slate-600/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 hover:shadow-lg min-h-0 relative"
              >
                {/* Avatar placeholder - přizpůsobivá velikost */}
                <div className={`flex-shrink-0 bg-slate-600/30 rounded-full flex items-center justify-center ${
                  rows <= 3 ? 'w-16 h-16' : rows <= 4 ? 'w-12 h-12' : 'w-10 h-10'
                }`}>
                  <User className={`text-slate-300 ${
                    rows <= 3 ? 'w-8 h-8' : rows <= 4 ? 'w-6 h-6' : 'w-5 h-5'
                  }`} />
                </div>
                
                {/* Jméno zaměstnance - vždy na stejné pozici */}
                <div className="text-center min-w-0 w-full">
                  <p className={`font-semibold text-slate-100 truncate leading-tight ${
                    rows <= 3 ? 'text-2xl' : rows <= 4 ? 'text-xl' : 'text-lg'
                  }`}>
                    {employee.fullName || 'Bez jména'}
                  </p>
                </div>
                
                {/* Status prostor - vždy rezervovaný */}
                <div className={`flex items-center justify-center ${
                  rows <= 3 ? 'h-6' : rows <= 4 ? 'h-5' : 'h-4'
                }`}>
                  {employee.isAtWork ? (
                    <div className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 font-medium ${
                      rows <= 3 ? 'px-2 py-1 text-xs' : rows <= 4 ? 'px-1.5 py-0.5 text-xs' : 'px-1 py-0.5 text-xs'
                    }`}>
                      <div className={`rounded-full bg-emerald-400 ${
                        rows <= 3 ? 'w-1.5 h-1.5' : 'w-1 h-1'
                      }`}></div>
                      {rows <= 3 ? 'V práci' : rows <= 4 ? 'V práci' : '●'}
                    </div>
                  ) : (
                    /* Prázdný prostor pro zachování rozložení */
                    <div></div>
                  )}
                </div>
                
                {/* Loading indikátor */}
                {loadingEmployeeId === employee.employeeID && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-700/50 rounded-xl">
                    <div>
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-blue-300 mt-1">
                        Načítám...
                      </p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-xl">Žádní zaměstnanci k dispozici</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
