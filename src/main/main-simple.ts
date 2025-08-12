import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-simple.js'),
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  
  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
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

// Mock database state
let mockConfiguration: any = null;
let mockTransactions: any[] = [];
let mockRebates: any[] = [];

// IPC handlers for complete functionality
ipcMain.handle('db:initialize', async () => {
  console.log('Initializing mock database...');
  return Promise.resolve();
});

ipcMain.handle('db:getConfiguration', async () => {
  return mockConfiguration;
});

ipcMain.handle('db:saveConfiguration', async (event, config: any) => {
  mockConfiguration = config;
  console.log('Configuration saved:', config);
  return Promise.resolve();
});

ipcMain.handle('file:selectDataFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Data Folder',
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('file:validateFiles', async (event, folderPath: string, year: number, month: number) => {
  // Mock validation with some realistic files
  return {
    isValid: true,
    foundFiles: [
      `${year}${month.toString().padStart(2, '0')}_NIUM_QLIK.xlsx`,
      'Visa & MCO Monthly Rebate.xlsx',
      'PartnerPay_PartnerDirect Monthly Rebate.xlsx',
      'Library_NIUM.xlsx'
    ],
    missingFiles: [],
    errors: [],
  };
});

ipcMain.handle('file:openFolder', async (event, folderPath: string) => {
  const { shell } = require('electron');
  await shell.openPath(folderPath);
});

ipcMain.handle('file:exportCSV', async (event, data: any) => {
  console.log('Exporting CSV with', data.data?.length || 0, 'records');
  // Mock CSV export
  return Promise.resolve();
});

ipcMain.handle('file:exportExcel', async (event, data: any) => {
  console.log('Exporting Excel with', data.data?.length || 0, 'records');
  // Mock Excel export
  return Promise.resolve();
});

ipcMain.handle('file:processFiles', async (event, config: any) => {
  console.log('Processing files from folder:', config.folderPath);
  
  // Mock file processing - simulate loading transactions from Excel
  mockTransactions = Array.from({ length: 1000 }, (_, i) => ({
    transactionId: `TXN_${i + 1}`,
    transactionCardNumber: `****-****-****-${String(1000 + i).slice(-4)}`,
    transactionCurrency: ['EUR', 'USD', 'GBP'][Math.floor(Math.random() * 3)],
    providerCustomerCode: `Provider_${Math.floor(Math.random() * 10) + 1}`,
    transactionType: 'Purchase',
    transactionCard: 'Visa',
    salesforceProductName: `Product_${Math.floor(Math.random() * 5) + 1}`,
    fundingAccountName: 'Main Account',
    region: ['Europe', 'Americas', 'Asia-Pacific'][Math.floor(Math.random() * 3)],
    regionMC: ['EU', 'US', 'AP'][Math.floor(Math.random() * 3)],
    transactionDate: new Date().toISOString().split('T')[0],
    binCardNumber: Math.floor(Math.random() * 900000) + 100000,
    transactionAmount: Math.round((Math.random() * 1000 + 100) * 100) / 100,
    interchangeAmount: Math.round((Math.random() * 50 + 10) * 100) / 100,
    interchangePercentage: Math.round((Math.random() * 3 + 0.5) * 100) / 100,
    transactionAmountEUR: Math.round((Math.random() * 950 + 90) * 100) / 100,
    fxRate: Math.round((Math.random() * 0.2 + 0.9) * 1000) / 1000,
    pkReference: `PK_${i + 1}`,
    transactionMerchantCountry: ['ES', 'FR', 'DE', 'IT', 'US'][Math.floor(Math.random() * 5)],
    transactionMerchantCategoryCode: [4511, 4722, 5411, 5812][Math.floor(Math.random() * 4)],
    merchantName: 'Sample Merchant',
    transactionMerchantName: `Merchant ${Math.floor(Math.random() * 100) + 1}`
  }));

  return {
    success: true,
    transactionsProcessed: mockTransactions.length,
    rebatesCalculated: 0,
    errors: [],
    warnings: [],
    processingTime: 1000,
    summary: {
      totalTransactions: mockTransactions.length,
      totalRebateAmount: 0,
      totalRebateAmountEUR: 0,
      byCalculationType: {},
      byProvider: {}
    }
  };
});

ipcMain.handle('rebate:calculate', async (event, config: any) => {
  console.log('Calculating rebates for', mockTransactions.length, 'transactions');
  
  // Mock rebate calculations based on the loaded transactions
  mockRebates = Array.from({ length: 850 }, (_, i) => ({
    transactionId: mockTransactions[i]?.transactionId || `TXN_${i + 1}`,
    providerCustomerCode: mockTransactions[i]?.providerCustomerCode || `Provider_${Math.floor(Math.random() * 10) + 1}`,
    productName: mockTransactions[i]?.salesforceProductName || `Product_${Math.floor(Math.random() * 5) + 1}`,
    rebateLevel: Math.floor(Math.random() * 8) + 1,
    rebatePercentage: Math.round((Math.random() * 2 + 0.5) * 100) / 100,
    rebateAmount: Math.round((Math.random() * 50 + 10) * 100) / 100,
    rebateAmountEUR: Math.round((Math.random() * 45 + 9) * 100) / 100,
    calculationType: ['visa_mco', 'partnerpay', 'voyage_prive'][Math.floor(Math.random() * 3)],
    originalTransaction: mockTransactions[i] || {}
  }));

  return {
    success: true,
    transactionsProcessed: mockTransactions.length,
    rebatesCalculated: mockRebates.length,
    errors: [],
    warnings: [],
    processingTime: 1500,
    summary: {
      totalTransactions: mockTransactions.length,
      totalRebateAmount: mockRebates.reduce((sum, r) => sum + r.rebateAmount, 0),
      totalRebateAmountEUR: mockRebates.reduce((sum, r) => sum + r.rebateAmountEUR, 0),
      byCalculationType: {
        visa_mco: mockRebates.filter(r => r.calculationType === 'visa_mco').length,
        partnerpay: mockRebates.filter(r => r.calculationType === 'partnerpay').length,
        voyage_prive: mockRebates.filter(r => r.calculationType === 'voyage_prive').length,
      },
      byProvider: mockRebates.reduce((acc, r) => {
        acc[r.providerCustomerCode] = (acc[r.providerCustomerCode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  };
});

ipcMain.handle('rebate:processRebates', async (event, config: any) => {
  // Mock processing with realistic data
  mockTransactions = Array.from({ length: 1000 }, (_, i) => ({
    id: `TXN_${i + 1}`,
    amount: Math.random() * 1000 + 100,
    provider: `Provider_${Math.floor(Math.random() * 10) + 1}`,
    date: new Date().toISOString(),
  }));

  mockRebates = Array.from({ length: 850 }, (_, i) => ({
    id: `REB_${i + 1}`,
    transactionId: `TXN_${i + 1}`,
    providerCustomerCode: `Provider_${Math.floor(Math.random() * 10) + 1}`,
    productName: `Product_${Math.floor(Math.random() * 5) + 1}`,
    rebateLevel: Math.floor(Math.random() * 8) + 1,
    rebatePercentage: Math.random() * 2 + 0.5,
    rebateAmount: Math.random() * 50 + 10,
    rebateAmountEUR: Math.random() * 45 + 9,
    calculationType: ['visa_mco', 'partnerpay', 'voyage_prive'][Math.floor(Math.random() * 3)],
  }));

  return {
    success: true,
    transactionsProcessed: mockTransactions.length,
    rebatesCalculated: mockRebates.length,
    errors: [],
    warnings: [],
    processingTime: 2500,
    summary: {
      totalTransactions: mockTransactions.length,
      totalRebateAmount: mockRebates.reduce((sum, r) => sum + r.rebateAmount, 0),
      totalRebateAmountEUR: mockRebates.reduce((sum, r) => sum + r.rebateAmountEUR, 0),
      byCalculationType: {
        visa_mco: mockRebates.filter(r => r.calculationType === 'visa_mco').length,
        partnerpay: mockRebates.filter(r => r.calculationType === 'partnerpay').length,
        voyage_prive: mockRebates.filter(r => r.calculationType === 'voyage_prive').length,
      },
      byProvider: mockRebates.reduce((acc, r) => {
        acc[r.providerCustomerCode] = (acc[r.providerCustomerCode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  };
});

ipcMain.handle('rebate:getResults', async () => {
  return {
    transactions: mockTransactions,
    calculatedRebates: mockRebates,
    summary: {
      totalTransactions: mockTransactions.length,
      totalRebateAmount: mockRebates.reduce((sum, r) => sum + (r.rebateAmount || 0), 0),
      totalRebateAmountEUR: mockRebates.reduce((sum, r) => sum + (r.rebateAmountEUR || 0), 0),
      byCalculationType: mockRebates.reduce((acc, r) => {
        acc[r.calculationType] = (acc[r.calculationType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byProvider: mockRebates.reduce((acc, r) => {
        acc[r.providerCustomerCode] = (acc[r.providerCustomerCode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  };
});

ipcMain.handle('rebate:generateSubmissionFile', async (event, data: any) => {
  // Mock submission file generation
  return mockRebates.slice(0, 100).map(rebate => ({
    providerCustomerCode: rebate.providerCustomerCode,
    sapVendorCode: `SAP_${rebate.providerCustomerCode}`,
    vendorName: `Vendor ${rebate.providerCustomerCode}`,
    productName: rebate.productName,
    billingMaterial: `BM_${rebate.productName}`,
    rebateLevel: rebate.rebateLevel,
    rebateAmount: rebate.rebateAmount,
    rebateAmountEUR: rebate.rebateAmountEUR,
    transactionCount: Math.floor(Math.random() * 50) + 1,
    currency: 'EUR',
    period: `${data.configuration?.year || 2024}-${(data.configuration?.month || 1).toString().padStart(2, '0')}`,
  }));
});

ipcMain.handle('error:show', async (event, message: string) => {
  await dialog.showErrorBox('Error', message);
});