import { contextBridge, ipcRenderer } from 'electron';

// Types for the exposed API
export interface IElectronAPI {
  // Database operations
  db: {
    initialize: () => Promise<boolean>;
    getConfiguration: () => Promise<any>;
    saveConfiguration: (config: any) => Promise<void>;
    getCalculatedRebates: () => Promise<any[]>;
    getCalculatedRebatesMetadata: () => Promise<{ totalRebates: number; chunks: number; chunkSize: number } | null>;
    getCalculatedRebatesChunk: (chunkIndex: number) => Promise<any[]>;
    processCalculatedRebatesInChunks: (processorName: string, options?: any) => Promise<void>;
    getTransactionData: () => Promise<any[]>;
    getTransactionDataMetadata: () => Promise<{ totalTransactions: number; chunks: number; chunkSize: number } | null>;
    getTransactionDataChunk: (chunkIndex: number) => Promise<any[]>;
  };

  // File operations
  file: {
    selectDataFolder: () => Promise<string | null>;
    selectFolder: () => Promise<string | null>;
    processFiles: (config: any) => Promise<any>;
    validateFiles: (folderPath: string, year: number, month: number) => Promise<any>;
    openFolder: (folderPath: string) => Promise<void>;
    exportExcel: (options: { data: any[]; filename: string; sheetName: string }) => Promise<string>;
  };
  fileSelectFolder: () => Promise<string | null>;

  // Rebate calculations
  rebate: {
    calculate: (config: any) => Promise<any>;
    getResults: () => Promise<any>;
    generateSubmissionFile: (data: any) => Promise<any>;
    generateMasterTable: () => Promise<any>;
    processAllData: (allData: any) => Promise<any>;
  };

  debug: {
    getStats: () => Promise<any>;
  };

  // Export operations
  export: {
    toExcel: (data: any, filePath: string) => Promise<boolean>;
    selectOutputFile: (defaultName: string) => Promise<string | null>;
  };

  // CSV Import operations
  csvImportAllTables: (folderPath: string) => Promise<any>;
  csvImportTransactions: (filePath: string) => Promise<any>;
  csvImportVisaMCORebates: (filePath: string, isYearly: boolean) => Promise<any>;
  csvImportPartnerPayRebates: (filePath: string, isYearly: boolean) => Promise<any>;
  csvImportAirlinesMCC: (filePath: string) => Promise<any>;
  csvImportRegionCountry: (filePath: string) => Promise<any>;
  csvImportVoyagePriveRebates: (filePath: string) => Promise<any>;
  csvImportBillingMaterials: (filePath: string) => Promise<any>;
  csvImportSAPBPCodes: (filePath: string) => Promise<any>;
  csvGetImportStats: () => Promise<any>;
  csvGetTableData: (tableName: string) => Promise<any>;
  csvValidateStructure: (filePath: string, tableType: string) => Promise<any>;
  csvSelectFile: (title?: string, extensions?: string[]) => Promise<string | null>;
  csvSelectLibraryFolder: () => Promise<string | null>;

  // Progress and error handling
  progress: {
    update: (progress: any) => Promise<void>;
    onUpdate: (callback: (progress: any) => void) => void;
    removeAllListeners: () => void;
  };

