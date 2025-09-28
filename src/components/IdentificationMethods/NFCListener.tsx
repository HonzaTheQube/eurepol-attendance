import { useEffect } from 'react';

/**
 * NFCListener běží na pozadí a poslouchá HID keyboard input od NFC čtečky
 * Žádné UI - jen background listener
 */
export function NFCListener() {
  useEffect(() => {
    let inputBuffer = '';
    let inputTimer: ReturnType<typeof setTimeout>;

    console.log('📡 NFC Listener aktivován - poslouchám keyboard input...');

    // Listener pro HID keyboard emulation od NFC čtečky
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorujeme speciální klávesy a kombinace
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Ignorujeme klávesy když je aktivní input field
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      // Enter nebo nový řádek označuje konec vstupu z NFC
      if (event.key === 'Enter' || event.key === '\n') {
        // ✅ VŽDY prevent ENTER - i prázdný buffer (zamezí reload)
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        if (inputBuffer.length > 0) {
          console.log('🔑 NFC ENTER s daty:', inputBuffer);
          handleNFCInput(inputBuffer.trim());
          inputBuffer = '';
        } else {
          console.log('🔑 NFC ENTER prázdný - blokován reload');
        }
        return false;
      }

      // Smazání předchozího timeru
      clearTimeout(inputTimer);

      // Přidáme znak do bufferu (pouze alfanumerické znaky)
      if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
        event.preventDefault(); // Zabráníme zobrazení znaku v UI
        inputBuffer += event.key;
        
        // Timer pro automatické zpracování POUZE pro dlouhé NFC ID (pokud nepřijde Enter)
        inputTimer = setTimeout(() => {
          if (inputBuffer.length >= 20) { // Dlouhé NFC ID - reálné čipy mají 20+ znaků
            handleNFCInput(inputBuffer.trim());
            inputBuffer = '';
          }
        }, 2000); // 2 sekundy timeout - delší než normální psaní
      }
    };

    const handleNFCInput = async (chipId: string) => {
      console.log('📡 NFC chip detekován:', chipId);
      
      try {
        // Import validation utilities and store
        const { isValidNFCChipID } = await import('../../utils/validation');
        const { useAppStore } = await import('../../store');
        
        if (!isValidNFCChipID(chipId)) {
          console.warn('⚠️ Neplatné NFC chip ID:', chipId);
          return;
        }
        
        const { getEmployeeByTagID, setCurrentScreen, setSelectedEmployee, setError } = useAppStore.getState();
        
        console.log('⚡ LOCAL-FIRST lookup zaměstnance podle NFC tagID:', chipId);
        
        try {
          // LOCAL-FIRST: okamžitý lookup podle tagID (0ms) místo API volání
          const employeeWithStatus = getEmployeeByTagID(chipId);
        
          if (employeeWithStatus) {
            console.log('✅ LOCAL-FIRST zaměstnanec nalezen okamžitě:', employeeWithStatus.fullName);
            
            setSelectedEmployee(employeeWithStatus);
            setCurrentScreen('employee-action');
          } else {
            console.warn('⚠️ Zaměstnanec s NFC tagID nenalezen v lokální databázi:', chipId);
            
            // Zobrazit chybovou zprávu uživateli
            setError(`Zaměstnanec s NFC tagID "${chipId}" nebyl nalezen v lokální databázi.`);
            setCurrentScreen('error');
            
            // Automatický návrat na welcome po 3 sekundách
            setTimeout(() => {
              const { setError, setCurrentScreen } = useAppStore.getState();
              setError(undefined);
              setCurrentScreen('welcome');
            }, 3000);
          }
        } catch (error) {
          console.error('❌ Chyba při LOCAL-FIRST lookup z NFC:', error);
          
          // Zobrazit chybovou zprávu
          setError('Chyba při načítání stavu zaměstnance z lokální databáze.');
          setCurrentScreen('error');
          
          // Automatický návrat na welcome po 3 sekundách
          setTimeout(() => {
            const { setError, setCurrentScreen } = useAppStore.getState();
            setError(undefined);
            setCurrentScreen('welcome');
          }, 3000);
        }
        
      } catch (error) {
        console.error('❌ Kritická chyba při NFC zpracování:', error);
        
        // Pro kritické chyby také zobrazit error screen
        const { setError, setCurrentScreen } = useAppStore.getState();
        setError('Kritická chyba při zpracování NFC. Zkuste to prosím znovu.');
        setCurrentScreen('error');
        
        setTimeout(() => {
          const { setError, setCurrentScreen } = useAppStore.getState();
          setError(undefined);
          setCurrentScreen('welcome');
        }, 3000);
      }
    };

    // Přidání event listeneru na document s passive: false pro preventDefault
    document.addEventListener('keydown', handleKeyDown, { 
      capture: true, 
      passive: false // Povolí preventDefault pro zamezení reload
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { 
        capture: true, 
        passive: false 
      });
      clearTimeout(inputTimer);
      console.log('📡 NFC Listener deaktivován');
    };
  }, []);

  // Žádné UI - jen background listener
  return null;
}
