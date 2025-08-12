import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Database operations
  db: {
    initialize: () => ipcRenderer.invoke('db:initialize'),
    getConfiguration: () => ipcRenderer.invoke('db:getConfiguration'),
    saveConfiguration: (config: any) => ipcRenderer.invoke('db:saveConfiguration', config),
  },
  
  // File operations
  file: {
    selectDataFolder: () => ipcRenderer.invoke('file:selectDataFolder'),
    processFiles: (config: any) => ipcRenderer.invoke('file:processFiles', config),
    validateFiles: (folderPath: string, year: number, month: number) => 
      ipcRenderer.invoke('file:validateFiles', folderPath, year, month),
    openFolder: (path: string) => ipcRenderer.invoke('file:openFolder', path),
    exportCSV: (data: any) => ipcRenderer.invoke('file:exportCSV', data),
    exportExcel: (data: any) => ipcRenderer.invoke('file:exportExcel', data),
  },
  
  // Rebate operations
  rebate: {
    calculate: (config: any) => ipcRenderer.invoke('rebate:calculate', config),
    getResults: () => ipcRenderer.invoke('rebate:getResults'),
    processRebates: (config: any) => ipcRenderer.invoke('rebate:processRebates', config),
    generateSubmissionFile: (data: any) => ipcRenderer.invoke('rebate:generateSubmissionFile', data),
  },
  
  // Error handling
  error: {
    show: (message: string) => ipcRenderer.invoke('error:show', message),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);