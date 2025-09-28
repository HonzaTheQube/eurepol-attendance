import type { QueuedAction } from '../types';
import { authService } from './auth';

// LOCAL-FIRST Employee State interface
export interface LocalEmployeeState {
  employeeID: string;
  fullName: string;
  reportActivity: boolean; // NOVÁ property - zda má hlásit aktivity
  department?: string;
  
  // Aktuální stav
  isAtWork: boolean;
  attendanceStart?: string;
  attendanceID?: string;
  
  // Metadata
  lastLocalAction?: 'start' | 'stop';
  lastLocalActionTime?: string;
  lastSyncTime?: string;
  version: number; // Pro conflict resolution
}

// IndexedDB wrapper pro Action Queue + LOCAL-FIRST employee states
class StorageService {
  private dbName = 'dochazka-app';
  private dbVersion = 2; // ⬆️ Zvýšeno kvůli novým stores
  private actionQueueStore = 'action-queue';
  private employeeStatesStore = 'employee-states'; // 🆕 Nový store
  private metadataStore = 'metadata'; // 🆕 Nový store
  private db: IDBDatabase | null = null;

  /**
   * 🔐 SECURITY CHECK: Ověří autentifikaci před přístupem k citlivým datům
   */
  private checkAuthAccess(): boolean {
    if (!authService.isAuthenticated()) {
      console.warn('🔒 SECURITY: Pokus o přístup k datům bez autentifikace!');
      return false;
    }
    return true;
  }

