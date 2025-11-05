import { authConfig } from './config';

/**
 * 🔒 ENHANCED AUTHENTICATION SYSTEM
 * 
 * Pro docházkový systém s požadavky:
 * - Jednoduché přihlášení při prvním spuštění
 * - 7-denní persistent session s activity refresh
 * - Ochrana před neoprávněným přístupem
 * - ŽÁDNÉ zobrazování PIN kódu
 * - Smart activity tracking
 */

interface AuthSession {
  authenticated: boolean;
  loginTime: string;
  expiresAt: string;
  sessionId: string;
  lastActivity: string; // NEW: Track last activity
}

class AuthService {
  private readonly STORAGE_KEY = 'dochazka-auth-session';
  private readonly PROTECTED_DATA_KEY = 'dochazka-data-protected';
  private readonly ACTIVITY_KEY = 'dochazka-last-activity';
  
  private currentSession: AuthSession | null = null;
  private activityTimer: number | null = null;

  /**
   * Jednoduchý hash pro basic security (ne production-grade crypto!)
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Vytvoří session hash z PIN + encryption key + timestamp
   */
  private createSessionHash(pin: string, timestamp: string): string {
    const combined = `${pin}:${authConfig.encryptionKey}:${timestamp}`;
    return this.simpleHash(combined);
  }

