import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

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

export interface VisaMCORebate {
  id?: number;
  provider_customer_code: string;
  product_name: string;
  import_source?: 'monthly' | 'yearly';
  rebate_1_monthly?: number;
  rebate_2_monthly?: number;
  rebate_3_monthly?: number;
  rebate_4_monthly?: number;
  rebate_5_monthly?: number;
  rebate_6_monthly?: number;
  rebate_7_monthly?: number;
  rebate_8_monthly?: number;
  rebate_1_yearly?: number;
  rebate_2_yearly?: number;
  rebate_3_yearly?: number;
  rebate_4_yearly?: number;
  rebate_5_yearly?: number;
  rebate_6_yearly?: number;
  rebate_7_yearly?: number;
  rebate_8_yearly?: number;
}

export interface PartnerPayRebate {
  id?: number;
  provider_customer_code: string;
  product_name: string;
  partner_pay_airline: string;
  partnerpay_bin: string;
  import_source?: 'monthly' | 'yearly';
  rebate_1_monthly?: number;
  rebate_2_monthly?: number;
  rebate_3_monthly?: number;
  rebate_4_monthly?: number;
  rebate_5_monthly?: number;
  rebate_6_monthly?: number;
  rebate_7_monthly?: number;
  rebate_8_monthly?: number;
  rebate_1_yearly?: number;
  rebate_2_yearly?: number;
  rebate_3_yearly?: number;
  rebate_4_yearly?: number;
  rebate_5_yearly?: number;
  rebate_6_yearly?: number;
  rebate_7_yearly?: number;
  rebate_8_yearly?: number;
}

export interface AirlinesMCC {
  id?: number;
  airline_name: string;
  airline_code: string;
  mcc_code: string;
  description?: string;
}

export interface RegionCountry {
  id?: number;
  provider_customer_code: string;
  product_name?: string;
  region_mc: string;
  transaction_merchant_country: string;
  rule?: string;
  rebate_1_yearly?: number;
  rebate_2_yearly?: number;
  rebate_3_yearly?: number;
  rebate_4_yearly?: number;
  rebate_5_yearly?: number;
  rebate_6_yearly?: number;
  rebate_7_yearly?: number;
  rebate_8_yearly?: number;
}

export interface VoyagePriveRebate {
  id?: number;
  provider_customer_code: string;
  product_name: string;
  rebate_1_yearly?: number;
  rebate_2_yearly?: number;
  rebate_3_yearly?: number;
  rebate_4_yearly?: number;
  rebate_5_yearly?: number;
  rebate_6_yearly?: number;
  rebate_7_yearly?: number;
  rebate_8_yearly?: number;
}

export interface BillingMaterial {
  id?: number;
  salesforce_product_name?: string;
  billing_material?: string;
  material_code?: string;
  category?: string;
  description: string;
}

export interface SAPBPCode {
  id?: number;
  provider_customer_code?: string;
  sap_vendor_code?: string;
  bp_code?: string;
  business_partner?: string;
  vendor_name?: string;
  description?: string;
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
    // Use app data directory - work in both Electron and Node.js environments
    let userDataPath: string;
    try {
      // Try to use Electron's app.getPath first
      const { app } = require('electron');
      userDataPath = app.getPath('userData');
    } catch {
      // Fall back to OS temp directory for testing
      userDataPath = os.tmpdir();
    }
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

  async close(): Promise<void> {
    if (this.isInitialized) {
      // Save all current data before closing
      await Promise.all([
        this.saveJsonFile('configurations.json', this.configurations),
        this.saveJsonFile('transaction_data.json', this.transactionData),
        this.saveJsonFile('calculated_rebates.json', this.calculatedRebates),
        this.saveJsonFile('visa_mco_rebates.json', this.visaMCORebates),
        this.saveJsonFile('partnerpay_rebates.json', this.partnerPayRebates),
        this.saveJsonFile('library_data.json', this.libraryData)
      ]);
      console.log('JSON Database closed and data saved');
    }
  }