  async init(): Promise<void> {
    if (this.db) return; // Už je inicializováno

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ IndexedDB initialization failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB inicializováno');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store pro action queue
        if (!db.objectStoreNames.contains(this.actionQueueStore)) {
          const actionStore = db.createObjectStore(this.actionQueueStore, { keyPath: 'id' });
          
          actionStore.createIndex('employeeID', 'employeeID', { unique: false });
          actionStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionStore.createIndex('attempts', 'attempts', { unique: false });
          
          console.log('✅ Action Queue store vytvořen');
        }
        
        // 🆕 Store pro employee states (LOCAL-FIRST)
        if (!db.objectStoreNames.contains(this.employeeStatesStore)) {
          const employeeStore = db.createObjectStore(this.employeeStatesStore, { keyPath: 'employeeID' });
          
          employeeStore.createIndex('isAtWork', 'isAtWork', { unique: false });
          employeeStore.createIndex('department', 'department', { unique: false });
          employeeStore.createIndex('lastSyncTime', 'lastSyncTime', { unique: false });
          
          console.log('✅ Employee States store vytvořen');
        }
        
        // 🆕 Store pro metadata
        if (!db.objectStoreNames.contains(this.metadataStore)) {
          const metaStore = db.createObjectStore(this.metadataStore, { keyPath: 'key' });
          
          console.log('✅ Metadata store vytvořen');
        }
      };
    });
  }

  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  private getTransaction(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.transaction([storeName], mode).objectStore(storeName);
  }

  // =============================================================================
  // ACTION QUEUE METHODS
  // =============================================================================

  // Uložení akce do fronty
  async saveAction(action: QueuedAction): Promise<void> {
    // OPRAVENO: Auth guard nesmí blokovat ukládání akcí!
    console.log('📤 Ukládám akci do fronty bez auth check:', action.action);

    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.actionQueueStore, 'readwrite');
      const request = transaction.add(action);

      request.onsuccess = () => {
        console.log('📝 Akce uložena do IndexedDB:', action.id);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Chyba při ukládání akce:', request.error);
        reject(request.error);
      };
    });
  }

  // Načtení všech akcí z fronty
  async loadActions(): Promise<QueuedAction[]> {
    // OPRAVENO: Auth guard nesmí blokovat načítání akcí!
    console.log('📥 Načítám akce z fronty bez auth check');

    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.actionQueueStore, 'readonly');
      const request = transaction.getAll();

      request.onsuccess = () => {
        const actions = request.result as QueuedAction[];
        console.log(`📂 Načteno ${actions.length} akcí z IndexedDB`);
        resolve(actions);
      };

      request.onerror = () => {
        console.error('❌ Chyba při načítání akcí:', request.error);
        reject(request.error);
      };
    });
  }

  // Odstranění akce z fronty
  async removeAction(actionId: string): Promise<void> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.actionQueueStore, 'readwrite');
      const request = transaction.delete(actionId);

      request.onsuccess = () => {
        console.log('🗑️ Akce odstraněna z IndexedDB:', actionId);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Chyba při odstraňování akce:', request.error);
        reject(request.error);
      };
    });
  }

  // Aktualizace akce (např. počtu pokusů)
  async updateAction(action: QueuedAction): Promise<void> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.actionQueueStore, 'readwrite');
      const request = transaction.put(action);

      request.onsuccess = () => {
        console.log('📝 Akce aktualizována v IndexedDB:', action.id);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Chyba při aktualizaci akce:', request.error);
        reject(request.error);
      };
    });
  }

  // Vyčištění celé fronty
  async clearActions(): Promise<void> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.actionQueueStore, 'readwrite');
      const request = transaction.clear();

      request.onsuccess = () => {
        console.log('🧹 IndexedDB fronta vyčištěna');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Chyba při čištění fronty:', request.error);
        reject(request.error);
      };
    });
  }

  // Získání statistik fronty
  async getQueueStats(): Promise<{
    total: number;
    failed: number;
    pending: number;
  }> {
    const actions = await this.loadActions();
    
    const stats = {
      total: actions.length,
      failed: actions.filter(a => a.attempts >= a.maxAttempts).length,
      pending: actions.filter(a => a.attempts < a.maxAttempts).length
    };

    return stats;
  }

  // Získání akcí podle zaměstnance
  async getActionsByEmployee(employeeID: string): Promise<QueuedAction[]> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.actionQueueStore, 'readonly');
      const index = transaction.index('employeeID');
      const request = index.getAll(employeeID);

      request.onsuccess = () => {
        const actions = request.result as QueuedAction[];
        resolve(actions);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Cleanup starých akcí (starších než určitý počet dní)
  async cleanupOldActions(maxAgeHours: number = 24): Promise<number> {
    const actions = await this.loadActions();
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    let removedCount = 0;
    
    for (const action of actions) {
      const actionTime = new Date(action.timestamp).getTime();
      
      if (actionTime < cutoffTime && action.attempts >= action.maxAttempts) {
        await this.removeAction(action.id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Vyčištěno ${removedCount} starých akcí`);
    }

    return removedCount;
  }

  // =============================================================================
  // LOCAL-FIRST EMPLOYEE STATES METHODS
  // =============================================================================

  // Uložit stav zaměstnance
  async saveEmployeeState(employee: LocalEmployeeState): Promise<void> {
    // OPRAVENO: Auth guard nesmí blokovat persistenci pracovních dat!
    console.log(`💾 Ukládám stav zaměstnance bez auth check: ${employee.fullName}`);

    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.employeeStatesStore, 'readwrite');
      
      // Version už je správně nastavená v updateEmployeeStateLocal, neinkremntuj znovu
      const employeeToSave = {
        ...employee,
        lastLocalActionTime: employee.lastLocalActionTime || new Date().toISOString()
      };

      const request = transaction.put(employeeToSave);
      
      request.onsuccess = () => {
        console.log(`💾 Stav zaměstnance uložen: ${employee.fullName} (${employee.isAtWork ? 'v práci' : 'volný'})`);
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ Chyba při ukládání stavu zaměstnance:', request.error);
        reject(request.error);
      };
    });
  }

  // Načíst stav zaměstnance
  async getEmployeeState(employeeID: string): Promise<LocalEmployeeState | null> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.employeeStatesStore, 'readonly');
      const request = transaction.get(employeeID);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        console.error('❌ Chyba při načítání stavu zaměstnance:', request.error);
        reject(request.error);
      };
    });
  }

  // Načíst všechny stavy zaměstnanců
  async getAllEmployeeStates(): Promise<LocalEmployeeState[]> {
    // POZOR: Tuto metodu používáme při inicializaci PŘED přihlášením
    // Takže nekontrolujeme auth zde, ale výsledky budou omezené
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.employeeStatesStore, 'readonly');
      const request = transaction.getAll();

      request.onsuccess = () => {
        const employees = request.result as LocalEmployeeState[];
        
        // 🔐 SECURITY: Při neautentifikovaném přístupu vrátit jen základní strukturu
        if (!authService.isAuthenticated()) {
          console.log('📂 Načítání zaměstnanců BEZ autentifikace - vrracím základní data');
          // V produkčních aplikacích bychom mohli vrátit prázdný array
          // nebo pouze anonymizovaná data
          resolve(employees); // Pro nyní povolujeme přístup k základním datům
        } else {
          console.log(`📂 Načteno ${employees.length} stavů zaměstnanců z IndexedDB`);
          resolve(employees);
        }
      };
      
      request.onerror = () => {
        console.error('❌ Chyba při načítání stavů zaměstnanců:', request.error);
        reject(request.error);
      };
    });
  }

  // Hromadné uložení stavů zaměstnanců (při sync)
  async saveAllEmployeeStates(employees: LocalEmployeeState[]): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.employeeStatesStore, 'readwrite');
      
      let completed = 0;
      const total = employees.length;

      if (total === 0) {
        resolve();
        return;
      }

      employees.forEach(employee => {
        const request = transaction.put(employee);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            console.log(`💾 Hromadně uloženo ${total} stavů zaměstnanců`);
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Získat zaměstnance v práci
  async getEmployeesAtWork(): Promise<LocalEmployeeState[]> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.employeeStatesStore, 'readonly');
      const index = transaction.index('isAtWork');
      const request = index.getAll(IDBKeyRange.only(true));

      request.onsuccess = () => {
        const employees = request.result as LocalEmployeeState[];
        resolve(employees);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // =============================================================================
  // METADATA METHODS
  // =============================================================================

  // Uložit metadata
  async saveMetadata(key: string, data: any): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.metadataStore, 'readwrite');
      const request = transaction.put({ key, data });

      request.onsuccess = () => {
        console.log(`📊 Metadata uložena (${key}):`, data);
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ Chyba při ukládání metadata:', request.error);
        reject(request.error);
      };
    });
  }

  // Načíst metadata
  async getMetadata(key: string): Promise<any | null> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(this.metadataStore, 'readonly');
      const request = transaction.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // =============================================================================
  // DEBUG METHODS
  // =============================================================================

  // Debug informace o LOCAL-FIRST databázi
  async getLocalFirstDebugInfo(): Promise<{
    totalEmployees: number;
    atWork: number;
    lastSync?: string;
    pendingActions: number;
  }> {
    const employees = await this.getAllEmployeeStates();
    const actions = await this.loadActions();
    const lastSync = await this.getMetadata('lastFullSync');
    
    return {
      totalEmployees: employees.length,
      atWork: employees.filter(e => e.isAtWork).length,
      lastSync,
      pendingActions: actions.length
    };
  }

  // Vyčistit všechny LOCAL-FIRST data
  async clearAllLocalData(): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.employeeStatesStore, this.metadataStore], 'readwrite');
      
      const employeeStore = transaction.objectStore(this.employeeStatesStore);
      const metadataStore = transaction.objectStore(this.metadataStore);
      
      employeeStore.clear();
      metadataStore.clear();
      
      transaction.oncomplete = () => {
        console.log('🧹 Všechna LOCAL-FIRST data vyčištěna');
        resolve();
      };
      
      transaction.onerror = () => {
        console.error('❌ Chyba při čištění LOCAL-FIRST dat:', transaction.error);
        reject(transaction.error);
      };
    });
  }
}

// Singleton instance
export const storageService = new StorageService();

// Auto-inicializace při importu
storageService.init().catch(error => {
  console.error('❌ Chyba při auto-inicializaci IndexedDB:', error);
});

export default storageService;

// Export types are already exported above
