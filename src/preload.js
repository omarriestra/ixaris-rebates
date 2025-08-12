const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration management
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  clearConfig: () => ipcRenderer.invoke('clear-config'),

  // File operations
  file: {
    selectFolder: () => ipcRenderer.invoke('file:selectFolder'),
    selectFile: (title, extensions) => ipcRenderer.invoke('file:selectFile', title, extensions)
  },

  // CSV Import operations
  csvGetImportStats: () => ipcRenderer.invoke('csv:getImportStats'),
  csvImportTransactions: (filePath) => ipcRenderer.invoke('csv:importTransactions', filePath),
  csvImportVisaMCORebates: (filePath, isYearly) => ipcRenderer.invoke('csv:importVisaMCORebates', filePath, isYearly),
  csvImportPartnerPayRebates: (filePath, isYearly) => ipcRenderer.invoke('csv:importPartnerPayRebates', filePath, isYearly),
  csvImportAirlinesMCC: (filePath) => ipcRenderer.invoke('csv:importAirlinesMCC', filePath),
  csvImportRegionCountry: (filePath) => ipcRenderer.invoke('csv:importRegionCountry', filePath),
  csvImportVoyagePriveRebates: (filePath) => ipcRenderer.invoke('csv:importVoyagePriveRebates', filePath),
  csvImportBillingMaterials: (filePath) => ipcRenderer.invoke('csv:importBillingMaterials', filePath),
  csvImportSAPBPCodes: (filePath) => ipcRenderer.invoke('csv:importSAPBPCodes', filePath),
  csvGetTableData: (tableName) => ipcRenderer.invoke('csv:getTableData', tableName),
  csvSelectFile: (title, extensions) => ipcRenderer.invoke('file:selectFile', title, extensions),

  // Rebate calculations
  rebate: {
    calculate: (config) => ipcRenderer.invoke('rebate:calculate', config),
    getResults: () => ipcRenderer.invoke('rebate:getResults'),
    generateSubmissionFile: (data) => ipcRenderer.invoke('rebate:generateSubmissionFile', data)
  },

  // Export operations
  export: {
    toExcel: (data, filePath) => ipcRenderer.invoke('export:toExcel', data, filePath),
    selectOutputFile: (defaultName) => ipcRenderer.invoke('export:selectOutputFile', defaultName)
  },

  // Database operations (for compatibility)
  db: {
    initialize: () => Promise.resolve(true),
    getConfiguration: () => ipcRenderer.invoke('get-config', 'configuration'),
    saveConfiguration: (config) => ipcRenderer.invoke('set-config', 'configuration', config)
  },

  // Progress and error handling
  progress: {
    update: (progress) => ipcRenderer.invoke('progress:update', progress),
    onUpdate: (callback) => {
      ipcRenderer.on('progress:update', (_, progress) => callback(progress));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('progress:update');
    }
  },

  error: {
    show: (message) => ipcRenderer.invoke('error:show', message)
  },

  // Event listeners
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },

  off: (channel, callback) => {
    ipcRenderer.off(channel, callback);
  }
});

console.log('✅ Preload script loaded successfully');