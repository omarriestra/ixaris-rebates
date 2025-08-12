import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { DatabaseManager } from '../../database/DatabaseManager';
import {
  AppConfiguration,
  FileValidationResult,
  TransactionRecord,
  VisaMCORebateRecord,
  PartnerPayRebateRecord,
  LibraryAirlineMCC,
  LibraryRegionCountry,
  LibraryVoyagePrive,
  LibraryBillingMaterial,
  LibrarySAPCode,
  ProcessingProgress,
  ProcessingResult,
  ExportData,
  SubmissionFileRow
} from '../../shared/types';

// CSV File Structure Definitions
interface CSVStructure {
  requiredHeaders: string[];
  optionalHeaders?: string[];
  description: string;
}

const CSV_STRUCTURES: { [key: string]: CSVStructure } = {
  TRANSACTION: {
    requiredHeaders: [
      'Transaction Card Number', 'Transaction Currency', 'Provider_Customer_Code__c',
      'Transaction Type', 'Transaction Card', 'Salesforce product name',
      'Funding Account Name', 'Region', 'Region MC', 'Transaction Date',
      'BIN Card Number', '-Sum([Transaction Amount])', 'Sum([Interchange Amount])',
      'INTERCHANGE %', 'Transaction Id', 'Transaction Amount in EUR',
      'fx', 'PK', 'Transaction Merchant Country', 'Transaction Merchant Category Code',
      'Merchant Name', 'Transaction Merchant Name'
    ],
    description: 'NIUM QLIK Transaction Data'
  },
  VISA_MCO_YEARLY: {
    requiredHeaders: [
      'Provider Customer Code', 'Product Name', 'Rebate 1 Yearly', 'Rebate 2 Yearly',
      'Rebate 3 Yearly', 'Rebate 4 Yearly', 'Rebate 5 Yearly', 'Rebate 6 Yearly',
      'Rebate 7 Yearly', 'Rebate 8 Yearly'
    ],
    optionalHeaders: [
      'Account Name: Account Name', 'Opportunity Name', 'Full Opportunity Stage',
      'Payment Partner: Account Name', 'Account Name: Master Account'
    ],
    description: 'Visa & Mastercard Yearly Rebate Configuration'
  },
  VISA_MCO_MONTHLY: {
    requiredHeaders: [
      'Provider Customer Code', 'Product Name', 'Rebate 1 Monthly', 'Rebate 2 Monthly',
      'Rebate 3 Monthly', 'Rebate 4 Monthly', 'Rebate 5 Monthly', 'Rebate 6 Monthly',
      'Rebate 7 Monthly', 'Rebate 8 Monthly'
    ],
    optionalHeaders: [
      'Account Name: Account Name', 'Opportunity Name', 'Full Opportunity Stage',
      'Payment Partner: Account Name', 'Account Name: Master Account'
    ],
    description: 'Visa & Mastercard Monthly Rebate Configuration'
  },
  PARTNERPAY_YEARLY: {
    requiredHeaders: [
      'Provider Customer Code', 'Product Name', 'Partner Pay Airline: Account Name',
      'PartnerPay/PartnerDirect BIN', 'Rebate 1 Yearly', 'Rebate 2 Yearly',
      'Rebate 3 Yearly', 'Rebate 4 Yearly', 'Rebate 5 Yearly', 'Rebate 6 Yearly',
      'Rebate 7 Yearly', 'Rebate 8 Yearly'
    ],
    optionalHeaders: [],
    description: 'PartnerPay/PartnerDirect Yearly Rebate Configuration'
  },
  PARTNERPAY_MONTHLY: {
    requiredHeaders: [
      'Provider Customer Code', 'Product Name', 'Partner Pay Airline: Account Name',
      'PartnerPay/PartnerDirect BIN', 'Rebate 1 Monthly', 'Rebate 2 Monthly',
      'Rebate 3 Monthly', 'Rebate 4 Monthly', 'Rebate 5 Monthly', 'Rebate 6 Monthly',
      'Rebate 7 Monthly', 'Rebate 8 Monthly'
    ],
    optionalHeaders: [],
    description: 'PartnerPay/PartnerDirect Monthly Rebate Configuration'
  },
  REGION_COUNTRY: {
    requiredHeaders: [
      'Provider_Customer_Code', 'Product_Name', 'Region_MC', 'Transaction Merchant Country',
      'Rebate 1 Yearly', 'Rebate 2 Yearly', 'Rebate 3 Yearly', 'Rebate 4 Yearly'
    ],
    optionalHeaders: [
      'Rebate 5 Yearly', 'Rebate 6 Yearly', 'Rebate 7 Yearly', 'Rebate 8 Yearly'
    ],
    description: 'Region/Country Specific Rebate Rules'
  },
  BILLING_MATERIALS: {
    requiredHeaders: ['Product Name', 'Billing Material ID'],
    description: 'Product to Billing Material Mapping'
  },
  VOYAGE_PRIVE: {
    requiredHeaders: [
      'Provider_Customer_Code', 'Product_Name', 'Rebate 1', 'Rebate 2',
      'Rebate 3', 'Rebate 4', 'Rebate 5', 'Rebate 6', 'Rebate 7', 'Rebate 8'
    ],
    description: 'Voyage Prive Special Rebate Configuration'
  },
  AIRLINES_MCC: {
    requiredHeaders: ['Airline Name', 'Airline Code', 'MCC Code'],
    description: 'Airlines to MCC Code Mapping'
  },
  SAP_CODES: {
    requiredHeaders: ['Provider_Customer_Code', 'SAP_Vendor_Code', 'Vendor_Name'],
    description: 'Provider to SAP Code Mapping'
  }
};

