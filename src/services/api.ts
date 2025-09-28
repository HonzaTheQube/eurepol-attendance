import type { 
  InitialDataResponse, 
  AttendanceActionRequest,
  CompletionWebhookRequest
} from '../types';
import { appConfig } from './config';

export class APIError extends Error {
  public status?: number;
  public response?: any;
  
  constructor(message: string, status?: number, response?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}


class APIService {
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit = {}, 
    timeoutMs: number = 10000
  ): Promise<Response> {
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new APIError(
          `HTTP Error: ${response.status} ${response.statusText}`,
          response.status,
          response
        );
      }
      
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new APIError(`Request timeout after ${timeoutMs}ms`);
      }
      
      throw new APIError(
        `Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Získá inicializační data
   */
  async getInitialData(): Promise<InitialDataResponse> {
    console.log('📡 Načítám inicializační data...');
    
    try {
      const response = await this.fetchWithTimeout(
        appConfig.api.endpoints.getInitialData,
        { method: 'GET' },
        15000
      );
      
      const data = await response.json();
      
      const normalizedData: InitialDataResponse = {
        employees: Array.isArray(data.employees) ? data.employees : [],
        emptyAttendance: Array.isArray(data.emptyAttendance) ? data.emptyAttendance : [],
        activities: Array.isArray(data.activities) ? data.activities : [] // NOVÁ property
      };
      
      console.log('✅ Inicializační data načtena:', {
        employeesCount: normalizedData.employees.length,
        activeAttendanceCount: normalizedData.emptyAttendance.length,
        activitiesCount: normalizedData.activities.length // NOVÁ property
      });
      
      return normalizedData;
      
    } catch (error) {
      console.error('❌ Chyba při načítání inicializačních dat:', error);
      throw error;
    }
  }



  /**
   * Vytvoří nový záznam v SmartSuite
   */
  async createAttendanceRecord(employeeID: string, attendanceStart: string, attendanceEnd?: string, activityID?: string): Promise<string> {
    console.log('📝 Volám completion webhook (8118) - action=create:', { employeeID, attendanceStart, attendanceEnd, activityID });
    
    const payload: CompletionWebhookRequest = {
      action: 'create',
      attendanceData: {
        employeeID,
        attendanceStart,
        attendanceEnd: attendanceEnd || "",
        ...(activityID && { activityID }) // Pouze pokud je activityID zadáno
      }
    };
    
    const url = `${appConfig.api.endpoints.completionWebhook}?action=create`;
    
    console.log('📤 Odesílám na completion webhook:', { url, payload });
    
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    console.log('📥 Odpověď z completion webhook received');
    
    const result = await response.json();
    
    console.log('📋 Odpověď z completion webhook:', result);
    
    // Webhook vrací přímo: {"attendanceID": "..."}
    if (!result.attendanceID) {
      throw new Error(`Chyba při vytváření záznamu - nevráceno attendanceID: ${JSON.stringify(result)}`);
    }
    
    console.log('✅ Completion webhook úspěšný - attendanceID:', result.attendanceID);
    return result.attendanceID;
  }

  /**
   * Aktualizuje existující záznam v SmartSuite
   */
  async updateAttendanceRecord(attendanceID: string, attendanceEnd: string, activityID?: string): Promise<void> {
    console.log('📝 Aktualizuji záznam v SmartSuite:', { attendanceID, attendanceEnd, activityID });
    
    const payload: CompletionWebhookRequest = {
      action: 'update',
      attendanceData: {
        attendanceID,
        employeeID: '',
        attendanceStart: '',
        attendanceEnd,
        ...(activityID && { activityID }) // Pouze pokud je activityID zadáno
      }
    };
    
    const url = `${appConfig.api.endpoints.completionWebhook}?action=update`;
    
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    // Pro update operace webhook může vracet jen potvrzení
    console.log('✅ Záznam aktualizován v SmartSuite:', attendanceID, result);
  }


  /**
   * HLAVNÍ METODA: Zápis akce s jednoduchým přepsáním seznamu
   */
  async logAttendanceAction(action: AttendanceActionRequest): Promise<{ attendanceID?: string }> {
    console.log('📝 ZAČÍNÁM duální webhook flow:', action);
    
    try {
      let attendanceID: string | undefined;
      
      // LOCAL-FIRST: Nepoužíváme starý endpoint - pracujeme jen s completion webhook
      
      if (action.action === 'start') {
        // START: Vytvoř nový záznam v SmartSuite
        console.log('🟢 START: Volám completion webhook (create)...');
        attendanceID = await this.createAttendanceRecord(
          action.employeeID, 
          action.timestamp,
          undefined, // attendanceEnd je undefined pro START
          action.activityID // NOVÁ property pro reportování aktivity
        );
        
        console.log('✅ START dokončen - attendanceID získáno:', attendanceID);
        
      } else if (action.action === 'stop') {
        
        if (action.attendanceID) {
          // NORMÁLNÍ STOP: UPDATE existujícího záznamu
          console.log('🔴 STOP (UPDATE): Aktualizuji existující záznam:', action.attendanceID);
          await this.updateAttendanceRecord(action.attendanceID, action.timestamp, action.activityID);
          console.log('✅ STOP (UPDATE) dokončen');
          
        } else {
          // OFFLINE STOP: CREATE s oběma časy
          if (!action.attendanceStart) {
            console.error('❌ STOP bez attendanceID a bez attendanceStart - nelze vytvořit kompletní záznam');
            throw new Error('STOP bez attendanceID vyžaduje attendanceStart pro offline CREATE');
          }
          
          console.warn('⚠️ STOP offline scénář - vytvářím kompletní záznam s oběma časy');
          attendanceID = await this.createAttendanceRecord(
            action.employeeID,
            action.attendanceStart,
            action.timestamp,
            action.activityID // NOVÁ property pro reportování aktivity
          );
          
          console.log('✅ STOP (offline CREATE) dokončen - attendanceID:', attendanceID);
        }
      }
      
      console.log('🎯 COMPLETION WEBHOOK FLOW DOKONČEN!', {
        action: action.action,
        attendanceID
      });
      
      return { attendanceID };
      
    } catch (error) {
      console.error('❌ Chyba při zápisu akce:', error);
      throw error;
    }
  }

}

export const apiService = new APIService();