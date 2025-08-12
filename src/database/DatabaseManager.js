"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const electron_1 = require("electron");
class DatabaseManager {
    constructor() {
        this.db = null;
        const userDataPath = electron_1.app.getPath('userData');
        this.dbPath = path.join(userDataPath, 'ixaris_rebates.db');
        // Ensure the directory exists
        fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }
    async initialize() {
        try {
            this.db = new better_sqlite3_1.default(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 1000');
            this.db.pragma('temp_store = MEMORY');
            await this.runMigrations();
            return true;
        }
        catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }
    async runMigrations() {
        if (!this.db)
            throw new Error('Database not initialized');
        // Check if migrations table exists
        const migrationsTableExists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'").get();
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
    }
    async migration001_initial_schema() {
        if (!this.db)
            throw new Error('Database not initialized');
        const applied = this.db.prepare("SELECT * FROM migrations WHERE version = 1").get();
        if (applied)
            return;
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
    async migration002_add_indexes() {
        if (!this.db)
            throw new Error('Database not initialized');
        const applied = this.db.prepare("SELECT * FROM migrations WHERE version = 2").get();
        if (applied)
            return;
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
    // Configuration methods
    async getConfiguration() {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare("SELECT * FROM configurations ORDER BY created_at DESC LIMIT 1");
        return stmt.get();
    }
    async saveConfiguration(config) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      INSERT INTO configurations (folder_path, year, month) 
      VALUES (?, ?, ?)
    `);
        stmt.run(config.folder_path, config.year, config.month);
    }
    // Transaction data methods
    async clearTransactionData() {
        if (!this.db)
            throw new Error('Database not initialized');
        this.db.prepare("DELETE FROM transaction_data").run();
    }
    async insertTransactionData(data) {
        if (!this.db)
            throw new Error('Database not initialized');
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
        const insertMany = this.db.transaction((transactions) => {
            for (const transaction of transactions) {
                stmt.run(transaction.transaction_card_number, transaction.transaction_currency, transaction.provider_customer_code, transaction.transaction_type, transaction.transaction_card, transaction.salesforce_product_name, transaction.funding_account_name, transaction.region, transaction.region_mc, transaction.transaction_date, transaction.bin_card_number, transaction.transaction_amount, transaction.interchange_amount, transaction.interchange_percentage, transaction.transaction_id, transaction.transaction_amount_eur, transaction.fx_rate, transaction.pk_reference, transaction.transaction_merchant_country, transaction.transaction_merchant_category_code, transaction.merchant_name, transaction.transaction_merchant_name);
            }
        });
        insertMany(data);
    }
    // Rebate lookup methods
    async clearVisaMCORebates() {
        if (!this.db)
            throw new Error('Database not initialized');
        this.db.prepare("DELETE FROM visa_mco_rebates").run();
    }
    async insertVisaMCORebates(rebates) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO visa_mco_rebates (
        provider_customer_code, product_name,
        rebate_1_monthly, rebate_2_monthly, rebate_3_monthly, rebate_4_monthly,
        rebate_5_monthly, rebate_6_monthly, rebate_7_monthly, rebate_8_monthly,
        rebate_1_yearly, rebate_2_yearly, rebate_3_yearly, rebate_4_yearly,
        rebate_5_yearly, rebate_6_yearly, rebate_7_yearly, rebate_8_yearly
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertMany = this.db.transaction((rebateData) => {
            for (const rebate of rebateData) {
                stmt.run(rebate.provider_customer_code, rebate.product_name, rebate.rebate_1_monthly, rebate.rebate_2_monthly, rebate.rebate_3_monthly, rebate.rebate_4_monthly, rebate.rebate_5_monthly, rebate.rebate_6_monthly, rebate.rebate_7_monthly, rebate.rebate_8_monthly, rebate.rebate_1_yearly, rebate.rebate_2_yearly, rebate.rebate_3_yearly, rebate.rebate_4_yearly, rebate.rebate_5_yearly, rebate.rebate_6_yearly, rebate.rebate_7_yearly, rebate.rebate_8_yearly);
            }
        });
        insertMany(rebates);
    }
    async clearPartnerPayRebates() {
        if (!this.db)
            throw new Error('Database not initialized');
        this.db.prepare("DELETE FROM partnerpay_rebates").run();
    }
    async insertPartnerPayRebates(rebates) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO partnerpay_rebates (
        provider_customer_code, product_name, partner_pay_airline, partnerpay_bin,
        rebate_1_monthly, rebate_2_monthly, rebate_3_monthly, rebate_4_monthly,
        rebate_5_monthly, rebate_6_monthly, rebate_7_monthly, rebate_8_monthly,
        rebate_1_yearly, rebate_2_yearly, rebate_3_yearly, rebate_4_yearly,
        rebate_5_yearly, rebate_6_yearly, rebate_7_yearly, rebate_8_yearly
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertMany = this.db.transaction((rebateData) => {
            for (const rebate of rebateData) {
                stmt.run(rebate.provider_customer_code, rebate.product_name, rebate.partner_pay_airline, rebate.partnerpay_bin, rebate.rebate_1_monthly, rebate.rebate_2_monthly, rebate.rebate_3_monthly, rebate.rebate_4_monthly, rebate.rebate_5_monthly, rebate.rebate_6_monthly, rebate.rebate_7_monthly, rebate.rebate_8_monthly, rebate.rebate_1_yearly, rebate.rebate_2_yearly, rebate.rebate_3_yearly, rebate.rebate_4_yearly, rebate.rebate_5_yearly, rebate.rebate_6_yearly, rebate.rebate_7_yearly, rebate.rebate_8_yearly);
            }
        });
        insertMany(rebates);
    }
    // Calculated rebates methods
    async clearCalculatedRebates() {
        if (!this.db)
            throw new Error('Database not initialized');
        this.db.prepare("DELETE FROM calculated_rebates").run();
    }
    async insertCalculatedRebates(rebates) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      INSERT INTO calculated_rebates (
        transaction_id, provider_customer_code, product_name,
        rebate_level, rebate_percentage, rebate_amount, rebate_amount_eur,
        calculation_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertMany = this.db.transaction((rebateData) => {
            for (const rebate of rebateData) {
                stmt.run(rebate.transaction_id, rebate.provider_customer_code, rebate.product_name, rebate.rebate_level, rebate.rebate_percentage, rebate.rebate_amount, rebate.rebate_amount_eur, rebate.calculation_type);
            }
        });
        insertMany(rebates);
    }
    async getCalculatedRebates() {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare("SELECT * FROM calculated_rebates ORDER BY calculated_at DESC");
        return stmt.all();
    }
    // Query methods
    async getTransactionData() {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare("SELECT * FROM transaction_data ORDER BY transaction_date DESC");
        return stmt.all();
    }
    async getVisaMCORebates() {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare("SELECT * FROM visa_mco_rebates ORDER BY provider_customer_code, product_name");
        return stmt.all();
    }
    async getPartnerPayRebates() {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare("SELECT * FROM partnerpay_rebates ORDER BY provider_customer_code, product_name");
        return stmt.all();
    }
    // Library data methods
    async insertLibraryData(sheetName, dataKey, dataValue, additionalData) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO library_data (sheet_name, data_key, data_value, additional_data)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(sheetName, dataKey, dataValue, additionalData);
    }
    async getLibraryData(sheetName, dataKey) {
        if (!this.db)
            throw new Error('Database not initialized');
        let stmt;
        if (dataKey) {
            stmt = this.db.prepare("SELECT * FROM library_data WHERE sheet_name = ? AND data_key = ?");
            return stmt.all(sheetName, dataKey);
        }
        else {
            stmt = this.db.prepare("SELECT * FROM library_data WHERE sheet_name = ?");
            return stmt.all(sheetName);
        }
    }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
exports.DatabaseManager = DatabaseManager;
