import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export interface Configuration {
  id?: number;
  folder_path: string;
  year: number;
  month: number;
  created_at?: string;
}

export interface TransactionData {
  id?: number;
  transaction_card_number: string;
  transaction_currency: string;
  provider_customer_code: string;
  transaction_type: string;
  transaction_card: string;
  salesforce_product_name: string;
  funding_account_name: string;
  region: string;
  region_mc: string;
  transaction_date: string;
  bin_card_number: number;
  transaction_amount: number;
  interchange_amount: number;
  interchange_percentage: number;
  transaction_id: string;
  transaction_amount_eur: number;
  fx_rate: number;
  pk_reference: string;
  transaction_merchant_country: string;
  transaction_merchant_category_code: number;
  merchant_name: string;
  transaction_merchant_name: string;
  processed_at?: string;
}

export interface CalculatedRebate {
  id?: number;
  transaction_id: string;
  provider_customer_code: string;
  product_name: string;
  rebate_level: number;
  rebate_percentage: number;
  rebate_amount: number;
  rebate_amount_eur: number;
  calculation_type: string;
  calculated_at?: string;
}

export class DatabaseManager {
  private dataDir: string;
  private isInitialized = false;
  
  // In-memory storage
  private configurations: Configuration[] = [];
  private transactionData: TransactionData[] = [];
  private calculatedRebates: CalculatedRebate[] = [];
  private visaMCORebates: any[] = [];
  private partnerPayRebates: any[] = [];
  private libraryData: any[] = [];

  constructor() {
    // Use app data directory
    const userDataPath = app.getPath('userData');
    this.dataDir = path.join(userDataPath, 'ixaris-rebates-data');
  }