  private async loadAllData(): Promise<void> {
    try {
      this.configurations = await this.loadJsonFile('configurations.json', []);
      this.transactionData = await this.loadJsonFile('transaction_data.json', []);
      
      // Load calculated rebates during initialization - avoid calling getCalculatedRebates() 
      // which requires isInitialized=true to prevent deadlock
      const metaPath = path.join(this.dataDir, 'calculated_rebates_meta.json');
      if (fs.existsSync(metaPath)) {
        // Load chunked rebates directly during initialization
        try {
          const metaArray = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          const meta = metaArray[0]; // Get first element from array
          
          // For initialization, just set empty array for large datasets
          if (meta.totalRebates > 100000) {
            console.log(`[DatabaseManager] Large dataset detected (${meta.totalRebates} rebates). Will use chunked reading.`);
            this.calculatedRebates = [];
          } else {
            // Load smaller datasets normally
            const allRebates: CalculatedRebate[] = [];
            for (let i = 0; i < meta.chunks; i++) {
              const chunkPath = path.join(this.dataDir, `calculated_rebates_${i}.json`);
              if (fs.existsSync(chunkPath)) {
                const chunk = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
                allRebates.push(...chunk);
              }
            }
            this.calculatedRebates = allRebates;
          }
        } catch (error) {
          console.error('[DatabaseManager] Error loading chunked rebates during init:', error);
          this.calculatedRebates = [];
        }
      } else {
        // Fall back to legacy single file
        this.calculatedRebates = await this.loadJsonFile('calculated_rebates.json', []);
      }
      
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
      console.log(`[DatabaseManager] Saving ${filename} (${data.length} records, ${JSON.stringify(data).length} chars)...`);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      console.log(`[DatabaseManager] ✅ Successfully saved ${filename}`);
    } catch (error) {
      console.error(`[DatabaseManager] ❌ Error saving ${filename}:`, error);
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

  async getLatestConfiguration(): Promise<Configuration | null> {
    this.checkInitialized();
    return this.configurations.length > 0 ? this.configurations[this.configurations.length - 1] : null;
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
    
    const CHUNK_SIZE = 50000; // 50K rebates per file to avoid JSON size limits
    const chunks = [];
    
    // Divide into chunks
    for (let i = 0; i < rebates.length; i += CHUNK_SIZE) {
      chunks.push(rebates.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`[DatabaseManager] Saving ${rebates.length} rebates in ${chunks.length} chunks...`);
    
    // Save each chunk in a separate file
    for (let i = 0; i < chunks.length; i++) {
      const processedChunk = chunks[i].map((rebate, index) => ({
        ...rebate,
        id: (i * CHUNK_SIZE) + index + 1,
        calculated_at: new Date().toISOString()
      }));
      
      await this.saveJsonFile(`calculated_rebates_${i}.json`, processedChunk);
      console.log(`[DatabaseManager] Saved chunk ${i + 1}/${chunks.length} (${processedChunk.length} rebates)`);
    }
    
    // Save metadata for later retrieval (as array with single object for compatibility)
    await this.saveJsonFile('calculated_rebates_meta.json', [{
      totalRebates: rebates.length,
      chunks: chunks.length,
      chunkSize: CHUNK_SIZE,
      createdAt: new Date().toISOString()
    }]);
    
    // Keep reference to all rebates for compatibility
    this.calculatedRebates = rebates;
    
    console.log(`[DatabaseManager] Successfully saved ${rebates.length} rebates in ${chunks.length} files`);
  }

  async clearCalculatedRebates(): Promise<void> {
    this.checkInitialized();
    this.calculatedRebates = [];
    
    // Clear metadata
    const metaPath = path.join(this.dataDir, 'calculated_rebates_meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const metaArray = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const meta = metaArray[0]; // Get first element from array
        
        // Delete all chunk files
        for (let i = 0; i < meta.chunks; i++) {
          const chunkPath = path.join(this.dataDir, `calculated_rebates_${i}.json`);
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        }
        
        // Delete metadata file
        fs.unlinkSync(metaPath);
        console.log(`[DatabaseManager] Cleared ${meta.chunks} rebate chunk files`);
      } catch (error) {
        console.error('[DatabaseManager] Error clearing rebate chunks:', error);
      }
    }
    
    // Also clear legacy single file if exists
    await this.saveJsonFile('calculated_rebates.json', this.calculatedRebates);
  }

  async getCalculatedRebates(): Promise<CalculatedRebate[]> {
    this.checkInitialized();
    
    // WARNING: This method loads ALL rebates into memory
    // For large datasets, use getCalculatedRebatesChunk() instead
    
    // First check if we have rebates in memory
    if (this.calculatedRebates && this.calculatedRebates.length > 0) {
      return this.calculatedRebates;
    }
    
    // Otherwise, try to load from chunked files
    try {
      const metaPath = path.join(this.dataDir, 'calculated_rebates_meta.json');
      if (!fs.existsSync(metaPath)) {
        return [];
      }
      
      const metaArray = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const meta = metaArray[0]; // Get first element from array
      
      // For very large datasets, return empty array and use chunked reading
      if (meta.totalRebates > 100000) {
        console.log(`[DatabaseManager] Dataset too large (${meta.totalRebates} rebates). Use getCalculatedRebatesChunk() instead.`);
        return [];
      }
      
      const allRebates: CalculatedRebate[] = [];
      
      console.log(`[DatabaseManager] Loading ${meta.totalRebates} rebates from ${meta.chunks} chunks...`);
      
      // Load all chunks
      for (let i = 0; i < meta.chunks; i++) {
        const chunkPath = path.join(this.dataDir, `calculated_rebates_${i}.json`);
        if (fs.existsSync(chunkPath)) {
          const chunk = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
          allRebates.push(...chunk);
        }
      }
      
      console.log(`[DatabaseManager] Loaded ${allRebates.length} rebates from chunks`);
      this.calculatedRebates = allRebates;
      return allRebates;
      
    } catch (error) {
      console.error('[DatabaseManager] Error loading chunked rebates:', error);
      return [];
    }
  }

  // Get metadata about calculated rebates without loading them all
  async getCalculatedRebatesMetadata(): Promise<{ totalRebates: number; chunks: number; chunkSize: number } | null> {
    this.checkInitialized();
    
    try {
      const metaPath = path.join(this.dataDir, 'calculated_rebates_meta.json');
      if (!fs.existsSync(metaPath)) {
        return null;
      }
      
      const metaArray = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return metaArray[0];
    } catch (error) {
      console.error('[DatabaseManager] Error reading metadata:', error);
      return null;
    }
  }

  // Get a specific chunk of calculated rebates
  async getCalculatedRebatesChunk(chunkIndex: number): Promise<CalculatedRebate[]> {
    this.checkInitialized();
    
    try {
      const chunkPath = path.join(this.dataDir, `calculated_rebates_${chunkIndex}.json`);
      if (!fs.existsSync(chunkPath)) {
        return [];
      }
      
      const chunk = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
      console.log(`[DatabaseManager] Loaded chunk ${chunkIndex} with ${chunk.length} rebates`);
      return chunk;
    } catch (error) {
      console.error(`[DatabaseManager] Error loading chunk ${chunkIndex}:`, error);
      return [];
    }
  }

  // Process all rebates in chunks without loading all into memory
  async processCalculatedRebatesInChunks(
    processor: (rebates: CalculatedRebate[], chunkIndex: number, totalChunks: number) => Promise<void>
  ): Promise<void> {
    this.checkInitialized();
    
    const metadata = await this.getCalculatedRebatesMetadata();
    if (!metadata) {
      console.log('[DatabaseManager] No rebates metadata found');
      return;
    }
    
    console.log(`[DatabaseManager] Processing ${metadata.totalRebates} rebates in ${metadata.chunks} chunks...`);
    
    for (let i = 0; i < metadata.chunks; i++) {
      const chunk = await this.getCalculatedRebatesChunk(i);
      if (chunk.length > 0) {
        await processor(chunk, i, metadata.chunks);
      }
    }
  }

  // Visa MCO rebates methods
  async insertVisaMCORebates(rebates: any[]): Promise<void> {
    this.checkInitialized();
    
    if (rebates.length === 0) return;
    
    // Get the import_source from the first rebate to know what we're importing
    const newImportSource = rebates[0].import_source;
    
    // Remove existing records with the same import_source to avoid duplicates
    const filteredExisting = this.visaMCORebates.filter(existing => 
      existing.import_source !== newImportSource
    );
    
    // Combine existing records (from other import_source) with new records
    this.visaMCORebates = [...filteredExisting, ...rebates];
    
    console.log(`[DatabaseManager] Visa MCO: Added ${rebates.length} ${newImportSource} records. Total: ${this.visaMCORebates.length}`);
    
    await this.saveJsonFile('visa_mco_rebates.json', this.visaMCORebates);
  }

  async clearVisaMCORebates(): Promise<void> {
    this.checkInitialized();
    this.visaMCORebates = [];
    await this.saveJsonFile('visa_mco_rebates.json', this.visaMCORebates);
  }

  async getVisaMCORebates(): Promise<any[]> {
    this.checkInitialized();
    
    // Auto-merge Monthly and Yearly data by provider+product
    const merged = new Map<string, any>();
    
    for (const rebate of this.visaMCORebates) {
      const key = `${rebate.provider_customer_code}|${rebate.product_name}`;
      
      if (merged.has(key)) {
        // Merge with existing record - combine Monthly and Yearly data
        const existing = merged.get(key);
        Object.assign(existing, rebate);
      } else {
        // Create new merged record
        merged.set(key, { ...rebate });
      }
    }
    
    return Array.from(merged.values());
  }

  // PartnerPay rebates methods
  async insertPartnerPayRebates(rebates: any[]): Promise<void> {
    this.checkInitialized();
    
    if (rebates.length === 0) return;
    
    // Get the import_source from the first rebate to know what we're importing
    const newImportSource = rebates[0].import_source;
    
    // Remove existing records with the same import_source to avoid duplicates
    const filteredExisting = this.partnerPayRebates.filter(existing => 
      existing.import_source !== newImportSource
    );
    
    // Combine existing records (from other import_source) with new records
    this.partnerPayRebates = [...filteredExisting, ...rebates];
    
    console.log(`[DatabaseManager] PartnerPay: Added ${rebates.length} ${newImportSource} records. Total: ${this.partnerPayRebates.length}`);
    
    await this.saveJsonFile('partnerpay_rebates.json', this.partnerPayRebates);
  }

  async clearPartnerPayRebates(): Promise<void> {
    this.checkInitialized();
    this.partnerPayRebates = [];
    await this.saveJsonFile('partnerpay_rebates.json', this.partnerPayRebates);
  }

  async getPartnerPayRebates(): Promise<any[]> {
    this.checkInitialized();
    
    // Auto-merge Monthly and Yearly data by provider+product+airline+bin
    const merged = new Map<string, any>();
    
    for (const rebate of this.partnerPayRebates) {
      const key = `${rebate.provider_customer_code}|${rebate.product_name}|${rebate.partner_pay_airline}|${rebate.partnerpay_bin}`;
      
      if (merged.has(key)) {
        // Merge with existing record - combine Monthly and Yearly data
        const existing = merged.get(key);
        Object.assign(existing, rebate);
      } else {
        // Create new merged record  
        merged.set(key, { ...rebate });
      }
    }
    
    return Array.from(merged.values());
  }

  // Library data methods - Compatible with RebateCalculator
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

  // Methods that RebateCalculator expects
  async getAirlinesMCC(): Promise<any[]> {
    this.checkInitialized();
    return this.libraryData.filter(item => item.data_type === 'AirlinesMCC').map(item => ({
      AIRLINE_NAME: item.data_value || '',
      AIRLINE_CODE: item.additional_data || '',
      MCC_CODE: item.data_key || ''
    }));
  }

  async getRegionCountry(): Promise<any[]> {
    this.checkInitialized();
    return this.libraryData.filter(item => item.data_type === 'RegionCountry').map(item => {
      const additionalData = item.additional_data ? JSON.parse(item.additional_data) : {};
      return {
        provider_customer_code: item.data_key,
        product_name: item.data_value,
        region_mc: additionalData.region_mc || '',
        transaction_merchant_country: additionalData.transactionMerchantCountry || '',
        rebate_1_yearly: additionalData.rebate_1_yearly || 0,
        rebate_2_yearly: additionalData.rebate_2_yearly || 0,
        rebate_3_yearly: additionalData.rebate_3_yearly || 0,
        rebate_4_yearly: additionalData.rebate_4_yearly || 0,
        rebate_5_yearly: additionalData.rebate_5_yearly || 0,
        rebate_6_yearly: additionalData.rebate_6_yearly || 0,
        rebate_7_yearly: additionalData.rebate_7_yearly || 0,
        rebate_8_yearly: additionalData.rebate_8_yearly || 0
      };
    });
  }

  async getVoyagePriveRebates(): Promise<any[]> {
    this.checkInitialized();
    return this.libraryData.filter(item => item.data_type === 'VoyagePrive').map(item => {
      const rebateData = item.additional_data ? JSON.parse(item.additional_data) : {};
      return {
        PROVIDER_CUSTOMER_CODE: item.data_key,
        PRODUCT_NAME: rebateData.productName || '',
        REBATE_1_YEARLY: rebateData.rebate1 || 0,
        REBATE_2_YEARLY: rebateData.rebate2 || 0,
        REBATE_3_YEARLY: rebateData.rebate3 || 0,
        REBATE_4_YEARLY: rebateData.rebate4 || 0,
        REBATE_5_YEARLY: rebateData.rebate5 || 0,
        REBATE_6_YEARLY: rebateData.rebate6 || 0,
        REBATE_7_YEARLY: rebateData.rebate7 || 0,
        REBATE_8_YEARLY: rebateData.rebate8 || 0
      };
    });
  }

  async getBillingMaterials(): Promise<any[]> {
    this.checkInitialized();
    return this.libraryData.filter(item => item.data_type === 'BillingMaterials').map(item => ({
      material_code: item.data_key,
      description: item.data_value,
      category: item.additional_data || ''
    }));
  }

  async getSAPCodes(): Promise<any[]> {
    this.checkInitialized();
    return this.libraryData.filter(item => item.data_type === 'SAP_BPCode').map(item => ({
      bp_code: item.data_key,
      business_partner: item.data_value,
      description: item.additional_data || ''
    }));
  }

  async getSAPBPCodes(): Promise<any[]> {
    return this.getSAPCodes();
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

  // Table row count method
  async getTableRowCount(tableName: string): Promise<number> {
    this.checkInitialized();
    
    switch (tableName) {
      case 'configurations':
        return this.configurations.length;
      case 'transaction_data':
        return this.transactionData.length;
      case 'calculated_rebates':
        return this.calculatedRebates.length;
      case 'visa_mco_rebates':
        return this.visaMCORebates.length;
      case 'partnerpay_rebates':
        return this.partnerPayRebates.length;
      case 'library_data':
        return this.libraryData.length;
      default:
        return 0;
    }
  }

  // Update methods for library data
  async updateAirlinesMCC(id: number, data: any): Promise<void> {
    this.checkInitialized();
    const index = this.libraryData.findIndex(item => item.id === id && item.data_type === 'AirlinesMCC');
    if (index !== -1) {
      this.libraryData[index] = { ...this.libraryData[index], ...data };
      await this.saveJsonFile('library_data.json', this.libraryData);
    }
  }

  async deleteAirlinesMCC(id: number): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => !(item.id === id && item.data_type === 'AirlinesMCC'));
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async updateRegionCountry(id: number, data: any): Promise<void> {
    this.checkInitialized();
    const index = this.libraryData.findIndex(item => item.id === id && item.data_type === 'RegionCountry');
    if (index !== -1) {
      this.libraryData[index] = { ...this.libraryData[index], ...data };
      await this.saveJsonFile('library_data.json', this.libraryData);
    }
  }

  async deleteRegionCountry(id: number): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => !(item.id === id && item.data_type === 'RegionCountry'));
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async updateVoyagePriveRebates(id: number, data: any): Promise<void> {
    this.checkInitialized();
    const index = this.libraryData.findIndex(item => item.id === id && item.data_type === 'VoyagePrive');
    if (index !== -1) {
      this.libraryData[index] = { ...this.libraryData[index], ...data };
      await this.saveJsonFile('library_data.json', this.libraryData);
    }
  }

  async deleteVoyagePriveRebates(id: number): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => !(item.id === id && item.data_type === 'VoyagePrive'));
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async updateBillingMaterial(id: number, data: any): Promise<void> {
    this.checkInitialized();
    const index = this.libraryData.findIndex(item => item.id === id && item.data_type === 'BillingMaterials');
    if (index !== -1) {
      this.libraryData[index] = { ...this.libraryData[index], ...data };
      await this.saveJsonFile('library_data.json', this.libraryData);
    }
  }

