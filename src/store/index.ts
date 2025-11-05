import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  EmployeeWithState, 
  Screen, 
  QueuedAction,
  Activity
} from '../types';
import { storageService, type LocalEmployeeState } from '../services/storage';

// LOCAL-FIRST Store interface
interface AppStore {
  // 🏠 LOCAL-FIRST STATE (primární zdroj pravdy)
  localEmployees: Map<string, LocalEmployeeState>; // EmployeeID -> LocalState
  activities: Activity[]; // NOVÁ property pro aktivity
  
  // 📱 UI State
  currentScreen: Screen;
  selectedEmployee?: EmployeeWithState;
  selectedCategory?: string; // NOVÁ property pro vybranou kategorii
  selectedSubCategory?: string; // NOVÁ property pro vybranou subkategorii
  selectedActivity?: Activity; // NOVÁ property pro vybranou aktivitu
  message?: string;
  
  // 🌐 Network & Sync State
  isOnline: boolean;
  isLoading: boolean;
  error?: string;
  lastSync?: string;
  isInitialized: boolean; // Zda je LOCAL databáze načtená
  
  // 🔒 RACE CONDITION PROTECTION
  pendingActions: Set<string>; // Tracking probíhajících akcí (formát: "employeeID-action")
  
  // =============================================================================
  // 🚀 LOCAL-FIRST CORE METHODS
  // =============================================================================
  
  // Inicializace - Cache-first s background API update
  initializeCacheFirst: () => Promise<void>;
  
  // Rychlý lokální lookup (bez API volání!)
  getEmployeeState: (employeeID: string) => LocalEmployeeState | null;
  getEmployeeWithState: (employeeID: string) => EmployeeWithState | null;
  getEmployeeByTagID: (tagID: string) => EmployeeWithState | null;
  
  // Lokální akce (okamžité, bez API)
  updateEmployeeStateLocal: (employeeID: string, updates: Partial<LocalEmployeeState>) => Promise<void>;
  addEmployeeStateLocal: (employee: LocalEmployeeState) => Promise<void>;
  
  // =============================================================================
  // 📱 UI STATE MANAGEMENT
  // =============================================================================
  
  setCurrentScreen: (currentScreen: Screen) => void;
  setSelectedEmployee: (selectedEmployee: EmployeeWithState | undefined) => void;
  setSelectedCategory: (category: string | undefined) => void; // NOVÁ metoda
  setSelectedSubCategory: (subCategory: string | undefined) => void; // NOVÁ metoda
  setSelectedActivity: (activity: Activity | undefined) => void; // NOVÁ metoda
  setMessage: (message: string | undefined) => void;
  
  // =============================================================================
  // 🌐 NETWORK & SYNC
  // =============================================================================
  
  setOnline: (isOnline: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | undefined) => void;
  
  // Background sync s API (neblokující)
  syncWithAPI: () => Promise<void>;
  
  // Zpracování action queue
  processActionQueue: () => Promise<void>;
  
  // =============================================================================
  // ⚡ EMPLOYEE ACTIONS (LOCAL-FIRST)
  // =============================================================================
  
  // Okamžité lokální akce (0ms response time)
  startWork: (employeeID: string) => Promise<void>;
  stopWork: (employeeID: string, activityID?: string) => Promise<void>; // UPRAVENÁ metoda s activityID
}

interface ActionQueueStore {
  queue: QueuedAction[];
  isLoaded: boolean;
  isProcessing: boolean; // Processing lock
  processingStartTime?: number; // Timestamp kdy začal processing (pro timeout detection)
  
  addAction: (action: Omit<QueuedAction, 'id' | 'attempts'>) => Promise<void>;
  removeAction: (actionId: string) => Promise<void>;
  updateActionAttempts: (actionId: string, attempts: number) => Promise<void>;
  loadQueue: () => Promise<void>;
  getFailedActions: () => QueuedAction[];
  clearQueue: () => Promise<void>;
}

