import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Try to import electron, but don't fail if it's not available
let app: any = null;
try {
  app = require('electron').app;
} catch (error) {
  // Running in Node.js without Electron
  app = null;
}

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

export interface VisaMCORebate {
  id?: number;
  provider_customer_code: string;
  product_name: string;
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
  import_source?: string;
}

export interface PartnerPayRebate {
  id?: number;
  provider_customer_code: string;
  product_name: string;
  partner_pay_airline: string;
  partnerpay_bin: string;
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
  import_source?: string;
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

// New interfaces for Library_NIUM tables
export interface AirlinesMCC {
  id?: number;
  mcc_code: string;
  airline_name: string;
  airline_code: string;
  description?: string;
}

export interface RegionCountry {
  id?: number;
  provider_customer_code: string;
  product_name: string;
  region_mc: string;
  transaction_merchant_country: string;
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
  material_code: string;
  description: string;
  category?: string;
}

export interface SAPBPCode {
  id?: number;
  bp_code: string;
  business_partner: string;
  description?: string;
}

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(customDbPath?: string) {
    if (customDbPath) {
      this.dbPath = customDbPath;
    } else if (app && app.getPath) {
      // Running in Electron
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'ixaris_rebates.db');
    } else {
      // Running in Node.js
      const tmpDir = os.tmpdir();
      this.dbPath = path.join(tmpDir, 'ixaris-rebates-test.db');
      console.log(`📁 Using temporary database at: ${this.dbPath}`);
    }
    
