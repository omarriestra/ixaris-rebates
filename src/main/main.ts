import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Ixaris Rebates Calculator',
    icon: path.join(__dirname, '../assets/app-icon.png'),
    show: false,
  });

  // Load the complete React app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  
  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    console.log('🎉 Complete app ready');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null!;
  });
};

// Import the real services
import { DatabaseManager } from '../database/DatabaseManager';
import { FileProcessor } from './services/FileProcessor';
import { RebateCalculator } from './services/RebateCalculator';
import { CsvImporter } from './services/CsvImporter';

// Initialize services
let databaseManager: DatabaseManager;
let fileProcessor: FileProcessor;
let rebateCalculator: RebateCalculator;
let csvImporter: CsvImporter;

// Initialize all services
const initializeServices = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing services...');
    
    // Initialize DatabaseManager
    databaseManager = new DatabaseManager();
    await databaseManager.initialize();
    console.log('✅ DatabaseManager initialized');
    
    // Initialize other services with DatabaseManager
    fileProcessor = new FileProcessor(databaseManager);
    rebateCalculator = new RebateCalculator(databaseManager);
    csvImporter = new CsvImporter(databaseManager);
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw error;
  }
};

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for complete functionality
ipcMain.handle('db:initialize', async () => {
  try {
    if (!databaseManager) {
      databaseManager = new DatabaseManager();
    }
    const result = await databaseManager.initialize();
    console.log('Database initialized:', result);
    return result;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
});

ipcMain.handle('db:getConfiguration', async () => {
  console.log('[Main] IPC db:getConfiguration called');
  try {
    const result = await databaseManager.getConfiguration();
    console.log('[Main] IPC db:getConfiguration result:', result);
    return result;
  } catch (error) {
    console.error('[Main] IPC db:getConfiguration error:', error);
    throw error;
  }
});

ipcMain.handle('db:saveConfiguration', async (event, config: any) => {
  await databaseManager.saveConfiguration(config);
  console.log('Configuration saved:', config);
  return Promise.resolve();
});

ipcMain.handle('db:getCalculatedRebates', async () => {
  return await databaseManager.getCalculatedRebates();
});

ipcMain.handle('db:getCalculatedRebatesMetadata', async () => {
  console.log('[Main] IPC db:getCalculatedRebatesMetadata called');
  try {
    const result = await databaseManager.getCalculatedRebatesMetadata();
    console.log('[Main] IPC db:getCalculatedRebatesMetadata result:', result);
    return result;
  } catch (error) {
    console.error('[Main] IPC db:getCalculatedRebatesMetadata error:', error);
    throw error;
  }
});

ipcMain.handle('db:getCalculatedRebatesChunk', async (event, chunkIndex: number) => {
  return await databaseManager.getCalculatedRebatesChunk(chunkIndex);
});

ipcMain.handle('db:processCalculatedRebatesInChunks', async (event, processorName: string, options?: any) => {
  // Create processor function based on processorName
  const processor = async (rebates: any[], chunkIndex: number, totalChunks: number) => {
    console.log(`Processing chunk ${chunkIndex}/${totalChunks} with ${rebates.length} rebates`);
    // Here you would implement specific processors based on processorName
  };
  return await databaseManager.processCalculatedRebatesInChunks(processor);
});

ipcMain.handle('db:getTransactionData', async () => {
  return await databaseManager.getTransactionData();
});

ipcMain.handle('file:selectDataFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Data Folder',
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('file:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder',
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('file:validateFiles', async (event, folderPath: string, year: number, month: number) => {
  return await fileProcessor.validateFiles(folderPath, year, month);
});

ipcMain.handle('file:processFiles', async (event, config: any) => {
  return await fileProcessor.processFiles(config);
});

ipcMain.handle('file:openFolder', async (event, folderPath: string) => {
  const { shell } = require('electron');
  await shell.openPath(folderPath);
});

ipcMain.handle('file:exportExcel', async (event, options: any) => {
  console.log('Exporting data with', options.data?.length || 0, 'records');
  
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.filename,
    filters: [
      { name: 'CSV files', extensions: ['csv'] },
      { name: 'Excel files', extensions: ['xlsx'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const XLSX = require('xlsx');
      
      console.log('✅ Saving export to:', result.filePath);
      
      // Get file extension to determine format
      const ext = path.extname(result.filePath).toLowerCase();
      
      if (ext === '.csv') {
        // Export as CSV
        let csvContent = '';
        
        // If data is an array of objects, create CSV
        if (Array.isArray(options.data) && options.data.length > 0) {
          // Get headers from first object
          const headers = Object.keys(options.data[0]);
          csvContent += headers.join(',') + '\n';
          
          // Add data rows
          options.data.forEach((row: any) => {
            const values = headers.map(header => {
              let value = row[header];
              if (value === null || value === undefined) value = '';
              // Escape quotes and wrap in quotes if contains comma, quote, or newline
              value = String(value);
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value.replace(/"/g, '""') + '"';
              }
              return value;
            });
            csvContent += values.join(',') + '\n';
          });
        } else {
          // Fallback for simple data
          csvContent = 'No data available to export\n';
        }
        
        fs.writeFileSync(result.filePath, csvContent, 'utf8');
        console.log('✅ CSV file written successfully to:', result.filePath);
        
        // Send success notification
        mainWindow.webContents.send('export:success', {
          filePath: result.filePath,
          format: 'CSV',
          recordCount: options.data?.length || 0
        });
        
      } else if (ext === '.xlsx') {
        // Use xlsx library for real Excel export
        if (Array.isArray(options.data) && options.data.length > 0) {
          // Create a new workbook
          const wb = XLSX.utils.book_new();
          
          // Convert data to worksheet
          const ws = XLSX.utils.json_to_sheet(options.data);
          
          // Add worksheet to workbook
          XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Sheet1');
          
          // Write the workbook to file
          XLSX.writeFile(wb, result.filePath);
          
          console.log('✅ Excel file written successfully to:', result.filePath);
          
          // Send success notification
          mainWindow.webContents.send('export:success', {
            filePath: result.filePath,
            format: 'Excel',
            recordCount: options.data?.length || 0
          });
        } else {
          throw new Error('No data to export');
        }
      }
      
      // Open the folder containing the exported file
      const { shell } = require('electron');
      shell.showItemInFolder(result.filePath);
      
      return result.filePath;
      
    } catch (error) {
      console.error('❌ Export error:', error);
      
      // Send error notification
      mainWindow.webContents.send('export:error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  throw new Error('Export cancelled');
});

ipcMain.handle('rebate:calculate', async (event, config: any) => {
  console.log('Calculating rebates with config:', config);
  return await rebateCalculator.calculateRebates(config);
});

ipcMain.handle('rebate:getResults', async () => {
  return await rebateCalculator.getResults();
});

ipcMain.handle('rebate:generateSubmissionFile', async (event, data: any) => {
  // Mock implementation - would need to be implemented in RebateCalculator
  return [];
});

ipcMain.handle('rebate:generateMasterTable', async () => {
  return await rebateCalculator.generateMasterTable();
});

ipcMain.handle('rebate:processAllData', async (event, allData: any) => {
  // Mock implementation - would need to be implemented in RebateCalculator
  return { success: true, message: 'Process all data not yet implemented' };
});

// CSV Import operations
ipcMain.handle('csv:importAllTables', async (event, folderPath: string) => {
  return await csvImporter.importAllTables(folderPath);
});

ipcMain.handle('csv:importTransactions', async (event, filePath: string) => {
  return await csvImporter.importTransactions(filePath);
});

ipcMain.handle('csv:importVisaMCORebates', async (event, filePath: string, isYearly: boolean) => {
  return await csvImporter.importVisaMCORebates(filePath, isYearly);
});

ipcMain.handle('csv:importPartnerPayRebates', async (event, filePath: string, isYearly: boolean) => {
  return await csvImporter.importPartnerPayRebates(filePath, isYearly);
});

ipcMain.handle('csv:importAirlinesMCC', async (event, filePath: string) => {
  return await csvImporter.importAirlinesMCC(filePath);
});

ipcMain.handle('csv:importRegionCountry', async (event, filePath: string) => {
  return await csvImporter.importRegionCountry(filePath);
});

ipcMain.handle('csv:importVoyagePriveRebates', async (event, filePath: string) => {
  return await csvImporter.importVoyagePriveRebates(filePath);
});

ipcMain.handle('csv:importBillingMaterials', async (event, filePath: string) => {
  return await csvImporter.importBillingMaterials(filePath);
});

ipcMain.handle('csv:importSAPBPCodes', async (event, filePath: string) => {
  return await csvImporter.importSAPBPCodes(filePath);
});

ipcMain.handle('csv:getImportStats', async () => {
  return await csvImporter.getImportStats();
});

ipcMain.handle('csv:getTableData', async (event, tableName: string) => {
  // Mock implementation - would need to be implemented in CsvImporter
  return [];
});

ipcMain.handle('csv:validateStructure', async (event, filePath: string, tableType: string) => {
  return await csvImporter.validateCSVStructure(filePath, tableType);
});

ipcMain.handle('csv:selectFile', async (event, title?: string, extensions?: string[]) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: title || 'Select File',
    filters: extensions ? [{ name: 'Files', extensions }] : [{ name: 'CSV files', extensions: ['csv'] }]
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('csv:selectLibraryFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Library_NIUM Folder',
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('debug:getStats', async () => {
  return {
    database: 'DatabaseManager stats not implemented',
    rebates: 'RebateCalculator stats not implemented',
  };
});

ipcMain.handle('error:show', async (event, message: string) => {
  await dialog.showErrorBox('Error', message);
});

// Progress handling
ipcMain.handle('progress:update', async (event, progress: any) => {
  mainWindow.webContents.send('progress:update', progress);
});

// Export operations  
ipcMain.handle('export:toExcel', async (event, data: any, filePath: string) => {
  // Implement actual Excel export logic here
  console.log('Exporting to Excel:', filePath);
  return true;
});

ipcMain.handle('export:selectOutputFile', async (event, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'Excel files', extensions: ['xlsx'] },
      { name: 'CSV files', extensions: ['csv'] },
    ]
  });
  
  return result.canceled ? null : result.filePath;
});