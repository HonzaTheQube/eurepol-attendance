import type { AppConfig } from '../types';

// Security: Environment variables validation
const validateEnvVar = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${name}. Check your .env file.`);
  }
  return value;
};

// Secure API configuration from environment variables
export const appConfig: AppConfig = {
  api: {
    baseUrl: validateEnvVar('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
    endpoints: {
      // Inicializační data - LOCAL-FIRST první sync
      getInitialData: validateEnvVar('VITE_API_INITIAL_DATA_ENDPOINT', import.meta.env.VITE_API_INITIAL_DATA_ENDPOINT),
      
      // Completion webhook - trvalý zápis do SmartSuite
      completionWebhook: validateEnvVar('VITE_API_COMPLETION_WEBHOOK_ENDPOINT', import.meta.env.VITE_API_COMPLETION_WEBHOOK_ENDPOINT)
    }
  },
  hardware: {
    nfcTimeout: 5000     // 5 sekund timeout pro NFC
  },
  ui: {
    confirmationDurationMs: 3000,    // 3 sekundy zobrazení potvrzení
    autoReturnToWelcomeMs: 15000     // 15 sekund do návratu na welcome screen
  }
};

// Authentication configuration
export const authConfig = {
  pin: validateEnvVar('VITE_AUTH_PIN', import.meta.env.VITE_AUTH_PIN),
  sessionDurationHours: parseInt(validateEnvVar('VITE_AUTH_SESSION_DURATION_HOURS', import.meta.env.VITE_AUTH_SESSION_DURATION_HOURS)),
  appName: import.meta.env.VITE_APP_NAME || 'Docházkový Systém',
  encryptionKey: validateEnvVar('VITE_ENCRYPTION_KEY', import.meta.env.VITE_ENCRYPTION_KEY)
};

// Log security configuration (without sensitive data)
console.log('🔒 Security config loaded:', {
  apiBaseUrl: appConfig.api.baseUrl,
  sessionDuration: `${authConfig.sessionDurationHours}h`,
  appName: authConfig.appName,
  hasEncryptionKey: !!authConfig.encryptionKey
});

// Environment-specific overrides
if (import.meta.env.DEV) {
  console.log('🔧 Development mode - extended debug logging enabled');
}

export default appConfig;