  error: {
    show: (message: string) => Promise<void>;
  };

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

// Expose the API to the renderer process
const electronAPI: IElectronAPI = {
  db: {
    initialize: () => ipcRenderer.invoke('db:initialize'),
    getConfiguration: () => ipcRenderer.invoke('db:getConfiguration'),
    saveConfiguration: (config) => ipcRenderer.invoke('db:saveConfiguration', config),
    getCalculatedRebates: () => ipcRenderer.invoke('db:getCalculatedRebates'),
    getCalculatedRebatesMetadata: () => ipcRenderer.invoke('db:getCalculatedRebatesMetadata'),
    getCalculatedRebatesChunk: (chunkIndex) => ipcRenderer.invoke('db:getCalculatedRebatesChunk', chunkIndex),
    processCalculatedRebatesInChunks: (processorName, options) => ipcRenderer.invoke('db:processCalculatedRebatesInChunks', processorName, options),
    getTransactionData: () => ipcRenderer.invoke('db:getTransactionData'),
    getTransactionDataMetadata: () => ipcRenderer.invoke('db:getTransactionDataMetadata'),
    getTransactionDataChunk: (chunkIndex) => ipcRenderer.invoke('db:getTransactionDataChunk', chunkIndex),
  },

  file: {
    selectDataFolder: () => ipcRenderer.invoke('file:selectDataFolder'),
    selectFolder: () => ipcRenderer.invoke('file:selectFolder'),
    processFiles: (config) => ipcRenderer.invoke('file:processFiles', config),
    validateFiles: (folderPath, year, month) => ipcRenderer.invoke('file:validateFiles', folderPath, year, month),
    openFolder: (folderPath) => ipcRenderer.invoke('file:openFolder', folderPath),
    exportExcel: (options) => ipcRenderer.invoke('file:exportExcel', options),
  },
  fileSelectFolder: () => ipcRenderer.invoke('file:selectFolder'),

  rebate: {
    calculate: (config) => ipcRenderer.invoke('rebate:calculate', config),
    getResults: () => ipcRenderer.invoke('rebate:getResults'),
    generateSubmissionFile: (data) => ipcRenderer.invoke('rebate:generateSubmissionFile', data),
    generateMasterTable: () => ipcRenderer.invoke('rebate:generateMasterTable'),
    processAllData: (allData) => ipcRenderer.invoke('rebate:processAllData', allData),
  },

  debug: {
    getStats: () => ipcRenderer.invoke('debug:getStats'),
  },

  export: {
    toExcel: (data, filePath) => ipcRenderer.invoke('export:toExcel', data, filePath),
    selectOutputFile: (defaultName) => ipcRenderer.invoke('export:selectOutputFile', defaultName),
  },

  // CSV Import operations
  csvImportAllTables: (folderPath) => ipcRenderer.invoke('csv:importAllTables', folderPath),
  csvImportTransactions: (filePath) => ipcRenderer.invoke('csv:importTransactions', filePath),
  csvImportVisaMCORebates: (filePath, isYearly) => ipcRenderer.invoke('csv:importVisaMCORebates', filePath, isYearly),
  csvImportPartnerPayRebates: (filePath, isYearly) => ipcRenderer.invoke('csv:importPartnerPayRebates', filePath, isYearly),
  csvImportAirlinesMCC: (filePath) => ipcRenderer.invoke('csv:importAirlinesMCC', filePath),
  csvImportRegionCountry: (filePath) => ipcRenderer.invoke('csv:importRegionCountry', filePath),
  csvImportVoyagePriveRebates: (filePath) => ipcRenderer.invoke('csv:importVoyagePriveRebates', filePath),
  csvImportBillingMaterials: (filePath) => ipcRenderer.invoke('csv:importBillingMaterials', filePath),
  csvImportSAPBPCodes: (filePath) => ipcRenderer.invoke('csv:importSAPBPCodes', filePath),
  csvGetImportStats: () => ipcRenderer.invoke('csv:getImportStats'),
  csvGetTableData: (tableName) => ipcRenderer.invoke('csv:getTableData', tableName),
  csvValidateStructure: (filePath, tableType) => ipcRenderer.invoke('csv:validateStructure', filePath, tableType),
  csvSelectFile: (title, extensions) => ipcRenderer.invoke('csv:selectFile', title, extensions),
  csvSelectLibraryFolder: () => ipcRenderer.invoke('csv:selectLibraryFolder'),

  progress: {
    update: (progress) => ipcRenderer.invoke('progress:update', progress),
    onUpdate: (callback) => {
      ipcRenderer.on('progress:update', (_, progress) => callback(progress));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('progress:update');
    },
  },

  error: {
    show: (message) => ipcRenderer.invoke('error:show', message),
  },

  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },

  off: (channel, callback) => {
    ipcRenderer.off(channel, callback);
  },
};

// Expose the API to the renderer process
console.log('Preload script loading...');
console.log('ElectronAPI object:', electronAPI);
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('ElectronAPI exposed to main world');

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
