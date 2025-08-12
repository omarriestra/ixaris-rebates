const { contextBridge, ipcRenderer } = require('electron');

// Ultra-simple API for the minimal frontend
const electronAPI = {
  // File selection
  csvSelectFile: (title) => ipcRenderer.invoke('csvSelectFile', title),
  
  // CSV Import methods - all 8 types
  csvImportTransactions: (filePath) => ipcRenderer.invoke('csvImportTransactions', filePath),
  csvImportVisaMCORebates: (filePath, isYearly) => ipcRenderer.invoke('csvImportVisaMCORebates', filePath, isYearly),
  csvImportPartnerPayRebates: (filePath, isYearly) => ipcRenderer.invoke('csvImportPartnerPayRebates', filePath, isYearly),
  csvImportAirlinesMCC: (filePath) => ipcRenderer.invoke('csvImportAirlinesMCC', filePath),
  csvImportRegionCountry: (filePath) => ipcRenderer.invoke('csvImportRegionCountry', filePath),
  csvImportVoyagePriveRebates: (filePath) => ipcRenderer.invoke('csvImportVoyagePriveRebates', filePath),
  
  // Rebate operations
  'rebate:calculate': (config) => ipcRenderer.invoke('rebate:calculate', config),
  
  // Export operations
  'file:exportExcel': (options) => ipcRenderer.invoke('file:exportExcel', options),
  
  // Debug
  'debug:getStats': () => ipcRenderer.invoke('debug:getStats'),
  testAPI: () => ipcRenderer.invoke('test:api')
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('✅ Ultra-simple preload loaded successfully');
console.log('📋 Available APIs:', Object.keys(electronAPI));