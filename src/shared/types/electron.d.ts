// Electron API types for renderer process
export interface ElectronAPI {
  // Database operations
  db: {
    initialize: () => Promise<void>;
    getConfiguration: () => Promise<any>;
    saveConfiguration: (config: any) => Promise<void>;
  };
  
  // File operations
  file: {
    selectDataFolder: () => Promise<string | null>;
    processFiles: (config: any) => Promise<any>;
    validateFiles: (folderPath: string, year: number, month: number) => Promise<any>;
    openFolder: (path: string) => Promise<void>;
    exportCSV: (data: any) => Promise<void>;
    exportExcel: (data: any) => Promise<void>;
  };
  
  // Rebate operations
  rebate: {
    calculate: (config: any) => Promise<any>;
    getResults: () => Promise<any>;
    processRebates: (config: any) => Promise<any>;
    generateSubmissionFile: (data: any) => Promise<any>;
    generateMasterTable: () => Promise<any>;
  };
  
  // Error handling
  error: {
    show: (message: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}