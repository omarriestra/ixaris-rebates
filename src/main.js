const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Import compiled JavaScript versions
const { DatabaseManager } = require('../dist/database/DatabaseManager.js');
const { CsvImporter } = require('../dist/main/services/CsvImporter.js');
const { RebateCalculator } = require('../dist/main/services/RebateCalculator.js');

// Initialize store and services
const store = new Store();
let databaseManager;
let csvImporter;
let rebateCalculator;

let mainWindow;

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development';
const forceDevMode = process.argv.includes('--dev') || process.env.ELECTRON_IS_DEV === 'true';
const isDevMode = isDev || forceDevMode;

// Error handling for debugging
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

function createWindow() {
  console.log('🚀 Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Para clipboard access
      allowRunningInsecureContent: true,
      enableBlinkFeatures: 'ClipboardRead,ClipboardWrite'
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'Ixaris Rebates Calculator',
    show: false // Don't show until ready
  });

  // Determine the URL to load
  const startUrl = isDevMode
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/renderer/index.html')}`;

  console.log(`🌐 Loading URL: ${startUrl}`);
  console.log(`🔧 Dev mode: ${isDevMode}`);

  mainWindow.loadURL(startUrl);

  // Error handling for the main window
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('💥 Renderer crashed:', killed);
  });

  // Open dev tools in development
  if (isDevMode) {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show');
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  console.log('🎯 App is ready, creating window...');
  createWindow();
  setupIpcHandlers();
  setupMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Setup IPC handlers for communication with renderer
async function setupIpcHandlers() {
  console.log('🔗 Setting up IPC handlers...');
  
  // Initialize services
  try {
    databaseManager = new DatabaseManager();
    await databaseManager.initialize();
    csvImporter = new CsvImporter(databaseManager);
    rebateCalculator = new RebateCalculator(databaseManager);
    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }

  // Configuration management using electron-store
  ipcMain.handle('get-config', async (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('set-config', async (event, key, value) => {
    store.set(key, value);
    return true;
  });

  ipcMain.handle('clear-config', async () => {
    store.clear();
    return true;
  });

  // File operations
  ipcMain.handle('file:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Folder'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('file:selectFile', async (event, title, extensions) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: title || 'Select File',
      filters: [
        { name: 'CSV files', extensions: extensions || ['csv'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // CSV Import operations
  ipcMain.handle('csv:getImportStats', async () => {
    try {
      if (!csvImporter) {
        return {
          transactions: 0,
          visaMCORebatesMonthly: 0,
          visaMCORebatesYearly: 0,
          partnerPayRebatesMonthly: 0,
          partnerPayRebatesYearly: 0,
          airlinesMCC: 0,
          regionCountry: 0,
          voyagePriveRebates: 0,
          billingMaterials: 0,
          sapBPCodes: 0
        };
      }
      
      const stats = await csvImporter.getImportStats();
      return {
        transactions: stats.transactions,
        visaMCORebatesMonthly: 0, // Combined in visaMCORebates
        visaMCORebatesYearly: stats.visaMCORebates,
        partnerPayRebatesMonthly: 0, // Combined in partnerPayRebates
        partnerPayRebatesYearly: stats.partnerPayRebates,
        airlinesMCC: stats.airlinesMCC,
        regionCountry: stats.regionCountry,
        voyagePriveRebates: stats.voyagePriveRebates,
        billingMaterials: stats.billingMaterials,
        sapBPCodes: stats.sapBPCodes
      };
    } catch (error) {
      console.error('Error getting import stats:', error);
      return {
        transactions: 0,
        visaMCORebatesMonthly: 0,
        visaMCORebatesYearly: 0,
        partnerPayRebatesMonthly: 0,
        partnerPayRebatesYearly: 0,
        airlinesMCC: 0,
        regionCountry: 0,
        voyagePriveRebates: 0,
        billingMaterials: 0,
        sapBPCodes: 0
      };
    }
  });

  // Individual import handlers
  ipcMain.handle('csv:importTransactions', async (event, filePath) => {
    try {
      console.log(`📁 Importing transactions from: ${filePath}`);
      
      if (!csvImporter) {
        throw new Error('CSV Importer not initialized');
      }
      
      const result = await csvImporter.importTransactions(filePath);
      console.log(`✅ Imported ${result.rowsImported} transactions`);
      
      return result;
    } catch (error) {
      console.error('Error importing transactions:', error);
      return {
        success: false,
        rowsImported: 0,
        errors: [error.message],
        warnings: []
      };
    }
  });

  ipcMain.handle('csv:importVisaMCORebates', async (event, filePath, isYearly) => {
    try {
      console.log(`📁 Importing Visa/MCO ${isYearly ? 'Yearly' : 'Monthly'} rebates from: ${filePath}`);
      
      if (!csvImporter) {
        throw new Error('CSV Importer not initialized');
      }
      
      const result = await csvImporter.importVisaMCORebates(filePath, isYearly);
      console.log(`✅ Imported ${result.rowsImported} Visa/MCO rebates`);
      
      return result;
    } catch (error) {
      console.error('Error importing Visa/MCO rebates:', error);
      return {
        success: false,
        rowsImported: 0,
        errors: [error.message],
        warnings: []
      };
    }
  });

  ipcMain.handle('csv:importPartnerPayRebates', async (event, filePath, isYearly) => {
    try {
      console.log(`📁 Importing PartnerPay ${isYearly ? 'Yearly' : 'Monthly'} rebates from: ${filePath}`);
      
      if (!csvImporter) {
        throw new Error('CSV Importer not initialized');
      }
      
      const result = await csvImporter.importPartnerPayRebates(filePath, isYearly);
      console.log(`✅ Imported ${result.rowsImported} PartnerPay rebates`);
      
      return result;
    } catch (error) {
      console.error('Error importing PartnerPay rebates:', error);
      return {
        success: false,
        rowsImported: 0,
        errors: [error.message],
        warnings: []
      };
    }
  });

  ipcMain.handle('csv:importAirlinesMCC', async (event, filePath) => {
    try {
      console.log(`📁 Importing Airlines MCC from: ${filePath}`);
      
      if (!csvImporter) {
        throw new Error('CSV Importer not initialized');
      }
      
      const result = await csvImporter.importAirlinesMCC(filePath);
      console.log(`✅ Imported ${result.rowsImported} Airlines MCC records`);
      
      return result;
    } catch (error) {
      console.error('Error importing Airlines MCC:', error);
      return {
        success: false,
        rowsImported: 0,
        errors: [error.message],
        warnings: []
      };
    }
  });

  ipcMain.handle('csv:importRegionCountry', async (event, filePath) => {
    try {
      console.log(`📁 Importing Region Country from: ${filePath}`);
      
      if (!csvImporter) {
        throw new Error('CSV Importer not initialized');
      }
      
      const result = await csvImporter.importRegionCountry(filePath);
      console.log(`✅ Imported ${result.rowsImported} Region Country records`);
      
      return result;
    } catch (error) {
      console.error('Error importing Region Country:', error);
      return {
        success: false,
        rowsImported: 0,
        errors: [error.message],
        warnings: []
      };
    }
  });

  ipcMain.handle('csv:importVoyagePriveRebates', async (event, filePath) => {
    try {
      console.log(`📁 Importing Voyage Prive rebates from: ${filePath}`);
      
      if (!csvImporter) {
        throw new Error('CSV Importer not initialized');
      }
      
      const result = await csvImporter.importVoyagePriveRebates(filePath);
      console.log(`✅ Imported ${result.rowsImported} Voyage Prive rebates`);
      
      return result;
    } catch (error) {
      console.error('Error importing Voyage Prive rebates:', error);
      return {
        success: false,
        rowsImported: 0,
        errors: [error.message],
        warnings: []
      };
    }
  });

  ipcMain.handle('csv:importBillingMaterials', async (event, filePath) => {
    try {
      console.log(`📁 Importing Billing Materials from: ${filePath}`);
      
      if (!csvImporter) {
        throw new Error('CSV Importer not initialized');
      }
      
      const result = await csvImporter.importBillingMaterials(filePath);
      console.log(`✅ Imported ${result.rowsImported} Billing Materials`);
      
      return result;
    } catch (error) {
      console.error('Error importing Billing Materials:', error);
      return {
        success: false,
        rowsImported: 0,
        errors: [error.message],
        warnings: []
      };
    }
  });

  ipcMain.handle('csv:importSAPBPCodes', async (event, filePath) => {
    try {
      console.log(`📁 Importing SAP BP Codes from: ${filePath}`);
      
      if (!csvImporter) {
        throw new Error('CSV Importer not initialized');
      }
      
      const result = await csvImporter.importSAPBPCodes(filePath);
      console.log(`✅ Imported ${result.rowsImported} SAP BP Codes`);
      
      return result;
    } catch (error) {
      console.error('Error importing SAP BP Codes:', error);
      return {
        success: false,
        rowsImported: 0,
        errors: [error.message],
        warnings: []
      };
    }
  });

  // View table data handlers
  ipcMain.handle('csv:getTableData', async (event, tableName) => {
    try {
      const data = store.get(`data.${tableName}`, []);
      return { success: true, data };
    } catch (error) {
      console.error(`Error getting table data for ${tableName}:`, error);
      return { success: false, data: [], error: error.message };
    }
  });

  ipcMain.handle('csv:importAllTables', async (event, folderPath) => {
    try {
      console.log(`📁 Importing all tables from: ${folderPath}`);
      
      if (!csvImporter) {
        throw new Error('CSV Importer not initialized');
      }
      
      const results = await csvImporter.importAllTables(folderPath);
      console.log('✅ Batch import completed:', results);
      
      return results;
    } catch (error) {
      console.error('❌ Error importing tables:', error);
      throw error;
    }
  });

  // Rebate calculation (real)
  ipcMain.handle('rebate:calculate', async (event, config) => {
    try {
      console.log('🧮 Calculating rebates...');
      
      if (!rebateCalculator) {
        throw new Error('Rebate Calculator not initialized');
      }
      
      const result = await rebateCalculator.calculateAllRebates();
      console.log(`✅ Calculated ${result.calculatedRebates?.length || 0} rebates`);
      
      return result;
    } catch (error) {
      console.error('❌ Error calculating rebates:', error);
      throw error;
    }
  });

  // Error handling
  ipcMain.handle('error:show', async (event, message) => {
    dialog.showErrorBox('Error', message);
  });

  console.log('✅ IPC handlers setup complete');
}

function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Data Folder',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            handleOpenDataFolder();
          }
        },
        {
          label: 'Export Results',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            handleExportResults();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Ixaris Rebates Calculator',
              message: 'Ixaris Rebates Calculator v1.0.0',
              detail: 'Modern desktop application for calculating Ixaris rebates\\nBuilt with Electron, React, and TypeScript'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function handleOpenDataFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Data Folder'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow.webContents.send('folder:selected', result.filePaths[0]);
  }
}

async function handleExportResults() {
  mainWindow.webContents.send('export:requested');
}

console.log('🚀 Ixaris Rebates Calculator starting...');