// Hlavní store
export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // =============================================================================
    // 🏠 LOCAL-FIRST STATE (primární zdroj pravdy) 
    // =============================================================================
    localEmployees: new Map<string, LocalEmployeeState>(),
    activities: [], // NOVÁ property pro aktivity
    
    // 📱 UI State
    currentScreen: 'welcome' as Screen,
    selectedEmployee: undefined,
    selectedCategory: undefined, // NOVÁ property
    selectedSubCategory: undefined, // NOVÁ property
    selectedActivity: undefined, // NOVÁ property
    message: undefined,
    
    // 🌐 Network & Sync State
    isOnline: navigator.onLine,
    isLoading: false,
    error: undefined,
    lastSync: undefined,
    isInitialized: false,
    
    // 🔒 RACE CONDITION PROTECTION
    pendingActions: new Set<string>(),
    
    // =============================================================================
    // 🚀 LOCAL-FIRST CORE METHODS
    // =============================================================================
    
    // Inicializace - Cache-first s background API update
    initializeCacheFirst: async () => {
      console.log('⚡ Inicializace CACHE-FIRST store...');
      set({ isLoading: true, error: undefined });
      
      try {
        // 1. OKAMŽITĚ načti cache data z IndexedDB (0ms)
        const employeeStates = await storageService.getAllEmployeeStates();
        
        if (employeeStates.length === 0) {
          console.log('📥 Žádná cache data - MUSÍM počkat na API (první spuštění)...');
          
          if (!get().isOnline) {
            set({ error: 'Aplikace vyžaduje internetové připojení při prvním spuštění' });
            return;
          }
          
          // První spuštění - musíme počkat na API
          const { apiService } = await import('../services/api');
          const apiData = await apiService.getInitialData();
          
          const newLocalStates: LocalEmployeeState[] = [];
          for (const employee of apiData.employees) {
            if (!employee.fullName?.trim()) continue;
            
            newLocalStates.push({
              employeeID: employee.employeeID,
              fullName: employee.fullName,
              reportActivity: employee.reportActivity || false,
              tagID: employee.tagID || employee.employeeID, // Fallback pro starší data
              department: '',
              isAtWork: false,
              version: 1
            });
          }
          
          await storageService.saveAllEmployeeStates(newLocalStates);
          await storageService.saveMetadata('cachedActivities', JSON.stringify(apiData.activities || []));
          
          const localMap = new Map<string, LocalEmployeeState>();
          newLocalStates.forEach(state => localMap.set(state.employeeID, state));
          
          set({ 
            localEmployees: localMap,
            activities: apiData.activities || [],
            isInitialized: true,
            lastSync: new Date().toISOString()
          });
          
          await storageService.saveMetadata('lastFullSync', new Date().toISOString());
          console.log(`✅ První inicializace dokončena: ${newLocalStates.length} zaměstnanců`);
          
        } else {
          // 2. OKAMŽITĚ spustit aplikaci s cache daty (0ms delay)
          const localMap = new Map<string, LocalEmployeeState>();
          employeeStates.forEach(state => localMap.set(state.employeeID, state));
          
          // Načti cached activities
          const cachedActivities = await storageService.getMetadata('cachedActivities');
          const activities = cachedActivities ? JSON.parse(cachedActivities) : [];
          
          set({ 
            localEmployees: localMap,
            activities: activities,
            isInitialized: true,
            lastSync: await storageService.getMetadata('lastFullSync')
          });
          
          console.log(`⚡ Aplikace spuštěna OKAMŽITĚ s cache: ${employeeStates.length} zaměstnanců, ${activities.length} aktivit`);
          
          // 3. NA POZADÍ spustit API sync pro aktualizaci
          // 3. BEZPEČNÝ background sync - aktualizuje jen metadata
          if (get().isOnline) {
            console.log('🔄 Spouštím BEZPEČNÝ background sync (jen metadata)...');
            // Neblokující background sync - jen jména a reportActivity
            get().syncWithAPI().then(() => {
              console.log('✅ Background metadata sync dokončen');
            }).catch(error => {
              console.warn('⚠️ Background sync selhal:', error);
            });
          }
        }
        
        // 4. VŽDY načti action queue
        const queueStore = useActionQueueStore.getState();
        await queueStore.loadQueue();
        console.log(`📋 Action queue načtena`);
        
      } catch (error) {
        console.error('❌ Chyba při CACHE-FIRST inicializaci:', error);
        set({ error: error instanceof Error ? error.message : 'Kritická chyba při inicializaci' });
      } finally {
        set({ isLoading: false });
      }
    },
    
    // Rychlý lokální lookup (bez API volání!)
    getEmployeeState: (employeeID: string) => {
      return get().localEmployees.get(employeeID) || null;
    },
    
    // Konverze LocalEmployeeState → EmployeeWithState pro UI
    getEmployeeWithState: (employeeID: string) => {
      const localState = get().localEmployees.get(employeeID);
      if (!localState) return null;
      
        return {
        employeeID: localState.employeeID,
        fullName: localState.fullName,
        reportActivity: localState.reportActivity,
        tagID: localState.tagID, // Přidáno tagID
        isAtWork: localState.isAtWork,
        lastAction: localState.lastLocalAction,
        lastActionTime: localState.lastLocalActionTime,
        attendanceStart: localState.attendanceStart,
        attendanceID: localState.attendanceID,
        version: localState.version
      };
    },
    
    // NFC lookup podle tagID
    getEmployeeByTagID: (tagID: string) => {
      const allEmployees = get().localEmployees;
      
      // Hledej zaměstnance podle tagID
      for (const [employeeID, localState] of allEmployees) {
        if (localState.tagID === tagID) {
          return {
            employeeID: localState.employeeID,
            fullName: localState.fullName,
            reportActivity: localState.reportActivity,
            tagID: localState.tagID,
            isAtWork: localState.isAtWork,
            lastAction: localState.lastLocalAction,
            lastActionTime: localState.lastLocalActionTime,
            attendanceStart: localState.attendanceStart,
            attendanceID: localState.attendanceID,
            version: localState.version
          };
        }
      }
      
      console.warn('⚠️ Zaměstnanec s tagID nenalezen:', tagID);
      return null; // TagID nenalezeno
    },
    
    // Lokální aktualizace stavu (okamžitá, + persist do IndexedDB)
    updateEmployeeStateLocal: async (employeeID: string, updates: Partial<LocalEmployeeState>) => {
      const currentState = get().localEmployees.get(employeeID);
      if (!currentState) {
        console.warn('⚠️ Nelze aktualizovat neexistujícího zaměstnance:', employeeID);
        return;
      }
      
      const updatedState: LocalEmployeeState = {
        ...currentState,
        ...updates,
        lastLocalActionTime: new Date().toISOString(),
        version: (currentState.version || 0) + 1
      };
      
      // Aktualizuj Map v paměti
      const newMap = new Map(get().localEmployees);
      newMap.set(employeeID, updatedState);
      set({ localEmployees: newMap });
      
      // Persist do IndexedDB
      await storageService.saveEmployeeState(updatedState);
      
      console.log(`💾 Stav zaměstnance aktualizován lokálně: ${updatedState.fullName} (${updatedState.isAtWork ? 'v práci' : 'volný'})`);
    },
    
    // Přidat nového zaměstnance lokálně
    addEmployeeStateLocal: async (employee: LocalEmployeeState) => {
      const existingState = get().localEmployees.get(employee.employeeID);
      if (existingState) {
        console.warn('⚠️ Zaměstnanec už existuje, použijte updateEmployeeStateLocal:', employee.employeeID);
        return;
      }
      
      // Přidej do Map v paměti
      const newMap = new Map(get().localEmployees);
      newMap.set(employee.employeeID, employee);
      set({ localEmployees: newMap });
      
      // Persist do IndexedDB
      await storageService.saveEmployeeState(employee);
      
      console.log(`➕ Nový zaměstnanec přidán lokálně: ${employee.fullName}`);
    },
    
    // =============================================================================
    // 📱 UI STATE MANAGEMENT  
    // =============================================================================
    
    setCurrentScreen: (currentScreen: Screen) => set({ currentScreen }),
    setSelectedEmployee: (selectedEmployee: EmployeeWithState | undefined) => set({ selectedEmployee }),
    setSelectedCategory: (selectedCategory: string | undefined) => set({ selectedCategory }), // NOVÁ metoda
    setSelectedSubCategory: (selectedSubCategory: string | undefined) => set({ selectedSubCategory }), // NOVÁ metoda
    setSelectedActivity: (selectedActivity: Activity | undefined) => set({ selectedActivity }), // NOVÁ metoda
    setMessage: (message: string | undefined) => set({ message }),
    
    // =============================================================================
    // 🌐 NETWORK & SYNC
    // =============================================================================
    
    setOnline: (isOnline: boolean) => set({ isOnline }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
    setError: (error: string | undefined) => set({ error }),
    
    // DEBUG: Reset IndexedDB pro testování první inicializace
    resetIndexedDB: async () => {
      console.log('🧹 DEBUG: Resetování IndexedDB...');
      set({ isLoading: true });
      
      try {
        // Vyčistit všechna data
        await storageService.clearAllLocalData();
        
        // Vyčistit action queue
        await storageService.clearActions();
        
        // Reset store state
        set({ 
          localEmployees: new Map<string, LocalEmployeeState>(),
          activities: [],
          isInitialized: false,
          lastSync: undefined,
          error: undefined
        });
        
        // Reset action queue store
        useActionQueueStore.setState({ 
          queue: [], 
          isLoaded: false, 
          isProcessing: false,
          processingStartTime: undefined
        });
        
        console.log('✅ IndexedDB vyčištěna - aplikace je připravena pro API-FIRST test');
        console.log('🔄 Obnovte stránku pro test API-FIRST inicializace');
        
      } catch (error) {
        console.error('❌ Chyba při resetování IndexedDB:', error);
        set({ error: 'Chyba při resetování databáze' });
      } finally {
        set({ isLoading: false });
      }
    },

    // Zpracování action queue - odesílání čekajících akcí na API
    processActionQueue: async () => {
      if (!get().isOnline) {
        console.log('📴 ProcessActionQueue přeskočen - offline');
        return;
      }
      
      const queueStore = useActionQueueStore.getState();
      
      // KRITICKÉ: Processing lock - zabránit duplicitnímu zpracování
      if (queueStore.isProcessing) {
        console.log('🔒 ProcessActionQueue přeskočen - už běží zpracování');
        return;
      }
      
      const { queue, removeAction, updateActionAttempts } = queueStore;
      
      if (queue.length === 0) {
        console.log('📭 Action queue je prázdná');
        return;
      }
      
      // Nastavit processing lock s timestampem
      const now = Date.now();
      useActionQueueStore.setState({ 
        isProcessing: true,
        processingStartTime: now
      });
      
      console.log(`🔄 Zpracovávám ${queue.length} akcí ve frontě... (start time: ${new Date(now).toLocaleTimeString('cs-CZ')})`);
      
      // NOVÉ: Skupina akcí podle zaměstnanců pro správné dependency tracking
      const employeeActionsMap = new Map<string, QueuedAction[]>();
      
      // Seskup akce podle employeeID a seřať chronologicky
      queue.forEach(action => {
        if (!employeeActionsMap.has(action.employeeID)) {
          employeeActionsMap.set(action.employeeID, []);
        }
        employeeActionsMap.get(action.employeeID)!.push(action);
      });
      
      // Seřaď akce v každé skupině podle timestamp
      for (const [employeeID, actions] of employeeActionsMap) {
        actions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        console.log(`👤 ${get().localEmployees.get(employeeID)?.fullName}: ${actions.length} akcí seřazeno chronologicky`);
      }
      
      // Zpracuj akce POSTUPNĚ pro každého zaměstnance
      for (const [, actions] of employeeActionsMap) { // Použiji _ místo employeeID
        let currentAttendanceID: string | undefined = undefined;
        
        for (const action of actions) {
          // ✅ NOVÁ LOGIKA: Skipnout akce, které překročily max attempts (NEMAZAT!)
          if (action.attempts >= action.maxAttempts) {
            console.warn('⚠️ Akce překročila max attempts - PONECHÁVÁM ve frontě pro budoucí retry');
            console.log('📊 Akce:', {
              id: action.id,
              action: action.action,
              employeeID: action.employeeID,
              attempts: `${action.attempts}/${action.maxAttempts}`,
              timestamp: new Date(action.timestamp).toLocaleString('cs-CZ')
            });
            continue; // ← Skipnout, NEMAZAT
          }
          
          // Připrav data pro logování
          const employee = get().localEmployees.get(action.employeeID);
          const employeeName = employee?.fullName || `Neznámý (${action.employeeID})`;
          const actionText = action.action === 'start' ? '[START] PŘÍCHOD' : '[STOP] ODCHOD';
          
          // DEPENDENCY TRACKING: Pro STOP akce bez attendanceID použij currentAttendanceID z předchozí START
          let effectiveAttendanceID = action.attendanceID;
          let effectiveAttendanceStart = action.attendanceStart;
          
          if (action.action === 'stop' && !effectiveAttendanceID && currentAttendanceID) {
            effectiveAttendanceID = currentAttendanceID;
            console.warn(`🔗 DEPENDENCY TRACKING AKTIVOVÁN: STOP bez ID používá attendanceID z předchozí START`);
            console.log(`📎 Propojení: START(${currentAttendanceID}) → STOP`);
          } else if (action.action === 'stop' && !effectiveAttendanceID && !currentAttendanceID) {
            console.error(`🚨 KRITICKÉ: STOP akce bez attendanceID a bez předchozí START v sekvenci!`);
            console.error(`📊 Debug info:`, {
              actionID: action.id,
              employeeID: action.employeeID,
              originalAttendanceID: action.attendanceID,
              attendanceStart: action.attendanceStart,
              currentAttendanceID
            });
          }
          
          try {
            console.log(`📤 Zpracovávám: ${actionText} - ${employeeName}`, {
              pokus: `${action.attempts + 1}/${action.maxAttempts}`,
              čas: new Date(action.timestamp).toLocaleTimeString('cs-CZ'),
              activityID: action.activityID || 'bez aktivity',
              originalAttendanceID: action.attendanceID || 'undefined',
              effectiveAttendanceID: effectiveAttendanceID || 'undefined',
              willCreateNew: action.action === 'start' || (!effectiveAttendanceID)
            });
            
            // ✅ NOVÁ LOGIKA: Volej API PŘED incrementem attempts
            const { apiService } = await import('../services/api');
            const result = await apiService.logAttendanceAction({
              employeeID: action.employeeID,
              action: action.action,
              timestamp: action.timestamp,
              attendanceID: effectiveAttendanceID, // POUŽIJ EFFECTIVE ID
              attendanceStart: effectiveAttendanceStart,
              activityID: action.activityID
            });
            
            console.log(`✅ ${actionText} úspěšně zpracován - ${employeeName}`, { 
              attendanceID: result.attendanceID 
            });
            
            // ✅ Úspěch - odstranit z fronty (attempts se NEINCREMENTUJE při úspěchu)
            await removeAction(action.id);
            
            // DEPENDENCY TRACKING: Uložit attendanceID pro následující STOP akce
            if (action.action === 'start' && result.attendanceID) {
              currentAttendanceID = result.attendanceID;
              console.log('🔗 START dokončen - attendanceID k dispozici pro následující STOP:', result.attendanceID);
              
              // Aktualizuj i lokální stav
              await get().updateEmployeeStateLocal(action.employeeID, {
                attendanceID: result.attendanceID
              });
              
              // KRITICKÉ: Aktualizuj i selectedEmployee pokud je to ten samý
              const currentSelected = get().selectedEmployee;
              if (currentSelected?.employeeID === action.employeeID) {
                const updatedEmployee = get().getEmployeeWithState(action.employeeID);
                if (updatedEmployee) {
                  set({ selectedEmployee: updatedEmployee });
                }
              }
            } else if (action.action === 'stop') {
              // STOP akce dokončena - reset currentAttendanceID pro novou sekvenci
              currentAttendanceID = undefined;
              console.log('🔴 STOP dokončen - reset attendanceID pro novou sekvenci');
            }
            
          } catch (error) {
            console.error(`❌ Chyba při zpracování ${actionText} - ${employeeName}:`, error);
            
            // ✅ NOVÁ LOGIKA: Increment attempts AŽ při chybě (ne před API callem)
            await updateActionAttempts(action.id, action.attempts + 1);
            console.log(`🔢 Attempts zvýšeno: ${action.attempts + 1}/${action.maxAttempts}`);
            
            // ✅ ROZŠÍŘENÁ detekce síťové chyby
            const isNetworkError = error instanceof Error && (
              error.message.includes('Failed to fetch') ||
              error.message.includes('Network') ||
              error.message.includes('ERR_INTERNET_DISCONNECTED') ||
              error.message.includes('ERR_NETWORK_CHANGED') ||
              error.message.includes('timeout') ||
              error.message.includes('Timeout') ||
              error.message.includes('ECONNREFUSED') ||
              error.message.includes('ENOTFOUND')
            );
            
            // ✅ Detekce server error (502, 503, 504) - také retry!
            const isServerError = error instanceof Error && 
              error.message.match(/\b(502|503|504)\b/);
            
            const shouldRetry = isNetworkError || isServerError;
            
            if (isNetworkError) {
              console.warn('📵 Detekována síťová chyba - přerušuji zpracování fronty');
              set({ isOnline: false }); // Aktualizuj online stav
              
              // Uvolnit processing lock při síťové chybě
              useActionQueueStore.setState({ 
                isProcessing: false,
                processingStartTime: undefined
              });
              return; // Ukončit celé zpracování pro všechny zaměstnance
            }
            
            if (isServerError) {
              console.warn('🔧 Detekována chyba serveru (502/503/504) - akce zůstává ve frontě pro retry');
            }
            
            if (!shouldRetry) {
              console.error('🚫 Neopravitelná chyba (špatná data?) - akce zůstává ve frontě ale možná vyžaduje manuální zásah');
            }
            
            // Akce zůstává ve frontě pro další pokus
            // attempts už bylo zvýšeno výše
            
            // ✅ NOVÁ LOGIKA: Pokud překročila max attempts, PONECHAT ve frontě
            if (action.attempts >= action.maxAttempts) {
              console.warn('⚠️ Akce překročila max attempts po chybě - PONECHÁVÁM ve frontě');
              console.log('💾 Akce čeká na budoucí retry nebo manuální zásah admina');
              // NEMAZAT - akce zůstává ve frontě!
            }
          }
        } // konec for (actions for this employee)
      } // konec for (all employees)
      
      const remainingActions = useActionQueueStore.getState().queue.length;
      const processingDuration = Date.now() - now;
      console.log(`✅ Zpracování action queue dokončeno. Zbývá ${remainingActions} akcí. Trvalo: ${(processingDuration / 1000).toFixed(1)}s`);
      
      // Uvolnit processing lock
      useActionQueueStore.setState({ 
        isProcessing: false,
        processingStartTime: undefined
      });
    },

    // FULL sync s API - aktualizuje všechna data
    syncWithAPI: async () => {
      if (!get().isOnline) {
        console.log('📴 Sync přeskočen - offline');
        return;
      }
      
      console.log('🔄 Spouštím FULL sync s API...');
      
      try {
        const { apiService } = await import('../services/api');
        
        // 1. Získej aktuální data z API
        const apiData = await apiService.getInitialData();
        console.log(`📡 API sync: ${apiData.employees?.length} zaměstnanců, ${apiData.activities?.length} aktivit`);
        
        // 2. AKTUALIZUJ JEN METADATA zaměstnanců (NIKDY ne pracovní stavy!)
        const currentEmployees = get().localEmployees;
        let hasChanges = false;
        
        for (const employee of apiData.employees) {
          if (!employee.fullName || employee.fullName.trim() === '') {
            console.warn('⚠️ Skipuji zaměstnance s prázdným jménem:', employee);
            continue;
          }
          
          const existingState = currentEmployees.get(employee.employeeID);
          
          if (!existingState) {
            // Nový zaměstnanec - přidej s defaultním stavem
            const newState: LocalEmployeeState = {
              employeeID: employee.employeeID,
              fullName: employee.fullName,
              reportActivity: employee.reportActivity || false,
              tagID: employee.tagID || employee.employeeID, // Fallback pro starší data
              department: '',
              isAtWork: false, // Default pro nové
              version: 1
            };
            
            await get().addEmployeeStateLocal(newState);
            console.log(`➕ Přidán nový zaměstnanec: ${employee.fullName}`);
            hasChanges = true;
            
          } else {
            // Existující zaměstnanec - aktualizuj JEN metadata
            const needsUpdate = 
              existingState.fullName !== employee.fullName ||
              existingState.reportActivity !== (employee.reportActivity || false) ||
              existingState.tagID !== (employee.tagID || employee.employeeID);
              
            if (needsUpdate) {
              await get().updateEmployeeStateLocal(employee.employeeID, {
                fullName: employee.fullName,
                reportActivity: employee.reportActivity || false,
                tagID: employee.tagID || employee.employeeID // Aktualizuj tagID
                // NIKDY neměnit: isAtWork, attendanceStart, attendanceID!
              });
              console.log(`🔄 Aktualizována metadata pro: ${employee.fullName} (tagID: ${employee.tagID || employee.employeeID})`);
              hasChanges = true;
            }
          }
        }
        
        // 3. DETEKCE ODSTRANĚNÝCH zaměstnanců
        const apiEmployeeIds = new Set(apiData.employees.map(e => e.employeeID));
        const currentEmployeeIds = Array.from(currentEmployees.keys());
        const removedEmployees = currentEmployeeIds.filter(id => !apiEmployeeIds.has(id));
        
        if (removedEmployees.length > 0) {
          console.log(`🗑️ Detekováno ${removedEmployees.length} odstraněných zaměstnanců z API`);
          removedEmployees.forEach(employeeID => {
            const employee = currentEmployees.get(employeeID);
            console.log(`❌ Odstraněn zaměstnanec: ${employee?.fullName} (${employeeID})`);
          });
        }
        
        // 3. Cache activities pro offline fallback
        await storageService.saveMetadata('cachedActivities', JSON.stringify(apiData.activities || []));
        
        // 4. Aktualizuj jen activities v store (nikdy localEmployees!)
        set({ 
          activities: apiData.activities || []
        });
        
        // 5. Aktualizuj sync metadata
        const syncTime = new Date().toISOString();
        await storageService.saveMetadata('lastFullSync', syncTime);
        set({ lastSync: syncTime });
        
        // 6. Debug info o změnách
        const currentEmployeesAfterSync = get().localEmployees;
        const totalEmployees = currentEmployeesAfterSync.size;
        const atWork = Array.from(currentEmployeesAfterSync.values()).filter(e => e.isAtWork).length;
        
        console.log(`✅ BEZPEČNÝ sync dokončen:`, {
          totalEmployees,
          atWork,
          hasChanges,
          activities: (apiData.activities || []).length
        });
        
        if (hasChanges) {
          console.log('🔄 UI se aktualizuje s novými daty...');
        } else {
          console.log('📊 Žádné změny - UI zůstává stejné');
        }
        
      } catch (error) {
        console.error('❌ Chyba při FULL sync:', error);
        // Při chybě nestavíme error do UI - je to background proces
        console.log('💾 Pokračuji s cached daty...');
      }
    },
    
    // =============================================================================
    // ⚡ EMPLOYEE ACTIONS (LOCAL-FIRST)
    // =============================================================================
    
    // Okamžitá lokální START akce (0ms response time)
    startWork: async (employeeID: string) => {
      const localState = get().getEmployeeState(employeeID);
      
      if (!localState) {
        console.warn('⚠️ Nelze spustit práci - zaměstnanec není v lokální databázi:', employeeID);
        return;
      }
      
      if (localState.isAtWork) {
        console.warn('⚠️ Zaměstnanec už je v práci:', localState.fullName);
        return;
      }
      
      // 🔒 RACE CONDITION PROTECTION: Kontrola duplicity START
      const actionKey = `${employeeID}-start`;
      if (get().pendingActions.has(actionKey)) {
        console.warn('⚠️ START akce už probíhá pro:', localState.fullName);
        return;
      }
      
      // Označ START jako probíhající
      const newPendingSet = new Set(get().pendingActions);
      newPendingSet.add(actionKey);
      set({ pendingActions: newPendingSet });
      
      const startTimestamp = new Date().toISOString();
      
      console.log('🟢 LOCAL-FIRST START pro:', localState.fullName);
      
      try {
        // NEJDŘÍV: Okamžitá lokální aktualizace (0ms)
        await get().updateEmployeeStateLocal(employeeID, {
          isAtWork: true, 
          lastLocalAction: 'start',
          attendanceStart: startTimestamp,
          attendanceID: undefined // Bude doplněno po API response
        });
        
        // Aktualizuj UI pokud je tento zaměstnanec vybraný
        const currentSelected = get().selectedEmployee;
        if (currentSelected?.employeeID === employeeID) {
          const updatedEmployee = get().getEmployeeWithState(employeeID);
          if (updatedEmployee) {
            set({ selectedEmployee: updatedEmployee });
          }
        }
        
        // POTOM: Na pozadí queue + API (neblokující)
        await useActionQueueStore.getState().addAction({
          employeeID,
          action: 'start',
          timestamp: startTimestamp,
          maxAttempts: 10 // ⬆️ Zvýšeno z 3 na 10 pro lepší resilience
        });
        
        console.log('✅ START akce úspěšně přidána do fronty');
        
      } catch (error) {
        console.error('❌ Chyba při START akci:', error);
        // Lokální aktualizace může proběhnout i při chybě fronty
      } finally {
        // 🔒 Vždy odebrat z pending actions
        const cleanupSet = new Set(get().pendingActions);
        cleanupSet.delete(actionKey);
        set({ pendingActions: cleanupSet });
        console.log('🔓 START pending lock uvolněn pro:', localState.fullName);
      }
    },
    
    // Okamžitá lokální STOP akce (0ms response time)
    stopWork: async (employeeID: string, activityID?: string) => {
      const localState = get().getEmployeeState(employeeID);
      
      if (!localState) {
        console.warn('⚠️ Nelze ukončit práci - zaměstnanec není v lokální databázi:', employeeID);
        return;
      }
      
      if (!localState.isAtWork) {
        console.warn('⚠️ Zaměstnanec není v práci:', localState.fullName);
        return;
      }
      
      // 🔒 INFO: Kontrola čekající START akce (pouze logování, neblokuje)
      const startActionKey = `${employeeID}-start`;
      if (get().pendingActions.has(startActionKey)) {
        console.warn('⚠️ START akce je právě přidávána do fronty - může dojít k race condition');
      }
      
      // 🔒 INFO: Kontrola fronty (pouze logování, neblokuje)
      const queue = useActionQueueStore.getState().queue;
      const hasPendingStart = queue.some(
        action => action.employeeID === employeeID && action.action === 'start'
      );
      
      if (hasPendingStart) {
        console.warn('⚠️ START akce čeká ve frontě - dependency tracking to vyřeší při zpracování');
        console.log('📋 Aktuální fronta:', queue.filter(a => a.employeeID === employeeID));
      }
      
      // 🔒 KONTROLA: Má zaměstnanec attendanceID?
      if (!localState.attendanceID) {
        console.warn('⚠️ Zaměstnanec nemá attendanceID - bude použit dependency tracking nebo offline CREATE');
        console.log('📊 Stav zaměstnance:', {
          fullName: localState.fullName,
          isAtWork: localState.isAtWork,
          attendanceID: localState.attendanceID,
          attendanceStart: localState.attendanceStart
        });
        
        // Pokud má attendanceStart, můžeme pokračovat (offline CREATE fallback)
        if (localState.attendanceStart) {
          console.log('✅ Použiji offline CREATE fallback s attendanceStart:', localState.attendanceStart);
        } else {
          console.warn('⚠️ Nemám ani attendanceStart - spoléhám na dependency tracking');
        }
      }
      
      // 🔒 Kontrola duplicity STOP
      const stopActionKey = `${employeeID}-stop`;
      if (get().pendingActions.has(stopActionKey)) {
        console.warn('⚠️ STOP akce už probíhá pro:', localState.fullName);
        return;
      }
      
      // Označ STOP jako probíhající
      const newPendingSet = new Set(get().pendingActions);
      newPendingSet.add(stopActionKey);
      set({ pendingActions: newPendingSet });
      
      const stopTimestamp = new Date().toISOString();
      
      // KLÍČOVÉ: Uložit attendanceID a attendanceStart PŘED resetováním
      const savedAttendanceID = localState.attendanceID;
      const savedAttendanceStart = localState.attendanceStart;
      
      console.log('🔴 STOP akce pro:', localState.fullName, {
        activityID: activityID || 'bez aktivity',
        attendanceID: savedAttendanceID,
        attendanceStart: savedAttendanceStart
      });
      
      try {
        // NEJDŘÍV: Přidat do queue S PŮVODNÍMI HODNOTAMI
        await useActionQueueStore.getState().addAction({
          employeeID,
          action: 'stop',
          timestamp: stopTimestamp,
          maxAttempts: 10, // ⬆️ Zvýšeno z 3 na 10 pro lepší resilience
          attendanceID: savedAttendanceID, // POUŽÍVÁME ULOŽENÉ HODNOTY
          attendanceStart: savedAttendanceStart,
          activityID: activityID
        });
        
        // POTOM: Lokální aktualizace (resetování)
        await get().updateEmployeeStateLocal(employeeID, {
          isAtWork: false, 
          lastLocalAction: 'stop',
          attendanceStart: savedAttendanceStart, // ✅ ZACHOVAT pro možný fallback/retry
          attendanceID: undefined // Resetovat (už není aktivní)
        });
        
        // Aktualizuj UI pokud je tento zaměstnanec vybraný
        const currentSelected = get().selectedEmployee;
        if (currentSelected?.employeeID === employeeID) {
          const updatedEmployee = get().getEmployeeWithState(employeeID);
          if (updatedEmployee) {
            set({ selectedEmployee: updatedEmployee });
          }
        }
        
        console.log('✅ STOP akce dokončena - data odeslána do fronty');
        
      } catch (error) {
        console.error('❌ Chyba při STOP akci:', error);
        throw error; // Re-throw aby UI vidělo chybu
      } finally {
        // 🔒 Vždy odebrat z pending actions
        const cleanupSet = new Set(get().pendingActions);
        cleanupSet.delete(stopActionKey);
        set({ pendingActions: cleanupSet });
        console.log('🔓 STOP pending lock uvolněn pro:', localState.fullName);
      }
    },
  }))
);

