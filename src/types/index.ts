// Employee Types

export interface Employee {
  employeeID: string;
  fullName: string;
  reportActivity: boolean; // Nová property - zda má hlásit aktivity
}

// Attendance Types

export interface AttendanceRecord {
  attendanceID: string;
  employeeID: string;
  attendanceStart: string; // ISO timestamp
  attendanceEnd: string;   // prázdný string nebo ISO timestamp
}

export interface AttendanceState {
  employeeID: string;
  attendanceState: boolean; // true = v práci, false = není v práci
}

// API Response Types

export interface InitialDataResponse {
  employees: Employee[];
  emptyAttendance: AttendanceRecord[];
  activities: Activity[]; // Nová property pro aktivity
}


// Local Application State

export interface EmployeeWithState extends Employee {
  isAtWork: boolean;
  lastAction?: 'start' | 'stop';
  lastActionTime?: string;
  attendanceStart?: string; // ISO timestamp příchodu do práce
  attendanceID?: string; // ID aktuální docházky pro ukončení
}

// Activity Types - NOVÉ

export interface Activity {
  activityID: string;
  activityName: string;
  activityCategory: string;
}

export interface ActivityCategory {
  categoryName: string;
  activities: Activity[];
}

export interface ApplicationState {
  employees: Employee[]; // Pouze základní seznam bez stavů
  isLoading: boolean;
  isOnline: boolean;
  lastSync?: string;
  error?: string;
}

// Action Queue Types

export interface QueuedAction {
  id: string;
  employeeID: string;
  action: 'start' | 'stop';
  timestamp: string;
  attempts: number;
  maxAttempts: number;
  attendanceID?: string; // Pro STOP akce - ID záznamu k ukončení
  attendanceStart?: string; // Pro offline STOP CREATE scénář
  activityID?: string; // NOVÁ property pro reportování aktivity
}

// API Request Types

export interface AttendanceActionRequest {
  employeeID: string;
  action: 'start' | 'stop';
  timestamp: string;
  attendanceID?: string; // Pro STOP UPDATE akce
  attendanceStart?: string; // Pro offline STOP CREATE scénář
  activityID?: string; // NOVÁ property pro reportování aktivity při STOP akci
}

// NEW: Completion webhook request types
export interface CompletionWebhookRequest {
  action: 'create' | 'update';
  attendanceData: {
    attendanceID?: string; // Pouze pro action=update
    employeeID: string;
    attendanceStart: string;
    attendanceEnd?: string; // Prázdné pro START, vyplněné pro STOP
    activityID?: string; // NOVÁ property pro reportování aktivity
  };
}

export interface CompletionWebhookResponse {
  attendanceID: string; // Webhook vrací přímo {"attendanceID": "..."}
}

// UI State Types

export type Screen = 'welcome' | 'employee-action' | 'confirmation' | 'error' | 'activity-confirmation' | 'category-selector' | 'activity-selector';

export interface UIState {
  currentScreen: Screen;
  selectedEmployee?: EmployeeWithState;
  isProcessing: boolean;
  message?: string;
  selectedCategory?: string; // NOVÁ property pro vybranou kategorii aktivit
  selectedActivity?: Activity; // NOVÁ property pro vybranou aktivitu
};

export interface AppConfig {
  api: {
    baseUrl: string;
    endpoints: {
      getInitialData: string; // LOCAL-FIRST první sync
      completionWebhook: string; // Trvalý zápis do SmartSuite
    };
  };
  hardware: {
    nfcTimeout: number;
  };
  ui: {
    confirmationDurationMs: number;
    autoReturnToWelcomeMs: number;
  };
}

// Utility Types

export type ActionType = 'start' | 'stop';

export interface TimeInfo {
  currentTime: string;
  formattedTime: string;
  formattedDate: string;
}