  /**
   * 🔄 ACTIVITY TRACKING: Zaznamenej aktivitu uživatele
   */
  private recordActivity(): void {
    const now = new Date().toISOString();
    localStorage.setItem(this.ACTIVITY_KEY, now);
    
    // Aktualizuj session pokud existuje
    if (this.currentSession) {
      this.currentSession.lastActivity = now;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentSession));
    }
  }

  /**
   * 📅 Získej čas poslední aktivity
   */
  private getLastActivity(): number {
    const lastActivity = localStorage.getItem(this.ACTIVITY_KEY);
    return lastActivity ? new Date(lastActivity).getTime() : 0;
  }

  /**
   * ⚡ SMART SESSION REFRESH: Prodlouží session při aktivitě
   */
  private smartRefreshSession(): void {
    if (!this.currentSession) return; // ✅ OPRAVA: Nerekurzivní kontrola

    const now = Date.now();
    const lastActivity = this.getLastActivity();
    const expiresAt = new Date(this.currentSession.expiresAt).getTime();
    
    // Pokud byla aktivita v posledních 30 minutách a session brzy vyprší
    const isRecentActivity = (now - lastActivity) < (30 * 60 * 1000); // 30 min
    const willExpireSoon = (expiresAt - now) < (2 * 24 * 60 * 60 * 1000); // 2 dny

    if (isRecentActivity && willExpireSoon) {
      // Prodlouž session o dalších 7 dní
      const newExpiresAt = new Date(now + (authConfig.sessionDurationHours * 60 * 60 * 1000)).toISOString();
      
      this.currentSession.expiresAt = newExpiresAt;
      this.currentSession.lastActivity = new Date().toISOString();
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentSession));
      
      console.log('🔄 Session auto-prodloužena díky aktivitě do:', newExpiresAt);
    }
  }

  /**
   * Zkontroluje platnost aktuální session
   */
  isAuthenticated(): boolean {
    try {
      const sessionData = localStorage.getItem(this.STORAGE_KEY);
      if (!sessionData) {
        console.log('🔒 Žádná session v localStorage');
        return false;
      }

      const session: AuthSession = JSON.parse(sessionData);
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);

      if (now > expiresAt) {
        console.log('🔒 Session vypršela:', session.expiresAt);
        this.logout();
        return false;
      }

      // Verify session integrity
      const expectedHash = this.createSessionHash(authConfig.pin, session.loginTime);
      if (session.sessionId !== expectedHash) {
        console.warn('🔒 Session hash mismatch - možná manipulace!');
        this.logout();
        return false;
      }

      this.currentSession = session;
      
      // SMART REFRESH při každé kontrole
      this.smartRefreshSession();
      
      console.log('✅ Session platná do:', session.expiresAt);
      return true;

    } catch (error) {
      console.error('❌ Chyba při ověřování session:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Přihlášení s PIN kódem
   * 🔒 SECURITY: PIN se NIKDE nezobrazuje!
   */
  async authenticate(inputPin: string): Promise<{ success: boolean; error?: string }> {
    if (!inputPin || inputPin.trim() === '') {
      return { success: false, error: 'Zadejte PIN kód' };
    }

    if (inputPin !== authConfig.pin) {
      console.warn("🔒 Nesprávný přihlašovací pokus zaznamenán");      return { success: false, error: 'Nesprávný PIN kód' };
    }

    try {
      const loginTime = new Date().toISOString();
      const expiresAt = new Date(Date.now() + (authConfig.sessionDurationHours * 60 * 60 * 1000)).toISOString();
      const sessionId = this.createSessionHash(inputPin, loginTime);

      const session: AuthSession = {
        authenticated: true,
        loginTime,
        expiresAt,
        sessionId,
        lastActivity: loginTime // Zaznamenaj aktivitu při přihlášení
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      this.currentSession = session;
      this.recordActivity(); // Zaznamenaj aktivitu

      // Unlockuj protected data pokud existují
      await this.unlockProtectedData();

      console.log('✅ Uživatel přihlášen, session platná do:', expiresAt);
      return { success: true };

    } catch (error) {
      console.error('❌ Chyba při přihlašování:', error);
      return { success: false, error: 'Chyba při přihlašování' };
    }
  }

  /**
   * Odhlášení a vyčištění session
   */
  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.ACTIVITY_KEY);
    this.currentSession = null;
    
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
    
    console.log('🔒 Uživatel odhlášen');
  }

  /**
   * 🔄 ENHANCED: Prodloužení session při manuální aktivitě
   */
  refreshSession(): void {
    if (!this.currentSession) return;

    try {
      // Zaznamenej aktivitu
      this.recordActivity();
      
      // Prodlouž session
      const expiresAt = new Date(Date.now() + (authConfig.sessionDurationHours * 60 * 60 * 1000)).toISOString();
      
      this.currentSession.expiresAt = expiresAt;
      this.currentSession.lastActivity = new Date().toISOString();
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentSession));
      
      console.log('🔄 Session manuálně prodloužena do:', expiresAt);
    } catch (error) {
      console.error('❌ Chyba při prodlužování session:', error);
    }
  }

  /**
   * Získání informací o session (BEZ SENSITÍVNÍCH DAT!)
   */
  getSessionInfo(): { isAuthenticated: boolean; expiresAt?: string; timeLeft?: string; daysLeft?: number } {
    if (!this.isAuthenticated() || !this.currentSession) {
      return { isAuthenticated: false };
    }

    const expiresAt = new Date(this.currentSession.expiresAt);
    const now = new Date();
    const timeLeftMs = expiresAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeLeftMs / (1000 * 60 * 60 * 24));

    return {
      isAuthenticated: true,
      expiresAt: this.currentSession.expiresAt,
      timeLeft: daysLeft > 1 ? `${daysLeft} dní` : `${Math.round(timeLeftMs / (1000 * 60 * 60))}h`,
      daysLeft: daysLeft
    };
  }

  /**
   * 🔐 OCHRANA DAT: Zaškodí přístup k citlivým datům když není přihlášen
   */
  async protectSensitiveData(): Promise<void> {
    if (this.isAuthenticated()) return;

    console.log('🔐 Aktivuji ochranu citlivých dat...');
    
    // Označit data jako chráněná
    localStorage.setItem(this.PROTECTED_DATA_KEY, 'true');
  }

  /**
   * 🔓 ODEMČENÍ DAT: Po úspěšném přihlášení
   */
  private async unlockProtectedData(): Promise<void> {
    localStorage.removeItem(this.PROTECTED_DATA_KEY);
    console.log('🔓 Citlivá data odemčena');
  }

  /**
   * Zjistí, zda jsou data právě chráněná
   */
  isDataProtected(): boolean {
    return localStorage.getItem(this.PROTECTED_DATA_KEY) === 'true';
  }

  /**
   * 🎯 ENHANCED: Auto-refresh session při aktivitě uživatele
   */
  setupAutoRefresh(): void {
    // Refresh session při mouse/touch/keyboard aktivitě
    const refreshEvents = ['mousedown', 'touchstart', 'keydown', 'click'];
    
    const handleUserActivity = () => {
      if (this.isAuthenticated()) {
        this.recordActivity(); // Zaznamenej každou aktivitu
        this.smartRefreshSession(); // Smart refresh
      }
    };

    refreshEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Periodická kontrola session (každých 10 minut)
    this.activityTimer = setInterval(() => {
      if (this.isAuthenticated()) {
        this.smartRefreshSession();
      }
    }, 10 * 60 * 1000); // 10 minut

    console.log('🔄 Enhanced auto-refresh session nastaven (7-denní s aktivitou)');
  }

  /**
   * Kontrola session při page visibility (tab switch)
   */
  setupVisibilityCheck(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Tab se stal aktivní - zkontroluj session
        if (!this.isAuthenticated()) {
          console.log('🔒 Session neplatná při návratu do tabu');
          // Trigger re-auth flow
          window.location.reload();
        } else {
          // Zaznamenej aktivitu při návratu do tabu
          this.recordActivity();
        }
      }
    });

    console.log('👁️ Enhanced visibility check nastaven');
  }
}

// Singleton instance
export const authService = new AuthService();

// Auto-setup při importu
if (typeof window !== 'undefined') {
  authService.setupAutoRefresh();
  authService.setupVisibilityCheck();
  
  console.log('🔒 Enhanced Auth service inicializován - 7 dní s activity tracking');
}

export default authService;
