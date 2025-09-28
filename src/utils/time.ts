import type { TimeInfo } from '../types';

/**
 * Získá aktuální informace o čase pro aplikaci
 */
export function getCurrentTimeInfo(): TimeInfo {
  const now = new Date();
  
  return {
    currentTime: now.toISOString(),
    formattedTime: now.toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    formattedDate: now.toLocaleDateString('cs-CZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

/**
 * Formátuje timestamp pro zobrazení uživateli
 */
export function formatTimestamp(
  timestamp: string,
  options: {
    includeDate?: boolean;
    includeSeconds?: boolean;
    relative?: boolean;
  } = {}
): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  const {
    includeDate = false,
    includeSeconds = false,
    relative = false
  } = options;
  
  // Relativní čas (např. "před 5 minutami")
  if (relative) {
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'právě teď';
    if (diffMinutes < 60) return `před ${diffMinutes} min`;
    if (diffHours < 24) return `před ${diffHours} h`;
    if (diffDays < 7) return `před ${diffDays} dny`;
    
    // Starší než týden - zobrazíme datum
    return date.toLocaleDateString('cs-CZ');
  }
  
  // Standardní formát
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' })
  };
  
  if (includeDate) {
    return date.toLocaleDateString('cs-CZ', {
      ...timeOptions,
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  }
  
  return date.toLocaleTimeString('cs-CZ', timeOptions);
}

/**
 * Zjistí, zda je timestamp z dnešního dne
 */
export function isToday(timestamp: string): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Zjistí, zda je timestamp z včerejška
 */
export function isYesterday(timestamp: string): boolean {
  const date = new Date(timestamp);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return date.getDate() === yesterday.getDate() &&
         date.getMonth() === yesterday.getMonth() &&
         date.getFullYear() === yesterday.getFullYear();
}

/**
 * Vypočítá délku práce mezi dvěma časovými razítky
 */
export function calculateWorkDuration(
  startTime: string,
  endTime?: string
): {
  duration: number; // v milisekundách
  formattedDuration: string;
} {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  
  const duration = end.getTime() - start.getTime();
  
  if (duration < 0) {
    return {
      duration: 0,
      formattedDuration: '0:00'
    };
  }
  
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    duration,
    formattedDuration: `${hours}:${minutes.toString().padStart(2, '0')}`
  };
}

/**
 * Validuje, že timestamp je rozumný (ne příliš starý ani z budoucnosti)
 */
export function isValidTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Kontrola platnosti
    if (isNaN(date.getTime())) return false;
    
    // Nesmí být z budoucnosti (s tolerancí 1 minuta)
    if (date.getTime() > now.getTime() + 60000) return false;
    
    // Nesmí být starší než 7 dní
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    if (date.getTime() < sevenDaysAgo.getTime()) return false;
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Vytvoří ISO timestamp pro aktuální čas
 */
export function createTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Normalizuje timestamp na začátek dne (00:00:00)
 */
export function getStartOfDay(timestamp: string): string {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

/**
 * Normalizuje timestamp na konec dne (23:59:59)
 */
export function getEndOfDay(timestamp: string): string {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

/**
 * Utility pro práci s časovými zónami
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * Konvertuje UTC timestamp na lokální čas
 */
export function utcToLocal(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  return date.toISOString();
}

/**
 * Debug utility - loguje čas s popisem
 */
export function logTime(message: string, timestamp?: string): void {
  const time = timestamp ? new Date(timestamp) : new Date();
  console.log(`⏰ ${message}:`, time.toLocaleString('cs-CZ'));
}