  async deleteBillingMaterial(id: number): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => !(item.id === id && item.data_type === 'BillingMaterials'));
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async updateSAPBPCode(id: number, data: any): Promise<void> {
    this.checkInitialized();
    const index = this.libraryData.findIndex(item => item.id === id && item.data_type === 'SAP_BPCode');
    if (index !== -1) {
      this.libraryData[index] = { ...this.libraryData[index], ...data };
      await this.saveJsonFile('library_data.json', this.libraryData);
    }
  }

  async deleteSAPBPCode(id: number): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => !(item.id === id && item.data_type === 'SAP_BPCode'));
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  // Bulk insert methods for CsvImporter compatibility
  async insertAirlinesMCC(data: any[]): Promise<void> {
    this.checkInitialized();
    const newEntries = data.map((item, index) => ({
      id: this.libraryData.length + index + 1,
      data_type: 'AirlinesMCC',
      data_key: item.airline_name || '',
      data_value: item.airline_code || '',
      additional_data: item.mcc_code || '',
      created_at: new Date().toISOString()
    }));
    
    this.libraryData.push(...newEntries);
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async insertRegionCountry(data: any[]): Promise<void> {
    this.checkInitialized();
    const newEntries = data.map((item, index) => ({
      id: this.libraryData.length + index + 1,
      data_type: 'RegionCountry',
      data_key: item.provider_customer_code || '',
      data_value: item.product_name || '',
      additional_data: JSON.stringify({
        region_mc: item.region_mc || '',
        transactionMerchantCountry: item.transaction_merchant_country || '',
        rebate_1_yearly: item.rebate_1_yearly || 0,
        rebate_2_yearly: item.rebate_2_yearly || 0,
        rebate_3_yearly: item.rebate_3_yearly || 0,
        rebate_4_yearly: item.rebate_4_yearly || 0,
        rebate_5_yearly: item.rebate_5_yearly || 0,
        rebate_6_yearly: item.rebate_6_yearly || 0,
        rebate_7_yearly: item.rebate_7_yearly || 0,
        rebate_8_yearly: item.rebate_8_yearly || 0
      }),
      created_at: new Date().toISOString()
    }));
    
    this.libraryData.push(...newEntries);
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async insertVoyagePriveRebates(data: any[]): Promise<void> {
    this.checkInitialized();
    const newEntries = data.map((item, index) => ({
      id: this.libraryData.length + index + 1,
      data_type: 'VoyagePrive',
      data_key: item.provider_customer_code || '',
      data_value: item.product_name || '',
      additional_data: JSON.stringify({
        productName: item.product_name,
        rebate1: item.rebate_1_yearly || 0,
        rebate2: item.rebate_2_yearly || 0,
        rebate3: item.rebate_3_yearly || 0,
        rebate4: item.rebate_4_yearly || 0,
        rebate5: item.rebate_5_yearly || 0,
        rebate6: item.rebate_6_yearly || 0,
        rebate7: item.rebate_7_yearly || 0,
        rebate8: item.rebate_8_yearly || 0
      }),
      created_at: new Date().toISOString()
    }));
    
    this.libraryData.push(...newEntries);
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async insertBillingMaterials(data: any[]): Promise<void> {
    this.checkInitialized();
    const newEntries = data.map((item, index) => ({
      id: this.libraryData.length + index + 1,
      data_type: 'BillingMaterials',
      data_key: item.material_code || '',
      data_value: item.description || '',
      additional_data: item.category || '',
      created_at: new Date().toISOString()
    }));
    
    this.libraryData.push(...newEntries);
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async insertSAPBPCodes(data: any[]): Promise<void> {
    this.checkInitialized();
    const newEntries = data.map((item, index) => ({
      id: this.libraryData.length + index + 1,
      data_type: 'SAP_BPCode',
      data_key: item.bp_code || '',
      data_value: item.business_partner || '',
      additional_data: item.description || '',
      created_at: new Date().toISOString()
    }));
    
    this.libraryData.push(...newEntries);
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  // Clear methods for CsvImporter compatibility
  async clearAirlinesMCC(): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => item.data_type !== 'AirlinesMCC');
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async clearRegionCountry(): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => item.data_type !== 'RegionCountry');
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async clearVoyagePriveRebates(): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => item.data_type !== 'VoyagePrive');
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async clearBillingMaterials(): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => item.data_type !== 'BillingMaterials');
    await this.saveJsonFile('library_data.json', this.libraryData);
  }

  async clearSAPBPCodes(): Promise<void> {
    this.checkInitialized();
    this.libraryData = this.libraryData.filter(item => item.data_type !== 'SAP_BPCode');
    await this.saveJsonFile('library_data.json', this.libraryData);
  }
}