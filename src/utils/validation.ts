import type { Employee, AttendanceActionRequest, QueuedAction } from '../types';

/**
 * Validace ID zaměstnance
 */
export function isValidEmployeeID(employeeID: string): boolean {
  if (!employeeID || typeof employeeID !== 'string') {
    return false;
  }
  
  // SmartSuite ID je obvykle 24 hexadecimálních znaků
  const smartSuiteIdPattern = /^[a-f0-9]{24}$/i;
  
  return smartSuiteIdPattern.test(employeeID.trim());
}

/**
 * Validace objektu zaměstnance
 */
export function isValidEmployee(employee: any): employee is Employee {
  return (
    typeof employee === 'object' &&
    employee !== null &&
    isValidEmployeeID(employee.employeeID) &&
    typeof employee.fullName === 'string'
  );
}

/**
 * Validace attendance action requestu
 */
export function isValidAttendanceRequest(request: any): request is AttendanceActionRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    isValidEmployeeID(request.employeeID) &&
    (request.action === 'start' || request.action === 'stop') &&
    typeof request.timestamp === 'string' &&
    isValidTimestamp(request.timestamp)
  );
}

/**
 * Validace queued action
 */
export function isValidQueuedAction(action: any): action is QueuedAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    typeof action.id === 'string' &&
    action.id.length > 0 &&
    isValidEmployeeID(action.employeeID) &&
    (action.action === 'start' || action.action === 'stop') &&
    typeof action.timestamp === 'string' &&
    isValidTimestamp(action.timestamp) &&
    typeof action.attempts === 'number' &&
    action.attempts >= 0 &&
    typeof action.maxAttempts === 'number' &&
    action.maxAttempts > 0
  );
}

/**
 * Validace timestamp
 */
export function isValidTimestamp(timestamp: string): boolean {
  if (!timestamp || typeof timestamp !== 'string') {
    return false;
  }
  
  try {
    const date = new Date(timestamp);
    
    // Kontrola platnosti
    if (isNaN(date.getTime())) {
      return false;
    }
    
    const now = new Date();
    
    // Timestamp nesmí být z budoucnosti (s tolerancí 5 minut)
    const maxFutureTime = new Date(now.getTime() + 5 * 60 * 1000);
    if (date.getTime() > maxFutureTime.getTime()) {
      return false;
    }
    
    // Timestamp nesmí být starší než 30 dní
    const minPastTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (date.getTime() < minPastTime.getTime()) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validace NFC chip ID
 */
export function isValidNFCChipID(chipId: string): boolean {
  if (!chipId || typeof chipId !== 'string') {
    return false;
  }
  
  const cleanId = chipId.trim();
  
  // NFC ID obvykle obsahuje pouze alfanumerické znaky
  const nfcPattern = /^[a-zA-Z0-9]{4,32}$/;
  
  return nfcPattern.test(cleanId) && cleanId.length >= 4;
}


/**
 * Sanitizace textu pro bezpečné zobrazení
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Odstranění HTML značek
    .slice(0, 100); // Omezení délky
}

/**
 * Sanitizace jména zaměstnance
 */
export function sanitizeEmployeeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'Neznámý zaměstnanec';
  }
  
  const sanitized = name
    .trim()
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ') // Normalizace whitespace
    .slice(0, 50); // Max délka jména
  
  return sanitized || 'Neznámý zaměstnanec';
}

/**
 * Validace API response struktur
 */
export function isValidInitialDataResponse(data: any): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.employees) &&
    Array.isArray(data.emptyAttendance) &&
    data.employees.every(isValidEmployee)
  );
}


/**
 * Debug validační funkce
 */
export function validateAndLog<T>(
  data: any,
  validator: (data: any) => data is T,
  context: string
): data is T {
  const isValid = validator(data);
  
  if (!isValid && import.meta.env.DEV) {
    console.warn(`⚠️ Validation failed for ${context}:`, data);
  }
  
  return isValid;
}

/**
 * Utility pro deep validation objektů
 */
export function isValidObject(obj: any, requiredFields: string[]): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  return requiredFields.every(field => {
    const value = obj[field];
    return value !== undefined && value !== null;
  });
}