  async initialize(): Promise<boolean> {
    try {
      // Create data directory if it doesn't exist
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Load existing data
      await this.loadAllData();
      
      this.isInitialized = true;
      console.log('JSON Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return false;
    }
  }

  private async loadAllData(): Promise<void> {
    try {
      this.configurations = await this.loadJsonFile('configurations.json', []);
      this.transactionData = await this.loadJsonFile('transaction_data.json', []);
      this.calculatedRebates = await this.loadJsonFile('calculated_rebates.json', []);
      this.visaMCORebates = await this.loadJsonFile('visa_mco_rebates.json', []);
      this.partnerPayRebates = await this.loadJsonFile('partnerpay_rebates.json', []);
      this.libraryData = await this.loadJsonFile('library_data.json', []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private async loadJsonFile(filename: string, defaultValue: any[]): Promise<any[]> {
    const filepath = path.join(this.dataDir, filename);
    try {
      if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(data);
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
      return defaultValue;
    }
  }

  private async saveJsonFile(filename: string, data: any[]): Promise<void> {
    const filepath = path.join(this.dataDir, filename);
    try {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving ${filename}:`, error);
      throw error;
    }
  }

  private checkInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
  }

  // Configuration methods
  async saveConfiguration(config: Omit<Configuration, 'id' | 'created_at'>): Promise<void> {
    this.checkInitialized();
    
    const newConfig: Configuration = {
      ...config,
      id: this.configurations.length + 1,
      created_at: new Date().toISOString()
    };
    
    this.configurations = [newConfig]; // Keep only the latest
    await this.saveJsonFile('configurations.json', this.configurations);
  }

  async getConfiguration(): Promise<Configuration | null> {
    this.checkInitialized();
    return this.configurations.length > 0 ? this.configurations[0] : null;
  }

  // Transaction data methods
  async insertTransactionData(transactions: TransactionData[]): Promise<void> {
    this.checkInitialized();
    
    const processedTransactions = transactions.map((txn, index) => ({
      ...txn,
      id: index + 1,
      processed_at: new Date().toISOString()
    }));
    
    this.transactionData = processedTransactions;
    await this.saveJsonFile('transaction_data.json', this.transactionData);
  }

  async clearTransactionData(): Promise<void> {
    this.checkInitialized();
    this.transactionData = [];
    await this.saveJsonFile('transaction_data.json', this.transactionData);
  }

  async getTransactionData(): Promise<TransactionData[]> {
    this.checkInitialized();
    return this.transactionData;
  }

  // Calculated rebates methods
  async insertCalculatedRebates(rebates: CalculatedRebate[]): Promise<void> {
    this.checkInitialized();
    
    const processedRebates = rebates.map((rebate, index) => ({
      ...rebate,
      id: index + 1,
      calculated_at: new Date().toISOString()
    }));
    
    this.calculatedRebates = processedRebates;
    await this.saveJsonFile('calculated_rebates.json', this.calculatedRebates);
  }

  async clearCalculatedRebates(): Promise<void> {
    this.checkInitialized();
    this.calculatedRebates = [];
    await this.saveJsonFile('calculated_rebates.json', this.calculatedRebates);
  }

  async getCalculatedRebates(): Promise<CalculatedRebate[]> {
    this.checkInitialized();
    return this.calculatedRebates;
  }

  // Visa MCO rebates methods
  async insertVisaMCORebates(rebates: any[]): Promise<void> {
    this.checkInitialized();
    this.visaMCORebates = rebates;
    await this.saveJsonFile('visa_mco_rebates.json', this.visaMCORebates);
  }

  async clearVisaMCORebates(): Promise<void> {
    this.checkInitialized();
    this.visaMCORebates = [];
    await this.saveJsonFile('visa_mco_rebates.json', this.visaMCORebates);
  }

  async getVisaMCORebates(): Promise<any[]> {
    this.checkInitialized();
    return this.visaMCORebates;
  }

  // PartnerPay rebates methods
  async insertPartnerPayRebates(rebates: any[]): Promise<void> {
    this.checkInitialized();
    this.partnerPayRebates = rebates;
    await this.saveJsonFile('partnerpay_rebates.json', this.partnerPayRebates);
  }

  async clearPartnerPayRebates(): Promise<void> {
    this.checkInitialized();
    this.partnerPayRebates = [];
    await this.saveJsonFile('partnerpay_rebates.json', this.partnerPayRebates);
  }

  async getPartnerPayRebates(): Promise<any[]> {
    this.checkInitialized();
    return this.partnerPayRebates;
  }

  // Library data methods
  async insertLibraryData(dataType: string, dataKey: string, dataValue: string, additionalData?: string): Promise<void> {
    this.checkInitialized();
    
    const newEntry = {
      id: this.libraryData.length + 1,
      data_type: dataType,
      data_key: dataKey,
      data_value: dataValue,
      additional_data: additionalData || null,
      created_at: new Date().toISOString()
    };
    
    this.libraryData.push(newEntry);
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async getLibraryData(dataType: string, dataKey?: string): Promise<any[]> {
    this.checkInitialized();
    
    let filtered = this.libraryData.filter(item => item.data_type === dataType);
    
    if (dataKey) {
      filtered = filtered.filter(item => item.data_key === dataKey);
    }
    
    return filtered;
  }

  async clearLibraryData(dataType?: string): Promise<void> {
    this.checkInitialized();
    
    if (dataType) {
      // Clear only specific data type
      this.libraryData = this.libraryData.filter(item => item.data_type !== dataType);
    } else {
      // Clear all library data
      this.libraryData = [];
    }
    
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    this.checkInitialized();
    
    this.configurations = [];
    this.transactionData = [];
    this.calculatedRebates = [];
    this.visaMCORebates = [];
    this.partnerPayRebates = [];
    this.libraryData = [];
    
    await Promise.all([
      this.saveJsonFile('configurations.json', this.configurations),
      this.saveJsonFile('transaction_data.json', this.transactionData),
      this.saveJsonFile('calculated_rebates.json', this.calculatedRebates),
      this.saveJsonFile('visa_mco_rebates.json', this.visaMCORebates),
      this.saveJsonFile('partnerpay_rebates.json', this.partnerPayRebates),
      this.saveJsonFile('library_data.json', this.libraryData)
    ]);
  }
}