// Action Queue Store
export const useActionQueueStore = create<ActionQueueStore>()(
  subscribeWithSelector((set, get) => ({
  queue: [],
  isLoaded: false,
  isProcessing: false, // Processing lock
  processingStartTime: undefined, // Timestamp pro timeout detection
  
    addAction: async (action: Omit<QueuedAction, 'id' | 'attempts'>) => {
    const newAction: QueuedAction = {
      ...action,
        id: `${action.employeeID}-${action.action}-${Date.now()}`,
      attempts: 0
    };
    
      // Přidat do lokálního stavu
      set(state => ({
        queue: [...state.queue, newAction]
      }));
      
      // Uložit do IndexedDB
      await storageService.saveAction(newAction);
      
      console.log('📤 Akce přidána do fronty:', action.action, action.activityID ? `s aktivitou ${action.activityID}` : 'bez aktivity');
    },
    
    removeAction: async (actionId: string) => {
      // Odebrat z lokálního stavu
      set(state => ({
        queue: state.queue.filter(action => action.id !== actionId)
      }));
  
      // Odebrat z IndexedDB - opravené názvy metod
      await storageService.removeAction(actionId);
      
      console.log('✅ Akce odebrána z fronty:', actionId);
    },
    
    updateActionAttempts: async (actionId: string, attempts: number) => {
      // Aktualizovat lokální stav
    set(state => ({
        queue: state.queue.map(action => 
          action.id === actionId 
            ? { ...action, attempts }
            : action
        )
      }));
      
      // Aktualizovat v IndexedDB - opravené názvy metod
      const action = get().queue.find(a => a.id === actionId);
      if (action) {
        const updatedAction = { ...action, attempts };
        await storageService.updateAction(updatedAction);
      }
      
        console.log('🔄 Počet pokusů aktualizován:', { akce: actionId, pokusy: `${attempts}/${action?.maxAttempts || 3}` });
    },
    
    loadQueue: async () => {
      try {
        const queuedActions = await storageService.loadActions();
        set({ queue: queuedActions, isLoaded: true });
        console.log('📥 Fronta načtena z IndexedDB:', queuedActions.length, 'isLoaded nastaveno na true');
      } catch (error) {
        console.error('❌ Chyba při načítání fronty:', error);
        set({ isLoaded: true });
    }
  },
  
    getFailedActions: (): QueuedAction[] => {
    return get().queue.filter(action => action.attempts >= action.maxAttempts);
  },
  
  clearQueue: async () => {
      try {
        const { queue } = get();
        
        // Smazat všechny akce z IndexedDB - opravené názvy metod
        for (const action of queue) {
          await storageService.removeAction(action.id);
        }
        
        // Vyčistit lokální stav a processing lock
        set({ 
          queue: [], 
          isProcessing: false,
          processingStartTime: undefined
        });
        
        console.log('🗑️ Fronta vyčištěna');
      } catch (error) {
        console.error('❌ Chyba při čištění fronty:', error);
      }
    }
  }))
);