    // Ensure the directory exists
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
  }

  async initialize(): Promise<boolean> {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      this.db.pragma('temp_store = MEMORY');
      
      await this.runMigrations();
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if migrations table exists
    const migrationsTableExists = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
    ).get();

    if (!migrationsTableExists) {
      this.db.exec(`
        CREATE TABLE migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Run migrations
    await this.migration001_initial_schema();
    await this.migration002_add_indexes();
    await this.migration003_library_tables();
    await this.migration004_update_region_country();
  }

  private async migration001_initial_schema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const applied = this.db.prepare(
      "SELECT * FROM migrations WHERE version = 1"
    ).get();

    if (applied) return;

    this.db.exec(`
      -- Configuration table
      CREATE TABLE IF NOT EXISTS configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_path TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Transaction data table
      CREATE TABLE IF NOT EXISTS transaction_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_card_number TEXT,
        transaction_currency TEXT,
        provider_customer_code TEXT,
        transaction_type TEXT,
        transaction_card TEXT,
        salesforce_product_name TEXT,
        funding_account_name TEXT,
        region TEXT,
        region_mc TEXT,
        transaction_date DATE,
        bin_card_number INTEGER,
        transaction_amount DECIMAL(15,2),
        interchange_amount DECIMAL(15,2),
        interchange_percentage DECIMAL(5,2),
        transaction_id TEXT,
        transaction_amount_eur DECIMAL(15,2),
        fx_rate DECIMAL(10,6),
        pk_reference TEXT,
        transaction_merchant_country TEXT,
        transaction_merchant_category_code INTEGER,
        merchant_name TEXT,
        transaction_merchant_name TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Visa & MCO rebates table
      CREATE TABLE IF NOT EXISTS visa_mco_rebates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_customer_code TEXT NOT NULL,
        product_name TEXT NOT NULL,
        rebate_1_monthly DECIMAL(5,2),
        rebate_2_monthly DECIMAL(5,2),
        rebate_3_monthly DECIMAL(5,2),
        rebate_4_monthly DECIMAL(5,2),
        rebate_5_monthly DECIMAL(5,2),
        rebate_6_monthly DECIMAL(5,2),
        rebate_7_monthly DECIMAL(5,2),
        rebate_8_monthly DECIMAL(5,2),
        rebate_1_yearly DECIMAL(5,2),
        rebate_2_yearly DECIMAL(5,2),
        rebate_3_yearly DECIMAL(5,2),
        rebate_4_yearly DECIMAL(5,2),
        rebate_5_yearly DECIMAL(5,2),
        rebate_6_yearly DECIMAL(5,2),
        rebate_7_yearly DECIMAL(5,2),
        rebate_8_yearly DECIMAL(5,2),
        UNIQUE(provider_customer_code, product_name)
      );

      -- PartnerPay rebates table
      CREATE TABLE IF NOT EXISTS partnerpay_rebates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_customer_code TEXT NOT NULL,
        product_name TEXT NOT NULL,
        partner_pay_airline TEXT NOT NULL,
        partnerpay_bin TEXT NOT NULL,
        rebate_1_monthly DECIMAL(5,2),
        rebate_2_monthly DECIMAL(5,2),
        rebate_3_monthly DECIMAL(5,2),
        rebate_4_monthly DECIMAL(5,2),
        rebate_5_monthly DECIMAL(5,2),
        rebate_6_monthly DECIMAL(5,2),
        rebate_7_monthly DECIMAL(5,2),
        rebate_8_monthly DECIMAL(5,2),
        rebate_1_yearly DECIMAL(5,2),
        rebate_2_yearly DECIMAL(5,2),
        rebate_3_yearly DECIMAL(5,2),
        rebate_4_yearly DECIMAL(5,2),
        rebate_5_yearly DECIMAL(5,2),
        rebate_6_yearly DECIMAL(5,2),
        rebate_7_yearly DECIMAL(5,2),
        rebate_8_yearly DECIMAL(5,2),
        UNIQUE(provider_customer_code, product_name, partner_pay_airline, partnerpay_bin)
      );

      -- Calculated rebates table
      CREATE TABLE IF NOT EXISTS calculated_rebates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT NOT NULL,
        provider_customer_code TEXT,
        product_name TEXT,
        rebate_level INTEGER,
        rebate_percentage DECIMAL(5,2),
        rebate_amount DECIMAL(15,2),
        rebate_amount_eur DECIMAL(15,2),
        calculation_type TEXT,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Special cases table
      CREATE TABLE IF NOT EXISTS special_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_customer_code TEXT NOT NULL,
        case_type TEXT NOT NULL,
        configuration TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Library data table (for NIUM library data)
      CREATE TABLE IF NOT EXISTS library_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sheet_name TEXT NOT NULL,
        data_key TEXT NOT NULL,
        data_value TEXT,
        additional_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    this.db.prepare("INSERT INTO migrations (version) VALUES (1)").run();
  }

  private async migration002_add_indexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const applied = this.db.prepare(
      "SELECT * FROM migrations WHERE version = 2"
    ).get();

    if (applied) return;

    this.db.exec(`
      -- Indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_transaction_data_provider_product 
        ON transaction_data(provider_customer_code, salesforce_product_name);
      
      CREATE INDEX IF NOT EXISTS idx_transaction_data_bin_merchant 
        ON transaction_data(bin_card_number, merchant_name);
      
      CREATE INDEX IF NOT EXISTS idx_transaction_data_transaction_id 
        ON transaction_data(transaction_id);
      
      CREATE INDEX IF NOT EXISTS idx_visa_mco_rebates_lookup 
        ON visa_mco_rebates(provider_customer_code, product_name);
      
      CREATE INDEX IF NOT EXISTS idx_partnerpay_rebates_lookup 
        ON partnerpay_rebates(provider_customer_code, product_name, partner_pay_airline, partnerpay_bin);
      
      CREATE INDEX IF NOT EXISTS idx_calculated_rebates_transaction 
        ON calculated_rebates(transaction_id);
      
      CREATE INDEX IF NOT EXISTS idx_library_data_lookup 
        ON library_data(sheet_name, data_key);
    `);

    this.db.prepare("INSERT INTO migrations (version) VALUES (2)").run();
  }

  private async migration003_library_tables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const applied = this.db.prepare(
      "SELECT * FROM migrations WHERE version = 3"
    ).get();

    if (applied) return;

    this.db.exec(`
      -- Airlines MCC mapping table
      CREATE TABLE IF NOT EXISTS airlines_mcc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mcc_code TEXT NOT NULL,
        airline_name TEXT NOT NULL,
        airline_code TEXT NOT NULL,
        description TEXT,
        UNIQUE(mcc_code, airline_code)
      );

      -- Region Country rules table
      CREATE TABLE IF NOT EXISTS region_country (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_customer_code TEXT NOT NULL,
        region TEXT NOT NULL,
        country TEXT NOT NULL,
        rules TEXT,
        UNIQUE(provider_customer_code, region, country)
      );

      -- Voyage Prive specific rebates table
      CREATE TABLE IF NOT EXISTS voyage_prive_rebates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_customer_code TEXT NOT NULL,
        product_name TEXT NOT NULL,
        rebate_1_yearly DECIMAL(5,2),
        rebate_2_yearly DECIMAL(5,2),
        rebate_3_yearly DECIMAL(5,2),
        rebate_4_yearly DECIMAL(5,2),
        rebate_5_yearly DECIMAL(5,2),
        rebate_6_yearly DECIMAL(5,2),
        rebate_7_yearly DECIMAL(5,2),
        rebate_8_yearly DECIMAL(5,2),
        UNIQUE(provider_customer_code, product_name)
      );

      -- Billing materials table
      CREATE TABLE IF NOT EXISTS billing_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_code TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        category TEXT
      );

      -- SAP Business Partner codes table
      CREATE TABLE IF NOT EXISTS sap_bp_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bp_code TEXT NOT NULL UNIQUE,
        business_partner TEXT NOT NULL,
        description TEXT
      );

      -- Indexes for the new tables
      CREATE INDEX IF NOT EXISTS idx_airlines_mcc_lookup 
        ON airlines_mcc(mcc_code);
      
      CREATE INDEX IF NOT EXISTS idx_region_country_lookup 
        ON region_country(provider_customer_code, region, country);
      
      CREATE INDEX IF NOT EXISTS idx_voyage_prive_lookup 
        ON voyage_prive_rebates(provider_customer_code, product_name);
    `);

    this.db.prepare("INSERT INTO migrations (version) VALUES (3)").run();
  }

  private async migration004_update_region_country(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const applied = this.db.prepare(
      "SELECT * FROM migrations WHERE version = 4"
    ).get();

    if (applied) return;

    // Drop existing region_country table and recreate with new structure
    this.db.exec(`
      DROP TABLE IF EXISTS region_country;
      
      CREATE TABLE region_country (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_customer_code TEXT NOT NULL,
        product_name TEXT NOT NULL,
        region_mc TEXT,
        transaction_merchant_country TEXT,
        rebate_1_yearly DECIMAL(5,2),
        rebate_2_yearly DECIMAL(5,2),
        rebate_3_yearly DECIMAL(5,2),
        rebate_4_yearly DECIMAL(5,2),
        rebate_5_yearly DECIMAL(5,2),
        rebate_6_yearly DECIMAL(5,2),
        rebate_7_yearly DECIMAL(5,2),
        rebate_8_yearly DECIMAL(5,2),
        UNIQUE(provider_customer_code, product_name, region_mc, transaction_merchant_country)
      );
      
      CREATE INDEX IF NOT EXISTS idx_region_country_lookup 
        ON region_country(provider_customer_code, product_name, region_mc, transaction_merchant_country);
    `);

    this.db.prepare("INSERT INTO migrations (version) VALUES (4)").run();
  }

  // Configuration methods
  async getConfiguration(): Promise<Configuration | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare("SELECT * FROM configurations ORDER BY created_at DESC LIMIT 1");
    return stmt.get() as Configuration | null;
  }

  async saveConfiguration(config: Omit<Configuration, 'id' | 'created_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT INTO configurations (folder_path, year, month) 
      VALUES (?, ?, ?)
    `);
    
    stmt.run(config.folder_path, config.year, config.month);
  }

  // Transaction data methods
  async clearTransactionData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM transaction_data").run();
  }

  async insertTransactionData(data: Omit<TransactionData, 'id' | 'processed_at'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT INTO transaction_data (
        transaction_card_number, transaction_currency, provider_customer_code,
        transaction_type, transaction_card, salesforce_product_name,
        funding_account_name, region, region_mc, transaction_date,
        bin_card_number, transaction_amount, interchange_amount,
        interchange_percentage, transaction_id, transaction_amount_eur,
        fx_rate, pk_reference, transaction_merchant_country,
        transaction_merchant_category_code, merchant_name, transaction_merchant_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((transactions: any[]) => {
      for (const transaction of transactions) {
        stmt.run(
          transaction.transaction_card_number,
          transaction.transaction_currency,
          transaction.provider_customer_code,
          transaction.transaction_type,
          transaction.transaction_card,
          transaction.salesforce_product_name,
          transaction.funding_account_name,
          transaction.region,
          transaction.region_mc,
          transaction.transaction_date,
          transaction.bin_card_number,
          transaction.transaction_amount,
          transaction.interchange_amount,
          transaction.interchange_percentage,
          transaction.transaction_id,
          transaction.transaction_amount_eur,
          transaction.fx_rate,
          transaction.pk_reference,
          transaction.transaction_merchant_country,
          transaction.transaction_merchant_category_code,
          transaction.merchant_name,
          transaction.transaction_merchant_name
        );
      }
    });

    insertMany(data);
  }

  // Rebate lookup methods
  async clearVisaMCORebates(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM visa_mco_rebates").run();
  }

  async insertVisaMCORebates(rebates: Omit<VisaMCORebate, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO visa_mco_rebates (
        provider_customer_code, product_name,
        rebate_1_monthly, rebate_2_monthly, rebate_3_monthly, rebate_4_monthly,
        rebate_5_monthly, rebate_6_monthly, rebate_7_monthly, rebate_8_monthly,
        rebate_1_yearly, rebate_2_yearly, rebate_3_yearly, rebate_4_yearly,
        rebate_5_yearly, rebate_6_yearly, rebate_7_yearly, rebate_8_yearly
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((rebateData: any[]) => {
      for (const rebate of rebateData) {
        stmt.run(
          rebate.provider_customer_code,
          rebate.product_name,
          rebate.rebate_1_monthly,
          rebate.rebate_2_monthly,
          rebate.rebate_3_monthly,
          rebate.rebate_4_monthly,
          rebate.rebate_5_monthly,
          rebate.rebate_6_monthly,
          rebate.rebate_7_monthly,
          rebate.rebate_8_monthly,
          rebate.rebate_1_yearly,
          rebate.rebate_2_yearly,
          rebate.rebate_3_yearly,
          rebate.rebate_4_yearly,
          rebate.rebate_5_yearly,
          rebate.rebate_6_yearly,
          rebate.rebate_7_yearly,
          rebate.rebate_8_yearly
        );
      }
    });

    insertMany(rebates);
  }

  async clearPartnerPayRebates(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM partnerpay_rebates").run();
  }

  async insertPartnerPayRebates(rebates: Omit<PartnerPayRebate, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO partnerpay_rebates (
        provider_customer_code, product_name, partner_pay_airline, partnerpay_bin,
        rebate_1_monthly, rebate_2_monthly, rebate_3_monthly, rebate_4_monthly,
        rebate_5_monthly, rebate_6_monthly, rebate_7_monthly, rebate_8_monthly,
        rebate_1_yearly, rebate_2_yearly, rebate_3_yearly, rebate_4_yearly,
        rebate_5_yearly, rebate_6_yearly, rebate_7_yearly, rebate_8_yearly
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((rebateData: any[]) => {
      for (const rebate of rebateData) {
        stmt.run(
          rebate.provider_customer_code,
          rebate.product_name,
          rebate.partner_pay_airline,
          rebate.partnerpay_bin,
          rebate.rebate_1_monthly,
          rebate.rebate_2_monthly,
          rebate.rebate_3_monthly,
          rebate.rebate_4_monthly,
          rebate.rebate_5_monthly,
          rebate.rebate_6_monthly,
          rebate.rebate_7_monthly,
          rebate.rebate_8_monthly,
          rebate.rebate_1_yearly,
          rebate.rebate_2_yearly,
          rebate.rebate_3_yearly,
          rebate.rebate_4_yearly,
          rebate.rebate_5_yearly,
          rebate.rebate_6_yearly,
          rebate.rebate_7_yearly,
          rebate.rebate_8_yearly
        );
      }
    });

    insertMany(rebates);
  }

  // Calculated rebates methods
  async clearCalculatedRebates(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM calculated_rebates").run();
  }

  async insertCalculatedRebates(rebates: Omit<CalculatedRebate, 'id' | 'calculated_at'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT INTO calculated_rebates (
        transaction_id, provider_customer_code, product_name,
        rebate_level, rebate_percentage, rebate_amount, rebate_amount_eur,
        calculation_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((rebateData: any[]) => {
      for (const rebate of rebateData) {
        stmt.run(
          rebate.transaction_id,
          rebate.provider_customer_code,
          rebate.product_name,
          rebate.rebate_level,
          rebate.rebate_percentage,
          rebate.rebate_amount,
          rebate.rebate_amount_eur,
          rebate.calculation_type
        );
      }
    });

    insertMany(rebates);
  }

  async getCalculatedRebates(): Promise<CalculatedRebate[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare("SELECT * FROM calculated_rebates ORDER BY calculated_at DESC");
    return stmt.all() as CalculatedRebate[];
  }

  // Query methods
  async getTransactionData(): Promise<TransactionData[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare("SELECT * FROM transaction_data ORDER BY transaction_date DESC");
    return stmt.all() as TransactionData[];
  }

  async getVisaMCORebates(): Promise<VisaMCORebate[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare("SELECT * FROM visa_mco_rebates ORDER BY provider_customer_code, product_name");
    return stmt.all() as VisaMCORebate[];
  }

  async getPartnerPayRebates(): Promise<PartnerPayRebate[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare("SELECT * FROM partnerpay_rebates ORDER BY provider_customer_code, product_name");
    return stmt.all() as PartnerPayRebate[];
  }

  // Library data methods
  async insertLibraryData(sheetName: string, dataKey: string, dataValue: string, additionalData?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO library_data (sheet_name, data_key, data_value, additional_data)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(sheetName, dataKey, dataValue, additionalData);
  }

  async getLibraryData(sheetName: string, dataKey?: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    let stmt;
    if (dataKey) {
      stmt = this.db.prepare("SELECT * FROM library_data WHERE sheet_name = ? AND data_key = ?");
      return stmt.all(sheetName, dataKey) as any[];
    } else {
      stmt = this.db.prepare("SELECT * FROM library_data WHERE sheet_name = ?");
      return stmt.all(sheetName) as any[];
    }
  }

  // Airlines MCC methods
  async clearAirlinesMCC(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM airlines_mcc").run();
  }

  async insertAirlinesMCC(airlines: Omit<AirlinesMCC, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO airlines_mcc (mcc_code, airline_name, airline_code, description)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((airlineData: any[]) => {
      for (const airline of airlineData) {
        stmt.run(
          airline.mcc_code,
          airline.airline_name,
          airline.airline_code,
          airline.description
        );
      }
    });

    insertMany(airlines);
  }

  async getAirlinesMCC(): Promise<AirlinesMCC[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare("SELECT * FROM airlines_mcc ORDER BY mcc_code, airline_code");
    return stmt.all() as AirlinesMCC[];
  }

  async updateAirlinesMCC(id: number, airline: Partial<AirlinesMCC>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(airline).filter(key => key !== 'id').map(key => `${key} = ?`).join(', ');
    const values = Object.values(airline).filter((_, index) => Object.keys(airline)[index] !== 'id');
    
    const stmt = this.db.prepare(`UPDATE airlines_mcc SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  async deleteAirlinesMCC(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM airlines_mcc WHERE id = ?").run(id);
  }

  // Region Country methods
  async clearRegionCountry(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM region_country").run();
  }

  async insertRegionCountry(regions: Omit<RegionCountry, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO region_country (
        provider_customer_code, product_name, region_mc, transaction_merchant_country,
        rebate_1_yearly, rebate_2_yearly, rebate_3_yearly, rebate_4_yearly,
        rebate_5_yearly, rebate_6_yearly, rebate_7_yearly, rebate_8_yearly
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((regionData: any[]) => {
      for (const region of regionData) {
        stmt.run(
          region.provider_customer_code,
          region.product_name,
          region.region_mc,
          region.transaction_merchant_country,
          region.rebate_1_yearly,
          region.rebate_2_yearly,
          region.rebate_3_yearly,
          region.rebate_4_yearly,
          region.rebate_5_yearly,
          region.rebate_6_yearly,
          region.rebate_7_yearly,
          region.rebate_8_yearly
        );
      }
    });

    insertMany(regions);
  }

  async getRegionCountry(): Promise<RegionCountry[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare("SELECT * FROM region_country ORDER BY provider_customer_code, region, country");
    return stmt.all() as RegionCountry[];
  }

  async updateRegionCountry(id: number, region: Partial<RegionCountry>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(region).filter(key => key !== 'id').map(key => `${key} = ?`).join(', ');
    const values = Object.values(region).filter((_, index) => Object.keys(region)[index] !== 'id');
    
    const stmt = this.db.prepare(`UPDATE region_country SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  async deleteRegionCountry(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM region_country WHERE id = ?").run(id);
  }

  // Voyage Prive rebates methods
  async clearVoyagePriveRebates(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM voyage_prive_rebates").run();
  }

  async insertVoyagePriveRebates(rebates: Omit<VoyagePriveRebate, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO voyage_prive_rebates (
        provider_customer_code, product_name,
        rebate_1_yearly, rebate_2_yearly, rebate_3_yearly, rebate_4_yearly,
        rebate_5_yearly, rebate_6_yearly, rebate_7_yearly, rebate_8_yearly
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((rebateData: any[]) => {
      for (const rebate of rebateData) {
        stmt.run(
          rebate.provider_customer_code,
          rebate.product_name,
          rebate.rebate_1_yearly,
          rebate.rebate_2_yearly,
          rebate.rebate_3_yearly,
          rebate.rebate_4_yearly,
          rebate.rebate_5_yearly,
          rebate.rebate_6_yearly,
          rebate.rebate_7_yearly,
          rebate.rebate_8_yearly
        );
      }
    });

    insertMany(rebates);
  }

  async getVoyagePriveRebates(): Promise<VoyagePriveRebate[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare("SELECT * FROM voyage_prive_rebates ORDER BY provider_customer_code, product_name");
    return stmt.all() as VoyagePriveRebate[];
  }

  async updateVoyagePriveRebates(id: number, rebate: Partial<VoyagePriveRebate>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(rebate).filter(key => key !== 'id').map(key => `${key} = ?`).join(', ');
    const values = Object.values(rebate).filter((_, index) => Object.keys(rebate)[index] !== 'id');
    
    const stmt = this.db.prepare(`UPDATE voyage_prive_rebates SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  async deleteVoyagePriveRebates(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM voyage_prive_rebates WHERE id = ?").run(id);
  }

  // Billing materials methods
  async clearBillingMaterials(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM billing_materials").run();
  }

  async insertBillingMaterials(materials: Omit<BillingMaterial, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO billing_materials (material_code, description, category)
      VALUES (?, ?, ?)
    `);

    const insertMany = this.db.transaction((materialData: any[]) => {
      for (const material of materialData) {
        stmt.run(
          material.material_code,
          material.description,
          material.category
        );
      }
    });

    insertMany(materials);
  }

  async getBillingMaterials(): Promise<BillingMaterial[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare("SELECT * FROM billing_materials ORDER BY material_code");
    return stmt.all() as BillingMaterial[];
  }

  async updateBillingMaterial(id: number, material: Partial<BillingMaterial>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(material).filter(key => key !== 'id').map(key => `${key} = ?`).join(', ');
    const values = Object.values(material).filter((_, index) => Object.keys(material)[index] !== 'id');
    
    const stmt = this.db.prepare(`UPDATE billing_materials SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  async deleteBillingMaterial(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM billing_materials WHERE id = ?").run(id);
  }

  // SAP BP codes methods
  async clearSAPBPCodes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM sap_bp_codes").run();
  }

  async insertSAPBPCodes(codes: Omit<SAPBPCode, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sap_bp_codes (bp_code, business_partner, description)
      VALUES (?, ?, ?)
    `);

    const insertMany = this.db.transaction((codeData: any[]) => {
      for (const code of codeData) {
        stmt.run(
          code.bp_code,
          code.business_partner,
          code.description
        );
      }
    });

    insertMany(codes);
  }

  async getSAPBPCodes(): Promise<SAPBPCode[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare("SELECT * FROM sap_bp_codes ORDER BY bp_code");
    return stmt.all() as SAPBPCode[];
  }

  async updateSAPBPCode(id: number, code: Partial<SAPBPCode>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(code).filter(key => key !== 'id').map(key => `${key} = ?`).join(', ');
    const values = Object.values(code).filter((_, index) => Object.keys(code)[index] !== 'id');
    
    const stmt = this.db.prepare(`UPDATE sap_bp_codes SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  async deleteSAPBPCode(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare("DELETE FROM sap_bp_codes WHERE id = ?").run(id);
  }

  // Generic table management methods
  async getTableRowCount(tableName: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  async getTableInfo(tableName: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(`PRAGMA table_info(${tableName})`);
    return stmt.all();
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}