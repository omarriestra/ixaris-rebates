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
export declare class DatabaseManager {
    private db;
    private dbPath;
    constructor();
    initialize(): Promise<boolean>;
    private runMigrations;
    private migration001_initial_schema;
    private migration002_add_indexes;
    getConfiguration(): Promise<Configuration | null>;
    saveConfiguration(config: Omit<Configuration, 'id' | 'created_at'>): Promise<void>;
    clearTransactionData(): Promise<void>;
    insertTransactionData(data: Omit<TransactionData, 'id' | 'processed_at'>[]): Promise<void>;
    clearVisaMCORebates(): Promise<void>;
    insertVisaMCORebates(rebates: Omit<VisaMCORebate, 'id'>[]): Promise<void>;
    clearPartnerPayRebates(): Promise<void>;
    insertPartnerPayRebates(rebates: Omit<PartnerPayRebate, 'id'>[]): Promise<void>;
    clearCalculatedRebates(): Promise<void>;
    insertCalculatedRebates(rebates: Omit<CalculatedRebate, 'id' | 'calculated_at'>[]): Promise<void>;
    getCalculatedRebates(): Promise<CalculatedRebate[]>;
    getTransactionData(): Promise<TransactionData[]>;
    getVisaMCORebates(): Promise<VisaMCORebate[]>;
    getPartnerPayRebates(): Promise<PartnerPayRebate[]>;
    insertLibraryData(sheetName: string, dataKey: string, dataValue: string, additionalData?: string): Promise<void>;
    getLibraryData(sheetName: string, dataKey?: string): Promise<any[]>;
    close(): void;
}
