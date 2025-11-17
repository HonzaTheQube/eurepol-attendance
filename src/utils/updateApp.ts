/**
 * Sdílená funkce pro aktualizaci aplikace
 * Používá se z:
 * - UpdatePrompt (banner při nové verzi)
 * - WelcomeScreen admin menu (manuální aktualizace)
 */
export async function updateApp(): Promise<void> {
  console.log('🔄 === AKTUALIZACE APLIKACE ZAHÁJENA ===');
  
  try {
    // 1. AKTUALIZACE DAT ze serveru
    console.log('📊 Krok 1/2: Stahování nových dat ze serveru...');
    
    const { useAppStore } = await import('../store');
    const beforeSync = useAppStore.getState().localEmployees;
    
    await useAppStore.getState().syncWithAPI();
    
    const afterSync = useAppStore.getState().localEmployees;
    console.log('✅ Data aktualizována:', {
      totalEmployees: afterSync.size,
      atWork: Array.from(afterSync.values()).filter(e => e.isAtWork).length,
      změny: afterSync.size !== beforeSync.size
    });
    
    // 2. REFRESH STRÁNKY
    // Tím se:
    // - Načte nový JavaScript kód (pokud byl deploy)
    // - Service Worker se aktualizuje automaticky (autoUpdate mode)
    // - IndexedDB data ZŮSTANOU (session, pracovní stavy, fronta)
    console.log('🔄 Krok 2/2: Refreshuji stránku pro načtení nového kódu...');
    console.log('✅ ZACHOVÁ SE: Session, pracovní stavy, čekající akce');
    
    // Malý delay aby se logy stihly vypsat
    setTimeout(() => {
      console.log('🔄 RELOAD TEĎKA!');
      window.location.reload();
    }, 300);
    
  } catch (error) {
    console.error('❌ CHYBA při aktualizaci aplikace:', error);
    console.error('Stack trace:', error);
    
    // Zobrazit chybu uživateli
    alert(`❌ Chyba při aktualizaci:\n\n${error instanceof Error ? error.message : 'Neznámá chyba'}\n\nZkuste to prosím znovu nebo refreshněte stránku (Ctrl+R).`);
    
    throw error; // Re-throw pro volající funkci
  }
}