export class FileProcessor {
  private databaseManager: DatabaseManager;
  private requiredFiles = [
    'Visa & MCO Monthly Rebate',
    'Visa & MCO Yearly Rebate',
    'PartnerPay_PartnerDirect Monthly Rebate',
    'PartnerPay_PartnerDirect Yearly Rebate',
    'Library_NIUM'
  ];

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  async validateFiles(folderPath: string, year: number, month: number): Promise<FileValidationResult> {
    const startTime = Date.now();
    console.log(`[FileProcessor] Starting validation for folder: ${folderPath}`);
    
    const result: FileValidationResult = {
      isValid: true,
      foundFiles: [],
      missingFiles: [],
      errors: []
    };

    try {
      // Check if folder exists
      console.log(`[FileProcessor] Checking if folder exists...`);
      if (!fs.existsSync(folderPath)) {
        result.isValid = false;
        result.errors.push(`Folder does not exist: ${folderPath}`);
        console.log(`[FileProcessor] Folder does not exist: ${folderPath}`);
        return result;
      }

      // Get all files in the folder
      console.log(`[FileProcessor] Reading folder contents...`);
      const files = fs.readdirSync(folderPath);
      const dataFiles = files.filter(file => file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.csv'));
      console.log(`[FileProcessor] Found ${dataFiles.length} data files: ${dataFiles.join(', ')}`);

      // Check for transaction file (try both CSV and Excel)
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;
      const transactionFileNames = [
        `${yearMonth}_NIUM_QLIK.csv`,
        `${yearMonth}_NIUM_QLIK.xlsx`
      ];
      
      let foundTransactionFile = false;
      for (const fileName of transactionFileNames) {
        if (dataFiles.includes(fileName)) {
          result.foundFiles.push(fileName);
          console.log(`[FileProcessor] ✓ Found transaction file: ${fileName}`);
          foundTransactionFile = true;
          break;
        }
      }
      
      if (!foundTransactionFile) {
        result.missingFiles.push(`${yearMonth}_NIUM_QLIK.csv/.xlsx`);
        result.isValid = false;
        console.log(`[FileProcessor] ✗ Missing transaction file: ${transactionFileNames.join(' or ')}`);
      }

      // Check for required lookup files
      console.log(`[FileProcessor] Checking for required lookup files...`);
      for (const requiredFile of this.requiredFiles) {
        if (requiredFile === 'Library_NIUM') {
          // Special handling for Library_NIUM - can be a file, folder, or individual CSV files
          const foundFile = dataFiles.find(file => file.startsWith(requiredFile));
          const libraryFolderPath = path.join(folderPath, 'Library_NIUM');
          
          // Check for individual library CSV files in main folder
          const libraryFilePatterns = ['AirlinesMCC.csv', 'RegionCountry.csv', 'VoyagePrive.csv', 'BillingMaterials.csv', 'SAP_BPCodes.csv'];
          const foundLibraryFiles = libraryFilePatterns.filter(pattern => dataFiles.includes(pattern));
          
          if (foundFile) {
            result.foundFiles.push(foundFile);
            console.log(`[FileProcessor] ✓ Found lookup file: ${foundFile}`);
          } else if (fs.existsSync(libraryFolderPath)) {
            result.foundFiles.push('Library_NIUM/ (folder)');
            console.log(`[FileProcessor] ✓ Found Library_NIUM folder with CSV files`);
          } else if (foundLibraryFiles.length >= 3) {
            result.foundFiles.push(`Individual library CSV files: ${foundLibraryFiles.join(', ')}`);
            console.log(`[FileProcessor] ✓ Found individual library CSV files: ${foundLibraryFiles.join(', ')}`);
          } else {
            result.missingFiles.push(`${requiredFile}.csv/.xlsx, Library_NIUM/ folder, or individual library CSV files`);
            result.isValid = false;
            console.log(`[FileProcessor] ✗ Missing lookup file: ${requiredFile}`);
          }
        } else {
          const foundFile = dataFiles.find(file => file.startsWith(requiredFile));
          if (foundFile) {
            result.foundFiles.push(foundFile);
            console.log(`[FileProcessor] ✓ Found lookup file: ${foundFile}`);
          } else {
            result.missingFiles.push(`${requiredFile}.csv/.xlsx`);
            result.isValid = false;
            console.log(`[FileProcessor] ✗ Missing lookup file: ${requiredFile}`);
          }
        }
      }

      // Skip heavy file structure validation for now to prevent blocking
      console.log(`[FileProcessor] Skipping detailed file structure validation to prevent blocking`);
      console.log(`[FileProcessor] Found ${result.foundFiles.length} files, missing ${result.missingFiles.length} files`);
      
      // If we have missing files, validation failed
      if (result.missingFiles.length > 0) {
        result.isValid = false;
      }

    } catch (error) {
      const errorMessage = `Validation failed: ${(error as Error).message}`;
      result.errors.push(errorMessage);
      result.isValid = false;
      console.error(`[FileProcessor] ${errorMessage}`, error);
    }

    const duration = Date.now() - startTime;
    console.log(`[FileProcessor] Validation completed in ${duration}ms. Valid: ${result.isValid}`);
    return result;
  }

  // New method for detailed validation that can be called separately if needed
  async validateFileStructures(foundFiles: string[], folderPath: string): Promise<string[]> {
    const errors: string[] = [];
    console.log(`[FileProcessor] Starting detailed structure validation for ${foundFiles.length} files...`);

    for (const fileName of foundFiles) {
      console.log(`[FileProcessor] Validating structure of: ${fileName}`);
      const filePath = path.join(folderPath, fileName);
      
      try {
        // Add timeout to prevent hanging on large files
        const workbook = await this.readFileWithTimeout(filePath, 10000); // 10 second timeout
        
        if (fileName.includes('_NIUM_QLIK')) {
          console.log(`[FileProcessor] Validating transaction file structure...`);
          const result: FileValidationResult = {
            isValid: true,
            foundFiles: [],
            missingFiles: [],
            errors: []
          };
          this.validateTransactionFileStructure(workbook, fileName, result);
          errors.push(...result.errors);
        } else if (fileName.includes('Visa & MCO')) {
          console.log(`[FileProcessor] Validating Visa & MCO file structure...`);
          const result: FileValidationResult = {
            isValid: true,
            foundFiles: [],
            missingFiles: [],
            errors: []
          };
          this.validateVisaMCOFileStructure(workbook, fileName, result);
          errors.push(...result.errors);
        } else if (fileName.includes('PartnerPay_PartnerDirect')) {
          console.log(`[FileProcessor] Validating PartnerPay file structure...`);
          const result: FileValidationResult = {
            isValid: true,
            foundFiles: [],
            missingFiles: [],
            errors: []
          };
          this.validatePartnerPayFileStructure(workbook, fileName, result);
          errors.push(...result.errors);
        } else if (fileName.includes('Library_NIUM')) {
          console.log(`[FileProcessor] Validating Library file structure...`);
          const result: FileValidationResult = {
            isValid: true,
            foundFiles: [],
            missingFiles: [],
            errors: []
          };
          this.validateLibraryFileStructure(workbook, fileName, result);
          errors.push(...result.errors);
        }
      } catch (error) {
        const errorMsg = `Error reading file ${fileName}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error(`[FileProcessor] ${errorMsg}`);
      }
    }

    console.log(`[FileProcessor] Structure validation completed with ${errors.length} errors`);
    return errors;
  }

  private async readFileWithTimeout(filePath: string, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`File reading timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const workbook = XLSX.readFile(filePath);
        clearTimeout(timeout);
        resolve(workbook);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  async processFiles(config: AppConfiguration): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: false,
      transactionsProcessed: 0,
      rebatesCalculated: 0,
      errors: [],
      warnings: [],
      processingTime: 0,
      summary: {
        totalTransactions: 0,
        totalRebateAmount: 0,
        totalRebateAmountEUR: 0,
        byCalculationType: {},
        byProvider: {}
      }
    };

    try {
      // Stage 1: Validate files
      this.updateProgress('validation', 10, 'Validating files...');
      const validation = await this.validateFiles(config.folderPath, config.year, config.month);
      
      if (!validation.isValid) {
        result.errors.push(...validation.errors);
        return result;
      }

      // Stage 2: Load transaction data
      this.updateProgress('loading', 20, 'Loading transaction data...');
      const transactionData = await this.loadTransactionData(config);
      result.transactionsProcessed = transactionData.length;
      result.summary.totalTransactions = transactionData.length;
      
      // Add realistic delay
      await this.delay(500);

      // Stage 3: Load lookup data
      this.updateProgress('loading', 40, 'Loading rebate lookup data...');
      await this.loadVisaMCORebates(config.folderPath);
      await this.delay(300);
      
      this.updateProgress('loading', 60, 'Loading PartnerPay rebate data...');
      await this.loadPartnerPayRebates(config.folderPath);
      await this.delay(300);
      
      this.updateProgress('loading', 80, 'Loading library data...');
      await this.loadLibraryData(config.folderPath);
      await this.delay(300);

      // Stage 4: Process complete
      this.updateProgress('complete', 100, 'Processing complete!');
      
      result.success = true;
      result.processingTime = Date.now() - startTime;

    } catch (error) {
      result.errors.push(`Processing failed: ${(error as Error).message}`);
      console.error('File processing error:', error);
    }

    return result;
  }

  private async loadTransactionData(config: AppConfiguration): Promise<TransactionRecord[]> {
    const yearMonth = `${config.year}${config.month.toString().padStart(2, '0')}`;
    
    // Try CSV first, then Excel
    const possibleFiles = [
      `${yearMonth}_NIUM_QLIK.csv`,
      `${yearMonth}_NIUM_QLIK.xlsx`
    ];
    
    let filePath: string | null = null;
    for (const fileName of possibleFiles) {
      const testPath = path.join(config.folderPath, fileName);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        console.log(`[FileProcessor] Using transaction file: ${fileName}`);
        break;
      }
    }
    
    if (!filePath) {
      throw new Error(`Transaction file not found: ${possibleFiles.join(' or ')}`);
    }

    const rawData = this.readDataFile(filePath);

    if (rawData.length === 0) {
      throw new Error(`Transaction file is empty: ${path.basename(filePath)}`);
    }

    // Get headers and validate structure
    const headers = rawData[0] as string[];
    const validation = this.validateCSVStructure(headers, CSV_STRUCTURES.TRANSACTION, path.basename(filePath));
    
    if (!validation.isValid) {
      throw new Error(`Invalid transaction file structure:\n${validation.errors.join('\n')}`);
    }

    // Create column mapping for dynamic column access
    const columnMapping = {
      transactionCardNumber: this.getColumnIndex(headers, 'Transaction Card Number'),
      transactionCurrency: this.getColumnIndex(headers, 'Transaction Currency'),
      providerCustomerCode: this.getColumnIndex(headers, 'Provider_Customer_Code__c'),
      transactionType: this.getColumnIndex(headers, 'Transaction Type'),
      transactionCard: this.getColumnIndex(headers, 'Transaction Card'),
      salesforceProductName: this.getColumnIndex(headers, 'Salesforce product name'),
      fundingAccountName: this.getColumnIndex(headers, 'Funding Account Name'),
      region: this.getColumnIndex(headers, 'Region'),
      regionMC: this.getColumnIndex(headers, 'Region MC'),
      transactionDate: this.getColumnIndex(headers, 'Transaction Date'),
      binCardNumber: this.getColumnIndex(headers, 'BIN Card Number'),
      transactionAmount: this.getColumnIndex(headers, '-Sum([Transaction Amount])'),
      interchangeAmount: this.getColumnIndex(headers, 'Sum([Interchange Amount])'),
      interchangePercentage: this.getColumnIndex(headers, 'INTERCHANGE %'),
      transactionId: this.getColumnIndex(headers, 'Transaction Id'),
      transactionAmountEUR: this.getColumnIndex(headers, 'Transaction Amount in EUR'),
      fxRate: this.getColumnIndex(headers, 'fx'),
      pkReference: this.getColumnIndex(headers, 'PK'),
      transactionMerchantCountry: this.getColumnIndex(headers, 'Transaction Merchant Country'),
      transactionMerchantCategoryCode: this.getColumnIndex(headers, 'Transaction Merchant Category Code'),
      merchantName: this.getColumnIndex(headers, 'Merchant Name'),
      transactionMerchantName: this.getColumnIndex(headers, 'Transaction Merchant Name')
    };

    const dataRows = rawData.slice(1) as any[];
    const transactions: TransactionRecord[] = [];
    const dbTransactions: any[] = [];

    for (const row of dataRows) {
      if (this.isEmptyRow(row)) continue;

      const transaction: TransactionRecord = {
        transactionCardNumber: this.sanitizeString(row[columnMapping.transactionCardNumber]),
        transactionCurrency: this.sanitizeString(row[columnMapping.transactionCurrency]),
        providerCustomerCode: this.sanitizeString(row[columnMapping.providerCustomerCode]),
        transactionType: this.sanitizeString(row[columnMapping.transactionType]),
        transactionCard: this.sanitizeString(row[columnMapping.transactionCard]),
        salesforceProductName: this.sanitizeString(row[columnMapping.salesforceProductName]),
        fundingAccountName: this.sanitizeString(row[columnMapping.fundingAccountName]),
        region: this.sanitizeString(row[columnMapping.region]),
        regionMC: this.sanitizeString(row[columnMapping.regionMC]),
        transactionDate: this.parseDate(row[columnMapping.transactionDate]),
        binCardNumber: this.parseNumber(row[columnMapping.binCardNumber]),
        transactionAmount: this.parseNumber(row[columnMapping.transactionAmount]),
        interchangeAmount: this.parseNumber(row[columnMapping.interchangeAmount]),
        interchangePercentage: this.parseNumber(row[columnMapping.interchangePercentage]),
        transactionId: this.sanitizeString(row[columnMapping.transactionId]),
        transactionAmountEUR: this.parseNumber(row[columnMapping.transactionAmountEUR]),
        fxRate: this.parseNumber(row[columnMapping.fxRate]),
        pkReference: this.sanitizeString(row[columnMapping.pkReference]),
        transactionMerchantCountry: this.sanitizeString(row[columnMapping.transactionMerchantCountry]),
        transactionMerchantCategoryCode: this.parseNumber(row[columnMapping.transactionMerchantCategoryCode]),
        merchantName: this.sanitizeString(row[columnMapping.merchantName]),
        transactionMerchantName: this.sanitizeString(row[columnMapping.transactionMerchantName])
      };

      transactions.push(transaction);

      // Convert to database format
      const dbTransaction = {
        transaction_card_number: transaction.transactionCardNumber,
        transaction_currency: transaction.transactionCurrency,
        provider_customer_code: transaction.providerCustomerCode,
        transaction_type: transaction.transactionType,
        transaction_card: transaction.transactionCard,
        salesforce_product_name: transaction.salesforceProductName,
        funding_account_name: transaction.fundingAccountName,
        region: transaction.region,
        region_mc: transaction.regionMC,
        transaction_date: transaction.transactionDate,
        bin_card_number: transaction.binCardNumber,
        transaction_amount: transaction.transactionAmount,
        interchange_amount: transaction.interchangeAmount,
        interchange_percentage: transaction.interchangePercentage,
        transaction_id: transaction.transactionId,
        transaction_amount_eur: transaction.transactionAmountEUR,
        fx_rate: transaction.fxRate,
        pk_reference: transaction.pkReference,
        transaction_merchant_country: transaction.transactionMerchantCountry,
        transaction_merchant_category_code: transaction.transactionMerchantCategoryCode,
        merchant_name: transaction.merchantName,
        transaction_merchant_name: transaction.transactionMerchantName
      };

      dbTransactions.push(dbTransaction);
    }
    
    console.log(`[FileProcessor] Processed ${transactions.length} transactions with dynamic column mapping`);

    // Store in database
    await this.databaseManager.clearTransactionData();
    await this.databaseManager.insertTransactionData(dbTransactions);

    return transactions;
  }

  private async loadVisaMCORebates(folderPath: string): Promise<void> {
    // Clear all existing Visa/MCO rebates at the start
    await this.databaseManager.clearVisaMCORebates();
    
    // Load monthly rebates
    const monthlyFile = this.findFile(folderPath, 'Visa & MCO Monthly Rebate');
    if (monthlyFile) {
      const monthlyRebates = await this.parseVisaMCOFile(path.join(folderPath, monthlyFile), 'Monthly');
      await this.databaseManager.insertVisaMCORebates(monthlyRebates);
      console.log(`[FileProcessor] Loaded ${monthlyRebates.length} Monthly rebates`);
    }

    // Load yearly rebates (DatabaseManager will handle import_source separately)  
    const yearlyFile = this.findFile(folderPath, 'Visa & MCO Yearly Rebate');
    if (yearlyFile) {
      const yearlyRebates = await this.parseVisaMCOFile(path.join(folderPath, yearlyFile), 'Yearly');
      await this.databaseManager.insertVisaMCORebates(yearlyRebates);
      console.log(`[FileProcessor] Loaded ${yearlyRebates.length} Yearly rebates`);
      
      // Get final merged data for verification
      const finalRebates = await this.databaseManager.getVisaMCORebates();
      console.log(`[FileProcessor] Total Visa/MCO rebates after merge: ${finalRebates.length}`);
    }
  }

  private async loadPartnerPayRebates(folderPath: string): Promise<void> {
    // Clear all existing PartnerPay rebates at the start
    await this.databaseManager.clearPartnerPayRebates();
    
    // Load monthly rebates  
    const monthlyFile = this.findFile(folderPath, 'PartnerPay_PartnerDirect Monthly Rebate');
    if (monthlyFile) {
      const monthlyRebates = await this.parsePartnerPayFile(path.join(folderPath, monthlyFile), 'Monthly');
      await this.databaseManager.insertPartnerPayRebates(monthlyRebates);
      console.log(`[FileProcessor] Loaded ${monthlyRebates.length} PartnerPay Monthly rebates`);
    }

    // Load yearly rebates (DatabaseManager will handle import_source separately)
    const yearlyFile = this.findFile(folderPath, 'PartnerPay_PartnerDirect Yearly Rebate');
    if (yearlyFile) {
      const yearlyRebates = await this.parsePartnerPayFile(path.join(folderPath, yearlyFile), 'Yearly');
      await this.databaseManager.insertPartnerPayRebates(yearlyRebates);
      console.log(`[FileProcessor] Loaded ${yearlyRebates.length} PartnerPay Yearly rebates`);
      
      // Get final merged data for verification
      const finalRebates = await this.databaseManager.getPartnerPayRebates();
      console.log(`[FileProcessor] Total PartnerPay rebates after merge: ${finalRebates.length}`);
    }
  }

  private async loadLibraryData(folderPath: string): Promise<void> {
    const libraryFile = this.findFile(folderPath, 'Library_NIUM');
    if (!libraryFile) {
      // Check if we have a Library_NIUM folder with individual CSV files
      const libraryFolderPath = path.join(folderPath, 'Library_NIUM');
      if (fs.existsSync(libraryFolderPath)) {
        console.log(`[FileProcessor] Processing Library CSV folder: ${libraryFolderPath}`);
        await this.loadLibraryFromCSVFolder(libraryFolderPath);
        return;
      }
      
      // Check if we have individual library CSV files in the main folder
      console.log(`[FileProcessor] No Library_NIUM folder found, checking for individual CSV files in main folder`);
      await this.loadLibraryFromCSVFolder(folderPath);
      return;
    }

    const filePath = path.join(folderPath, libraryFile);
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.csv') {
      console.log(`[FileProcessor] Processing single Library CSV file: ${filePath}`);
      const rawData = this.readDataFile(filePath);
      console.log(`[FileProcessor] Warning: Single CSV Library processing needs specific implementation`);
      
    } else {
      // Excel file - process each sheet
      console.log(`[FileProcessor] Processing Library Excel file: ${filePath}`);
      const workbook = XLSX.readFile(filePath);

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        switch (sheetName) {
          case 'AirlinesMCC':
            await this.processAirlinesMCCSheet(rawData);
            break;
          case 'RegionCountry':
            await this.processRegionCountrySheet(rawData);
            break;
          case 'VoyagePrive':
            await this.processVoyagePriveSheet(rawData);
            break;
          case 'BillingMaterials':
            await this.processBillingMaterialsSheet(rawData);
            break;
          case 'SAP_BPCode':
            await this.processSAPCodeSheet(rawData);
            break;
        }
      }
    }
  }

  private async loadLibraryFromCSVFolder(libraryFolderPath: string): Promise<void> {
    // Get all CSV files in the library folder
    const allFiles = fs.readdirSync(libraryFolderPath).filter(f => f.endsWith('.csv'));
    console.log(`[FileProcessor] Found CSV files in library folder: ${allFiles.join(', ')}`);
    
    const csvFiles = [
      { patterns: ['AirlinesMCC.csv', 'airlines_mcc.csv'], processor: this.processAirlinesMCCSheet.bind(this), name: 'AirlinesMCC' },
      { patterns: ['RegionCountry.csv', 'region_country.csv'], processor: this.processRegionCountrySheet.bind(this), name: 'RegionCountry' },
      { patterns: ['VoyagePrive.csv', 'voyage_prive.csv', 'voyage_prive_rebates.csv'], processor: this.processVoyagePriveSheet.bind(this), name: 'VoyagePrive' },
      { patterns: ['BillingMaterials.csv', 'billing_materials.csv'], processor: this.processBillingMaterialsSheet.bind(this), name: 'BillingMaterials' },
      { patterns: ['SAP_BPCodes.csv', 'sap_bp_codes.csv'], processor: this.processSAPCodeSheet.bind(this), name: 'SAP_BPCode' }
    ];

    for (const csvFile of csvFiles) {
      let foundFile: string | null = null;
      
      // Try to find file using patterns
      for (const pattern of csvFile.patterns) {
        const csvPath = path.join(libraryFolderPath, pattern);
        if (fs.existsSync(csvPath)) {
          foundFile = pattern;
          break;
        }
      }
      
      if (foundFile) {
        const csvPath = path.join(libraryFolderPath, foundFile);
        console.log(`[FileProcessor] Processing ${csvFile.name} from ${foundFile}...`);
        try {
          const rawData = this.readDataFile(csvPath);
          await csvFile.processor(rawData);
          console.log(`[FileProcessor] ✓ Processed ${csvFile.name} from ${foundFile}`);
        } catch (error) {
          console.error(`[FileProcessor] ✗ Error processing ${foundFile}:`, error);
        }
      } else {
        console.log(`[FileProcessor] Warning: ${csvFile.name} not found. Tried: ${csvFile.patterns.join(', ')}`);
      }
    }
  }

  private async parseVisaMCOFile(filePath: string, type: 'Monthly' | 'Yearly'): Promise<any[]> {
    console.log(`[FileProcessor] Parsing Visa & MCO ${type} file: ${filePath}`);
    const rawData = this.readDataFile(filePath);
    
    if (rawData.length === 0) {
      throw new Error(`Visa & MCO ${type} file is empty: ${path.basename(filePath)}`);
    }

    // Get headers and validate structure
    const headers = rawData[0] as string[];
    const structureKey = type === 'Monthly' ? 'VISA_MCO_MONTHLY' : 'VISA_MCO_YEARLY';
    const validation = this.validateCSVStructure(headers, CSV_STRUCTURES[structureKey], path.basename(filePath));
    
    if (!validation.isValid) {
      throw new Error(`Invalid Visa & MCO ${type} file structure:\n${validation.errors.join('\n')}`);
    }

    // Create column mapping
    const columnMapping = {
      providerCustomerCode: this.getColumnIndex(headers, 'Provider Customer Code'),
      productName: this.getColumnIndex(headers, 'Product Name'),
      rebate1: this.getColumnIndex(headers, `Rebate 1 ${type}`),
      rebate2: this.getColumnIndex(headers, `Rebate 2 ${type}`),
      rebate3: this.getColumnIndex(headers, `Rebate 3 ${type}`),
      rebate4: this.getColumnIndex(headers, `Rebate 4 ${type}`),
      rebate5: this.getColumnIndex(headers, `Rebate 5 ${type}`),
      rebate6: this.getColumnIndex(headers, `Rebate 6 ${type}`),
      rebate7: this.getColumnIndex(headers, `Rebate 7 ${type}`),
      rebate8: this.getColumnIndex(headers, `Rebate 8 ${type}`)
    };

    const rebates: any[] = [];
    const dataRows = rawData.slice(1) as any[]; // Skip header

    for (const row of dataRows) {
      if (this.isEmptyRow(row)) continue;

      const rebate: any = {
        provider_customer_code: this.sanitizeString(row[columnMapping.providerCustomerCode]),
        product_name: this.sanitizeString(row[columnMapping.productName]),
      };

      // Add rebate percentages based on type
      if (type === 'Monthly') {
        rebate.rebate_1_monthly = this.parseNumber(row[columnMapping.rebate1]);
        rebate.rebate_2_monthly = this.parseNumber(row[columnMapping.rebate2]);
        rebate.rebate_3_monthly = this.parseNumber(row[columnMapping.rebate3]);
        rebate.rebate_4_monthly = this.parseNumber(row[columnMapping.rebate4]);
        rebate.rebate_5_monthly = this.parseNumber(row[columnMapping.rebate5]);
        rebate.rebate_6_monthly = this.parseNumber(row[columnMapping.rebate6]);
        rebate.rebate_7_monthly = this.parseNumber(row[columnMapping.rebate7]);
        rebate.rebate_8_monthly = this.parseNumber(row[columnMapping.rebate8]);
      } else {
        rebate.rebate_1_yearly = this.parseNumber(row[columnMapping.rebate1]);
        rebate.rebate_2_yearly = this.parseNumber(row[columnMapping.rebate2]);
        rebate.rebate_3_yearly = this.parseNumber(row[columnMapping.rebate3]);
        rebate.rebate_4_yearly = this.parseNumber(row[columnMapping.rebate4]);
        rebate.rebate_5_yearly = this.parseNumber(row[columnMapping.rebate5]);
        rebate.rebate_6_yearly = this.parseNumber(row[columnMapping.rebate6]);
        rebate.rebate_7_yearly = this.parseNumber(row[columnMapping.rebate7]);
        rebate.rebate_8_yearly = this.parseNumber(row[columnMapping.rebate8]);
      }

      // Add import_source for DatabaseManager duplicate handling
      rebate.import_source = type;
      
      rebates.push(rebate);
    }
    
    console.log(`[FileProcessor] Processed ${rebates.length} Visa & MCO ${type} rebate entries with dynamic column mapping`);
    return rebates;
  }

  private async parsePartnerPayFile(filePath: string, type: 'Monthly' | 'Yearly'): Promise<any[]> {
    console.log(`[FileProcessor] Parsing PartnerPay ${type} file: ${filePath}`);
    const rawData = this.readDataFile(filePath);
    
    if (rawData.length === 0) {
      throw new Error(`PartnerPay ${type} file is empty: ${path.basename(filePath)}`);
    }

    // Get headers and validate structure
    const headers = rawData[0] as string[];
    const structureKey = type === 'Monthly' ? 'PARTNERPAY_MONTHLY' : 'PARTNERPAY_YEARLY';
    const validation = this.validateCSVStructure(headers, CSV_STRUCTURES[structureKey], path.basename(filePath));
    
    if (!validation.isValid) {
      throw new Error(`Invalid PartnerPay ${type} file structure:\n${validation.errors.join('\n')}`);
    }

    // Create column mapping
    const columnMapping = {
      providerCustomerCode: this.getColumnIndex(headers, 'Provider Customer Code'),
      productName: this.getColumnIndex(headers, 'Product Name'),
      partnerPayAirline: this.getColumnIndex(headers, 'Partner Pay Airline: Account Name'),
      partnerPayBin: this.getColumnIndex(headers, 'PartnerPay/PartnerDirect BIN'),
      rebate1: this.getColumnIndex(headers, `Rebate 1 ${type}`),
      rebate2: this.getColumnIndex(headers, `Rebate 2 ${type}`),
      rebate3: this.getColumnIndex(headers, `Rebate 3 ${type}`),
      rebate4: this.getColumnIndex(headers, `Rebate 4 ${type}`),
      rebate5: this.getColumnIndex(headers, `Rebate 5 ${type}`),
      rebate6: this.getColumnIndex(headers, `Rebate 6 ${type}`),
      rebate7: this.getColumnIndex(headers, `Rebate 7 ${type}`),
      rebate8: this.getColumnIndex(headers, `Rebate 8 ${type}`)
    };

    const rebates: any[] = [];
    const dataRows = rawData.slice(1) as any[]; // Skip header

    for (const row of dataRows) {
      if (this.isEmptyRow(row)) continue;

      const rebate: any = {
        provider_customer_code: this.sanitizeString(row[columnMapping.providerCustomerCode]),
        product_name: this.sanitizeString(row[columnMapping.productName]),
        partner_pay_airline: this.sanitizeString(row[columnMapping.partnerPayAirline]),
        partnerpay_bin: this.sanitizeString(row[columnMapping.partnerPayBin]), // Store full BIN data as-is from CSV
      };

      // Add rebate percentages based on type
      if (type === 'Monthly') {
        rebate.rebate_1_monthly = this.parseNumber(row[columnMapping.rebate1]);
        rebate.rebate_2_monthly = this.parseNumber(row[columnMapping.rebate2]);
        rebate.rebate_3_monthly = this.parseNumber(row[columnMapping.rebate3]);
        rebate.rebate_4_monthly = this.parseNumber(row[columnMapping.rebate4]);
        rebate.rebate_5_monthly = this.parseNumber(row[columnMapping.rebate5]);
        rebate.rebate_6_monthly = this.parseNumber(row[columnMapping.rebate6]);
        rebate.rebate_7_monthly = this.parseNumber(row[columnMapping.rebate7]);
        rebate.rebate_8_monthly = this.parseNumber(row[columnMapping.rebate8]);
      } else {
        rebate.rebate_1_yearly = this.parseNumber(row[columnMapping.rebate1]);
        rebate.rebate_2_yearly = this.parseNumber(row[columnMapping.rebate2]);
        rebate.rebate_3_yearly = this.parseNumber(row[columnMapping.rebate3]);
        rebate.rebate_4_yearly = this.parseNumber(row[columnMapping.rebate4]);
        rebate.rebate_5_yearly = this.parseNumber(row[columnMapping.rebate5]);
        rebate.rebate_6_yearly = this.parseNumber(row[columnMapping.rebate6]);
        rebate.rebate_7_yearly = this.parseNumber(row[columnMapping.rebate7]);
        rebate.rebate_8_yearly = this.parseNumber(row[columnMapping.rebate8]);
      }

      // Add import_source for DatabaseManager duplicate handling
      rebate.import_source = type;
      
      rebates.push(rebate);
    }
    
    console.log(`[FileProcessor] Processed ${rebates.length} PartnerPay ${type} rebate entries with dynamic column mapping`);
    return rebates;
  }

  // Export methods
  async exportToExcel(data: ExportData, filePath: string): Promise<boolean> {
    try {
      const workbook = XLSX.utils.book_new();

      // Create Master Table sheet (Power Query style) - PRIMARY SHEET
      if ((data as any).masterTable) {
        console.log('[FileProcessor] Creating Master Table sheet with Power Query structure...');
        const masterSheet = XLSX.utils.json_to_sheet((data as any).masterTable);
        XLSX.utils.book_append_sheet(workbook, masterSheet, 'Master');
      }

      // Create submission file sheet
      const submissionData = this.prepareSubmissionData(data);
      const submissionSheet = XLSX.utils.json_to_sheet(submissionData);
      XLSX.utils.book_append_sheet(workbook, submissionSheet, 'Submission');

      // Create transactions sheet
      const transactionsSheet = XLSX.utils.json_to_sheet(data.transactions);
      XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

      // Create rebates sheet
      const rebatesSheet = XLSX.utils.json_to_sheet(data.calculatedRebates);
      XLSX.utils.book_append_sheet(workbook, rebatesSheet, 'Calculated Rebates');

      // Create summary sheet
      const summarySheet = XLSX.utils.json_to_sheet([data.summary]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Write file
      XLSX.writeFile(workbook, filePath);
      console.log(`[FileProcessor] Excel file exported successfully to: ${filePath}`);
      return true;

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      return false;
    }
  }

  // Simple Excel export for grouped summary data
  async exportSimpleExcel(data: any[], filePath: string, sheetName: string = 'Rebates Summary'): Promise<boolean> {
    try {
      console.log(`[FileProcessor] Creating simple Excel export with ${data.length} rows...`);
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Write file
      XLSX.writeFile(workbook, filePath);
      
      console.log(`[FileProcessor] Simple Excel file exported successfully to: ${filePath}`);
      return true;

    } catch (error) {
      console.error('Error exporting simple Excel:', error);
      return false;
    }
  }

  private prepareSubmissionData(data: ExportData): SubmissionFileRow[] {
    // Group rebates by provider, product, and level
    const grouped = new Map<string, SubmissionFileRow>();

    for (const rebate of data.calculatedRebates) {
      const key = `${rebate.providerCustomerCode}-${rebate.productName}-${rebate.rebateLevel}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          providerCustomerCode: rebate.providerCustomerCode,
          sapVendorCode: '', // To be filled from library data
          vendorName: '',
          productName: rebate.productName,
          billingMaterial: '', // To be filled from library data
          rebateLevel: rebate.rebateLevel,
          rebateAmount: 0,
          rebateAmountEUR: 0,
          transactionCount: 0,
          currency: rebate.originalTransaction.transactionCurrency,
          period: `${data.metadata.configuration.year}-${data.metadata.configuration.month.toString().padStart(2, '0')}`
        });
      }

      const row = grouped.get(key)!;
      row.rebateAmount += rebate.rebateAmount;
      row.rebateAmountEUR += rebate.rebateAmountEUR;
      row.transactionCount++;
    }

    return Array.from(grouped.values());
  }

  // Utility methods
  private findFile(folderPath: string, filePrefix: string): string | null {
    const files = fs.readdirSync(folderPath);
    return files.find(file => file.startsWith(filePrefix) && (file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.csv'))) || null;
  }

  // CSV Structure Validation
  private validateCSVStructure(headers: string[], expectedStructure: CSVStructure, fileName: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const normalizedHeaders = headers.map(h => h.trim().replace(/^\uFEFF/, '')); // Remove BOM
    
    console.log(`[FileProcessor] Validating CSV structure for ${fileName}`);
    console.log(`[FileProcessor] Found headers: ${normalizedHeaders.join(', ')}`);
    console.log(`[FileProcessor] Expected: ${expectedStructure.requiredHeaders.join(', ')}`);
    
    // Check for required headers
    const missingHeaders: string[] = [];
    const foundHeaders: string[] = [];
    
    for (const requiredHeader of expectedStructure.requiredHeaders) {
      const found = normalizedHeaders.some(h => 
        h.toLowerCase().includes(requiredHeader.toLowerCase()) ||
        requiredHeader.toLowerCase().includes(h.toLowerCase())
      );
      if (found) {
        foundHeaders.push(requiredHeader);
      } else {
        missingHeaders.push(requiredHeader);
      }
    }
    
    if (missingHeaders.length > 0) {
      errors.push(`\n✗ INVALID FILE STRUCTURE: ${fileName}`);
      errors.push(`\n📄 Expected Structure: ${expectedStructure.description}`);
      errors.push(`\n✓ Required Headers Found (${foundHeaders.length}): ${foundHeaders.join(', ')}`);
      errors.push(`\n✗ Missing Required Headers (${missingHeaders.length}): ${missingHeaders.join(', ')}`);
      errors.push(`\n📊 Actual Headers in File: ${normalizedHeaders.join(', ')}`);
      errors.push(`\n💡 SOLUTION: Please use the correct file with the expected structure.`);
      
      // Suggest similar files if applicable
      if (fileName.toLowerCase().includes('region')) {
        errors.push(`\n📝 NOTE: If you have 'region_country.csv' with simple structure, please use 'RegionCountry.csv' with full rebate columns instead.`);
      }
    }
    
    return {
      isValid: missingHeaders.length === 0,
      errors
    };
  }
  
  // Dynamic column mapping
  private getColumnIndex(headers: string[], targetColumn: string): number {
    const normalizedHeaders = headers.map(h => h.trim().replace(/^\uFEFF/, ''));
    
    // Try exact match first
    let index = normalizedHeaders.findIndex(h => h === targetColumn);
    if (index !== -1) {
      console.log(`[FileProcessor] Found exact match for '${targetColumn}' at index ${index}`);
      return index;
    }
    
    // Try case-insensitive match
    index = normalizedHeaders.findIndex(h => h.toLowerCase() === targetColumn.toLowerCase());
    if (index !== -1) {
      console.log(`[FileProcessor] Found case-insensitive match for '${targetColumn}' at index ${index}`);
      return index;
    }
    
    // Try partial match
    index = normalizedHeaders.findIndex(h => 
      h.toLowerCase().includes(targetColumn.toLowerCase()) ||
      targetColumn.toLowerCase().includes(h.toLowerCase())
    );
    if (index !== -1) {
      console.log(`[FileProcessor] Found partial match for '${targetColumn}' at index ${index}: '${normalizedHeaders[index]}'`);
      return index;
    }
    
    console.error(`[FileProcessor] ✗ COLUMN NOT FOUND: '${targetColumn}'`);
    console.error(`[FileProcessor] Available headers: ${normalizedHeaders.join(', ')}`);
    return -1;
  }
  
  // CSV Parser - Native implementation
  private parseCSV(csvContent: string): any[][] {
    const rows: any[][] = [];
    const lines = csvContent.split('\n');
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      const row: any[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quotes
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          row.push(this.parseCSVValue(current.trim()));
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last field
      row.push(this.parseCSVValue(current.trim()));
      rows.push(row);
    }
    
    return rows;
  }

  private parseCSVValue(value: string): any {
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    
    // Remove BOM character if present
    value = value.replace(/^\uFEFF/, '');
    
    // Try to parse as number
    if (value !== '' && !isNaN(Number(value))) {
      return Number(value);
    }
    
    // Return as string
    return value;
  }

  // Generic file reader - supports both CSV and Excel
  private readDataFile(filePath: string): any[][] {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.csv') {
      console.log(`[FileProcessor] Reading CSV file: ${filePath}`);
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      return this.parseCSV(csvContent);
    } else if (ext === '.xlsx' || ext === '.xls') {
      console.log(`[FileProcessor] Reading Excel file: ${filePath}`);
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  private isEmptyRow(row: any[]): boolean {
    return !row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '');
  }

  private sanitizeString(value: any): string {
    return value ? String(value).trim() : '';
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private parseDate(value: any): string {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toISOString().split('T')[0];
    } catch {
      return String(value);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateProgress(stage: string, percentage: number, message: string): void {
    // This will be handled by the main process
    console.log(`Progress: ${stage} - ${percentage}% - ${message}`);
    // Send progress update to renderer process
    if ((global as any).mainWindow) {
      (global as any).mainWindow.webContents.send('progress:update', {
        stage,
        percentage,
        message
      });
    }
  }

  // Validation methods
  private validateTransactionFileStructure(workbook: XLSX.WorkBook, fileName: string, result: FileValidationResult): void {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    if (range.e.c < 21) { // Should have at least 22 columns (A-V)
      result.errors.push(`${fileName}: Insufficient columns. Expected at least 22 columns.`);
      result.isValid = false;
    }
  }

  private validateVisaMCOFileStructure(workbook: XLSX.WorkBook, fileName: string, result: FileValidationResult): void {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    if (range.e.c < 13) { // Should have at least 14 columns (A-N)
      result.errors.push(`${fileName}: Insufficient columns. Expected at least 14 columns.`);
      result.isValid = false;
    }
  }

  private validatePartnerPayFileStructure(workbook: XLSX.WorkBook, fileName: string, result: FileValidationResult): void {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    if (range.e.c < 15) { // Should have at least 16 columns (A-P)
      result.errors.push(`${fileName}: Insufficient columns. Expected at least 16 columns.`);
      result.isValid = false;
    }
  }

  private validateLibraryFileStructure(workbook: XLSX.WorkBook, fileName: string, result: FileValidationResult): void {
    const requiredSheets = ['AirlinesMCC', 'RegionCountry', 'VoyagePrive', 'BillingMaterials', 'SAP_BPCode'];
    const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
    
    if (missingSheets.length > 0) {
      // Add warnings field to interface if not exists
      if (!result.errors) result.errors = [];
      result.errors.push(`${fileName}: Missing sheets: ${missingSheets.join(', ')}`);
    }
  }

  // Merge methods
  private mergeVisaMCORebates(existing: any[], yearly: any[]): any[] {
    const merged = [...existing];
    
    for (const yearlyRebate of yearly) {
      const existingIndex = merged.findIndex(r => 
        r.provider_customer_code === yearlyRebate.provider_customer_code && 
        r.product_name === yearlyRebate.product_name
      );
      
      if (existingIndex >= 0) {
        // Merge yearly data into existing monthly data
        Object.assign(merged[existingIndex], yearlyRebate);
      } else {
        // Add new yearly rebate
        merged.push(yearlyRebate);
      }
    }
    
    return merged;
  }

  private mergePartnerPayRebates(existing: any[], yearly: any[]): any[] {
    const merged = [...existing];
    
    for (const yearlyRebate of yearly) {
      const existingIndex = merged.findIndex(r => 
        r.provider_customer_code === yearlyRebate.provider_customer_code && 
        r.product_name === yearlyRebate.product_name &&
        r.partner_pay_airline === yearlyRebate.partner_pay_airline &&
        r.partnerpay_bin === yearlyRebate.partnerpay_bin
      );
      
      if (existingIndex >= 0) {
        // Merge yearly data into existing monthly data
        Object.assign(merged[existingIndex], yearlyRebate);
      } else {
        // Add new yearly rebate
        merged.push(yearlyRebate);
      }
    }
    
    return merged;
  }

  // Library data processing methods
  private async processAirlinesMCCSheet(rawData: any[]): Promise<void> {
    if (rawData.length === 0) {
      console.log(`[FileProcessor] AirlinesMCC data is empty`);
      return;
    }

    // Get headers and validate structure
    const headers = rawData[0] as string[];
    const validation = this.validateCSVStructure(headers, CSV_STRUCTURES.AIRLINES_MCC, 'AirlinesMCC');
    
    if (!validation.isValid) {
      console.error(`[FileProcessor] Invalid AirlinesMCC structure: ${validation.errors.join(', ')}`);
      return;
    }

    // Create column mapping
    const columnMapping = {
      airlineName: this.getColumnIndex(headers, 'Airline Name'),
      airlineCode: this.getColumnIndex(headers, 'Airline Code'),
      mccCode: this.getColumnIndex(headers, 'MCC Code')
    };

    const dataRows = rawData.slice(1); // Skip header
    
    for (const row of dataRows) {
      if (this.isEmptyRow(row)) continue;
      
      await this.databaseManager.insertLibraryData(
        'AirlinesMCC',
        this.sanitizeString(row[columnMapping.airlineName]),
        this.sanitizeString(row[columnMapping.airlineCode]),
        this.sanitizeString(row[columnMapping.mccCode])
      );
    }
    
    console.log(`[FileProcessor] Processed ${dataRows.length} AirlinesMCC entries with dynamic column mapping`);
  }

  private async processRegionCountrySheet(rawData: any[]): Promise<void> {
    if (rawData.length === 0) {
      console.log(`[FileProcessor] RegionCountry data is empty`);
      return;
    }

    // Get headers and validate structure
    const headers = rawData[0] as string[];
    const validation = this.validateCSVStructure(headers, CSV_STRUCTURES.REGION_COUNTRY, 'RegionCountry');
    
    if (!validation.isValid) {
      console.error(`[FileProcessor] Invalid RegionCountry structure: ${validation.errors.join(', ')}`);
      return;
    }

    // Create column mapping for RegionCountry structure
    const columnMapping = {
      providerCustomerCode: this.getColumnIndex(headers, 'Provider_Customer_Code'),
      productName: this.getColumnIndex(headers, 'Product_Name'),
      regionMC: this.getColumnIndex(headers, 'Region_MC'),
      transactionMerchantCountry: this.getColumnIndex(headers, 'Transaction Merchant Country'),
      rebate1Yearly: this.getColumnIndex(headers, 'Rebate 1 Yearly'),
      rebate2Yearly: this.getColumnIndex(headers, 'Rebate 2 Yearly'),
      rebate3Yearly: this.getColumnIndex(headers, 'Rebate 3 Yearly'),
      rebate4Yearly: this.getColumnIndex(headers, 'Rebate 4 Yearly'),
      rebate5Yearly: this.getColumnIndex(headers, 'Rebate 5 Yearly'),
      rebate6Yearly: this.getColumnIndex(headers, 'Rebate 6 Yearly'),
      rebate7Yearly: this.getColumnIndex(headers, 'Rebate 7 Yearly'),
      rebate8Yearly: this.getColumnIndex(headers, 'Rebate 8 Yearly')
    };

    const dataRows = rawData.slice(1); // Skip header
    
    for (const row of dataRows) {
      if (this.isEmptyRow(row)) continue;
      
      // Create structured data for RegionCountry with rebate information
      const regionCountryData = {
        productName: this.sanitizeString(row[columnMapping.productName]),
        regionMC: this.sanitizeString(row[columnMapping.regionMC]),
        transactionMerchantCountry: this.sanitizeString(row[columnMapping.transactionMerchantCountry]),
        rebates: {
          rebate1Yearly: this.parseNumber(row[columnMapping.rebate1Yearly]),
          rebate2Yearly: this.parseNumber(row[columnMapping.rebate2Yearly]),
          rebate3Yearly: this.parseNumber(row[columnMapping.rebate3Yearly]),
          rebate4Yearly: this.parseNumber(row[columnMapping.rebate4Yearly]),
          rebate5Yearly: this.parseNumber(row[columnMapping.rebate5Yearly]),
          rebate6Yearly: this.parseNumber(row[columnMapping.rebate6Yearly]),
          rebate7Yearly: this.parseNumber(row[columnMapping.rebate7Yearly]),
          rebate8Yearly: this.parseNumber(row[columnMapping.rebate8Yearly])
        }
      };
      
      await this.databaseManager.insertLibraryData(
        'RegionCountry',
        this.sanitizeString(row[columnMapping.providerCustomerCode]),
        JSON.stringify(regionCountryData)
      );
    }
    
    console.log(`[FileProcessor] Processed ${dataRows.length} RegionCountry entries with dynamic column mapping`);
  }

  private async processVoyagePriveSheet(rawData: any[]): Promise<void> {
    if (rawData.length === 0) {
      console.log(`[FileProcessor] VoyagePrive data is empty`);
      return;
    }

    // Get headers and validate structure
    const headers = rawData[0] as string[];
    const validation = this.validateCSVStructure(headers, CSV_STRUCTURES.VOYAGE_PRIVE, 'VoyagePrive');
    
    if (!validation.isValid) {
      console.error(`[FileProcessor] Invalid VoyagePrive structure: ${validation.errors.join(', ')}`);
      return;
    }

    // Create column mapping
    const columnMapping = {
      providerCustomerCode: this.getColumnIndex(headers, 'Provider_Customer_Code'),
      productName: this.getColumnIndex(headers, 'Product_Name'),
      rebate1: this.getColumnIndex(headers, 'Rebate 1'),
      rebate2: this.getColumnIndex(headers, 'Rebate 2'),
      rebate3: this.getColumnIndex(headers, 'Rebate 3'),
      rebate4: this.getColumnIndex(headers, 'Rebate 4'),
      rebate5: this.getColumnIndex(headers, 'Rebate 5'),
      rebate6: this.getColumnIndex(headers, 'Rebate 6'),
      rebate7: this.getColumnIndex(headers, 'Rebate 7'),
      rebate8: this.getColumnIndex(headers, 'Rebate 8')
    };

    const dataRows = rawData.slice(1); // Skip header
    
    for (const row of dataRows) {
      if (this.isEmptyRow(row)) continue;
      
      const rebateData = {
        productName: this.sanitizeString(row[columnMapping.productName]),
        rebate1: this.parseNumber(row[columnMapping.rebate1]),
        rebate2: this.parseNumber(row[columnMapping.rebate2]),
        rebate3: this.parseNumber(row[columnMapping.rebate3]),
        rebate4: this.parseNumber(row[columnMapping.rebate4]),
        rebate5: this.parseNumber(row[columnMapping.rebate5]),
        rebate6: this.parseNumber(row[columnMapping.rebate6]),
        rebate7: this.parseNumber(row[columnMapping.rebate7]),
        rebate8: this.parseNumber(row[columnMapping.rebate8])
      };
      
      await this.databaseManager.insertLibraryData(
        'VoyagePrive',
        this.sanitizeString(row[columnMapping.providerCustomerCode]),
        JSON.stringify(rebateData)
      );
    }
    
    console.log(`[FileProcessor] Processed ${dataRows.length} VoyagePrive entries with dynamic column mapping`);
  }

  private async processBillingMaterialsSheet(rawData: any[]): Promise<void> {
    if (rawData.length === 0) {
      console.log(`[FileProcessor] BillingMaterials data is empty`);
      return;
    }

    // Get headers and validate structure
    const headers = rawData[0] as string[];
    const validation = this.validateCSVStructure(headers, CSV_STRUCTURES.BILLING_MATERIALS, 'BillingMaterials');
    
    if (!validation.isValid) {
      console.error(`[FileProcessor] Invalid BillingMaterials structure: ${validation.errors.join(', ')}`);
      return;
    }

    // Create column mapping
    const columnMapping = {
      productName: this.getColumnIndex(headers, 'Product Name'),
      billingMaterialId: this.getColumnIndex(headers, 'Billing Material ID')
    };

    const dataRows = rawData.slice(1); // Skip header
    
    for (const row of dataRows) {
      if (this.isEmptyRow(row)) continue;
      
      await this.databaseManager.insertLibraryData(
        'BillingMaterials',
        this.sanitizeString(row[columnMapping.productName]),
        this.sanitizeString(row[columnMapping.billingMaterialId]),
        '' // Description - not present in this structure
      );
    }
    
    console.log(`[FileProcessor] Processed ${dataRows.length} BillingMaterials entries with dynamic column mapping`);
  }

  private async processSAPCodeSheet(rawData: any[]): Promise<void> {
    if (rawData.length === 0) {
      console.log(`[FileProcessor] SAP_BPCode data is empty`);
      return;
    }

    // Get headers and validate structure
    const headers = rawData[0] as string[];
    const validation = this.validateCSVStructure(headers, CSV_STRUCTURES.SAP_CODES, 'SAP_BPCode');
    
    if (!validation.isValid) {
      console.error(`[FileProcessor] Invalid SAP_BPCode structure: ${validation.errors.join(', ')}`);
      return;
    }

    // Create column mapping
    const columnMapping = {
      providerCustomerCode: this.getColumnIndex(headers, 'Provider_Customer_Code'),
      sapVendorCode: this.getColumnIndex(headers, 'SAP_Vendor_Code'),
      vendorName: this.getColumnIndex(headers, 'Vendor_Name')
    };

    const dataRows = rawData.slice(1); // Skip header
    
    for (const row of dataRows) {
      if (this.isEmptyRow(row)) continue;
      
      await this.databaseManager.insertLibraryData(
        'SAP_BPCode',
        this.sanitizeString(row[columnMapping.providerCustomerCode]),
        this.sanitizeString(row[columnMapping.sapVendorCode]),
        this.sanitizeString(row[columnMapping.vendorName])
      );
    }
    
    console.log(`[FileProcessor] Processed ${dataRows.length} SAP_BPCode entries with dynamic column mapping`);
  }
}