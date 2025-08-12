import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { DatabaseManager, VisaMCORebate, PartnerPayRebate, TransactionData, AirlinesMCC, RegionCountry, VoyagePriveRebate, BillingMaterial, SAPBPCode } from '../../database/DatabaseManager';

export interface CSVImportResult {
  success: boolean;
  rowsImported: number;
  errors: string[];
  warnings: string[];
}

export interface CSVValidationResult {
  isValid: boolean;
  expectedColumns: string[];
  actualColumns: string[];
  missingColumns: string[];
  extraColumns: string[];
}

export class CsvImporter {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  // Table schema definitions
  private static readonly TABLE_SCHEMAS: { [key: string]: string[] } = {
    'visa_mco_monthly': [
      'Account Name: Account Name', 'Opportunity Name', 'Full Opportunity Stage', 
      'Payment Partner: Account Name', 'Provider Customer Code', 'Product Name',
      'Rebate 1 Monthly', 'Rebate 2 Monthly', 'Rebate 3 Monthly', 'Rebate 4 Monthly',
      'Rebate 5 Monthly', 'Rebate 6 Monthly', 'Rebate 7 Monthly', 'Rebate 8 Monthly',
      'Account Name: Master Account'
    ],
    'visa_mco_yearly': [
      'Account Name: Account Name', 'Opportunity Name', 'Full Opportunity Stage', 
      'Payment Partner: Account Name', 'Provider Customer Code', 'Product Name',
      'Rebate 1 Yearly', 'Rebate 2 Yearly', 'Rebate 3 Yearly', 'Rebate 4 Yearly',
      'Rebate 5 Yearly', 'Rebate 6 Yearly', 'Rebate 7 Yearly', 'Rebate 8 Yearly',
      'Account Name: Master Account'
    ],
    'partnerpay_monthly': [
      'Product Name', 'Partner Pay Airline: Account Name', 'PartnerPay/PartnerDirect BIN',
      'Rebate 1 Monthly', 'Rebate 2 Monthly', 'Rebate 3 Monthly', 'Rebate 4 Monthly',
      'Rebate 5 Monthly', 'Rebate 6 Monthly', 'Rebate 7 Monthly', 'Rebate 8 Monthly',
      'Account Name: Master Account'
    ],
    'partnerpay_yearly': [
      'Partner Pay Airline: Account Name', 'PartnerPay/PartnerDirect BIN',
      'Rebate 1 Yearly', 'Rebate 2 Yearly', 'Rebate 3 Yearly', 'Rebate 4 Yearly',
      'Rebate 5 Yearly', 'Rebate 6 Yearly', 'Rebate 7 Yearly', 'Rebate 8 Yearly',
      'Account Name: Master Account'
    ],
    'transactions': [
      'Transaction Card Number', 'Transaction Currency', 'Provider_Customer_Code__c',
      'Transaction Type', 'Transaction Card', 'Salesforce product name',
      'Funding Account Name', 'Region', 'Region MC', 'Transaction Date',
      'BIN Card Number', '-Sum([Transaction Amount])', 'Sum([Interchange Amount])',
      'INTERCHANGE %', 'Transaction Id', 'Transaction Amount in EUR', 'fx', 'PK',
      'Transaction Merchant Country', 'Transaction Merchant Category Code',
      'Merchant Name', 'Transaction Merchant Name'
    ],
    'airlines_mcc': [
      'Partner Pay Airline: Account Name', 'Transaction Merchant Category Code'
    ],
    'region_country': [
      'Provider_Customer_Code', 'Product_Name', 'Region_MC', 'Transaction Merchant Country',
      'Rebate 1 Yearly', 'Rebate 2 Yearly', 'Rebate 3 Yearly', 'Rebate 4 Yearly',
      'Rebate 5 Yearly', 'Rebate 6 Yearly', 'Rebate 7 Yearly', 'Rebate 8 Yearly'
    ],
    'voyage_prive': [
      'Provider_Customer_Code', 'Product_Name', 'Rebate 1 Yearly', 'Rebate 2 Yearly',
      'Rebate 3 Yearly', 'Rebate 4 Yearly', 'Rebate 5 Yearly', 'Rebate 6 Yearly',
      'Rebate 7 Yearly', 'Rebate 8 Yearly'
    ],
    'billing_materials': [
      'Product Name', 'Billing Material ID'
    ],
    'sap_bp_codes': [
      'Mapping ID', 'Payments Code', 'Vendor R3', 'Vendor S4H', 'Currency', 'Vendor 1089', 'Comments'
    ]
  };

  async validateCSVStructure(filePath: string, tableType: string): Promise<CSVValidationResult> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      if (records.length === 0) {
        return {
          isValid: false,
          expectedColumns: CsvImporter.TABLE_SCHEMAS[tableType] || [],
          actualColumns: [],
          missingColumns: CsvImporter.TABLE_SCHEMAS[tableType] || [],
          extraColumns: []
        };
      }

      const actualColumns = Object.keys(records[0]);
      const expectedColumns = CsvImporter.TABLE_SCHEMAS[tableType] || [];
      
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
      const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));

      return {
        isValid: missingColumns.length === 0,
        expectedColumns,
        actualColumns,
        missingColumns,
        extraColumns
      };
    } catch (error) {
      return {
        isValid: false,
        expectedColumns: CsvImporter.TABLE_SCHEMAS[tableType] || [],
        actualColumns: [],
        missingColumns: CsvImporter.TABLE_SCHEMAS[tableType] || [],
        extraColumns: []
      };
    }
  }

  async importTransactions(filePath: string): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: false,
      rowsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      const transactions: Omit<TransactionData, 'id' | 'processed_at'>[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          const transaction: Omit<TransactionData, 'id' | 'processed_at'> = {
            transaction_card_number: record['Transaction Card Number'] || '',
            transaction_currency: record['Transaction Currency'] || '',
            provider_customer_code: record['Provider_Customer_Code__c'] || '',
            transaction_type: record['Transaction Type'] || '',
            transaction_card: record['Transaction Card'] || '',
            salesforce_product_name: record['Salesforce product name'] || '',
            funding_account_name: record['Funding Account Name'] || '',
            region: record['Region'] || '',
            region_mc: record['Region MC'] || '',
            transaction_date: record['Transaction Date'] || '',
            bin_card_number: parseInt(record['BIN Card Number']) || 0,
            transaction_amount: parseFloat(record['-Sum([Transaction Amount])']?.replace(/,/g, '')) || 0,
            interchange_amount: parseFloat(record['Sum([Interchange Amount])']?.replace(/,/g, '')) || 0,
            interchange_percentage: parseFloat(record['INTERCHANGE %']?.replace('%', '')) || 0,
            transaction_id: record['Transaction Id'] || '',
            transaction_amount_eur: parseFloat(record['Transaction Amount in EUR']?.replace(/,/g, '')) || 0,
            fx_rate: parseFloat(record['fx']) || 1,
            pk_reference: record['PK'] || '',
            transaction_merchant_country: record['Transaction Merchant Country'] || '',
            transaction_merchant_category_code: parseInt(record['Transaction Merchant Category Code']) || 0,
            merchant_name: record['Merchant Name'] || '',
            transaction_merchant_name: record['Transaction Merchant Name'] || ''
          };

          transactions.push(transaction);
        } catch (error) {
          result.warnings.push(`Row ${i + 1}: ${(error as Error).message}`);
        }
      }

      await this.dbManager.clearTransactionData();
      await this.dbManager.insertTransactionData(transactions);

      result.success = true;
      result.rowsImported = transactions.length;
      
    } catch (error) {
      result.errors.push(`Import failed: ${(error as Error).message}`);
    }

    return result;
  }

  async importVisaMCORebates(filePath: string, isYearly: boolean = true): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: false,
      rowsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      const rebates: Omit<VisaMCORebate, 'id'>[] = [];
      const suffix = isYearly ? 'Yearly' : 'Monthly';

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Skip only completely empty rows
          if (this.isRowCompletelyEmpty(record)) {
            console.log(`[CsvImporter] Visa MCO Row ${i + 1}: SKIPPED - completely empty row`);
            continue;
          }
          
          // Log warnings for missing key fields but still import
          if (!record['Provider Customer Code']) {
            console.log(`[CsvImporter] Visa MCO Row ${i + 1}: WARNING - no Provider Customer Code, but importing anyway`);
          }

          const rebate: Omit<VisaMCORebate, 'id'> = {
            provider_customer_code: record['Provider Customer Code'],
            product_name: record['Product Name'] || '',
            import_source: isYearly ? 'yearly' : 'monthly',
            rebate_1_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 1 ${suffix}`]),
            rebate_2_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 2 ${suffix}`]),
            rebate_3_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 3 ${suffix}`]),
            rebate_4_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 4 ${suffix}`]),
            rebate_5_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 5 ${suffix}`]),
            rebate_6_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 6 ${suffix}`]),
            rebate_7_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 7 ${suffix}`]),
            rebate_8_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 8 ${suffix}`]),
            rebate_1_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 1 ${suffix}`]),
            rebate_2_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 2 ${suffix}`]),
            rebate_3_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 3 ${suffix}`]),
            rebate_4_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 4 ${suffix}`]),
            rebate_5_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 5 ${suffix}`]),
            rebate_6_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 6 ${suffix}`]),
            rebate_7_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 7 ${suffix}`]),
            rebate_8_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 8 ${suffix}`])
          };

          rebates.push(rebate);
        } catch (error) {
          result.warnings.push(`Row ${i + 1}: ${(error as Error).message}`);
        }
      }

      // Don't clear the table - insert/update instead to preserve both monthly and yearly data
      await this.dbManager.insertVisaMCORebates(rebates);

      result.success = true;
      result.rowsImported = rebates.length;
      
    } catch (error) {
      result.errors.push(`Import failed: ${(error as Error).message}`);
    }

    return result;
  }

  async importPartnerPayRebates(filePath: string, isYearly: boolean = true): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: false,
      rowsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      const rebates: Omit<PartnerPayRebate, 'id'>[] = [];
      const suffix = isYearly ? 'Yearly' : 'Monthly';

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Skip only completely empty rows
          if (this.isRowCompletelyEmpty(record)) {
            console.log(`[CsvImporter] PartnerPay Row ${i + 1}: SKIPPED - completely empty row`);
            continue;
          }
          
          // Log warnings for missing fields but still import
          const airline = record['Partner Pay Airline: Account Name'] || '';
          const bin = record['PartnerPay/PartnerDirect BIN'] || '';
          
          if (!airline && !bin) {
            console.log(`[CsvImporter] PartnerPay Row ${i + 1}: WARNING - no airline and no BIN, but importing anyway`);
          }

          // For yearly files, determine product_name based on BIN and context
          let finalProductName = record['Product Name'] || '';
          if (!finalProductName) {
            // Yearly files don't have Product Name, need to derive it
            const bin = record['PartnerPay/PartnerDirect BIN'];
            const airline = record['Partner Pay Airline: Account Name'];
            
            if (bin && bin.includes('Tier 1')) {
              finalProductName = 'B2B Wallet - Nium - Partner Pay 150';
            } else if (bin && bin.includes('Tier 2')) {
              finalProductName = 'B2B Wallet - Nium - Partner Pay 125';
            } else if (bin && bin.includes('Tier 3')) {
              finalProductName = 'B2B Wallet - Nium - Partner Pay 100';
            } else {
              finalProductName = 'B2B Wallet - Nium - PartnerDirect';
            }
          }

          const rebate: Omit<PartnerPayRebate, 'id'> = {
            provider_customer_code: 'partnerpay', // Will be matched during lookup
            product_name: finalProductName,
            partner_pay_airline: airline || '',
            partnerpay_bin: bin || '',
            import_source: isYearly ? 'yearly' : 'monthly',
            rebate_1_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 1 ${suffix}`]),
            rebate_2_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 2 ${suffix}`]),
            rebate_3_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 3 ${suffix}`]),
            rebate_4_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 4 ${suffix}`]),
            rebate_5_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 5 ${suffix}`]),
            rebate_6_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 6 ${suffix}`]),
            rebate_7_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 7 ${suffix}`]),
            rebate_8_monthly: isYearly ? undefined : this.parseRebateValue(record[`Rebate 8 ${suffix}`]),
            rebate_1_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 1 ${suffix}`]),
            rebate_2_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 2 ${suffix}`]),
            rebate_3_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 3 ${suffix}`]),
            rebate_4_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 4 ${suffix}`]),
            rebate_5_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 5 ${suffix}`]),
            rebate_6_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 6 ${suffix}`]),
            rebate_7_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 7 ${suffix}`]),
            rebate_8_yearly: !isYearly ? undefined : this.parseRebateValue(record[`Rebate 8 ${suffix}`])
          };

          rebates.push(rebate);
        } catch (error) {
          result.warnings.push(`Row ${i + 1}: ${(error as Error).message}`);
        }
      }

      // Don't clear the table - insert/update instead to preserve both monthly and yearly data
      await this.dbManager.insertPartnerPayRebates(rebates);

      result.success = true;
      result.rowsImported = rebates.length;
      
    } catch (error) {
      result.errors.push(`Import failed: ${(error as Error).message}`);
    }

    return result;
  }

  async importAirlinesMCC(filePath: string): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: false,
      rowsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      console.log(`[CsvImporter] Airlines MCC: Found ${records.length} records in CSV`);
      if (records.length > 0) {
        console.log('[CsvImporter] Airlines MCC: Available columns:', Object.keys(records[0]));
        // Show first record values for debugging
        console.log('[CsvImporter] Airlines MCC: First record values:', records[0]);
      }

      const airlines: Omit<AirlinesMCC, 'id'>[] = [];

      // Helper function to find column by partial match (case insensitive)
      const findColumn = (record: Record<string, string>, searchTerms: string[]): string => {
        const columnNames = Object.keys(record);
        for (const term of searchTerms) {
          const found = columnNames.find(col => 
            col.toLowerCase().includes(term.toLowerCase())
          );
          if (found) return record[found] || '';
        }
        return '';
      };

      // If no specific columns found, use first two columns as fallback
      const columnNames = records.length > 0 ? Object.keys(records[0]) : [];
      console.log(`[CsvImporter] Airlines MCC: Using fallback strategy if needed. Column names: ${columnNames.join(', ')}`);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Try to find MCC code column
          let mcc_code = findColumn(record, ['category code', 'mcc', 'merchant category', 'code']);
          
          // Try to find airline name column
          let airline_name = findColumn(record, ['airline', 'partner', 'account name', 'name']);

          // Fallback: if columns not found, use first two columns
          if (!mcc_code && !airline_name && columnNames.length >= 2) {
            mcc_code = record[columnNames[0]] || '';
            airline_name = record[columnNames[1]] || '';
            if (i === 0) {
              console.log(`[CsvImporter] Airlines MCC: Using fallback columns: '${columnNames[0]}' for MCC, '${columnNames[1]}' for Airline Name`);
            }
          }

          // Skip only completely empty rows
          if (this.isRowCompletelyEmpty(record)) {
            console.log(`[CsvImporter] Airlines MCC Row ${i + 1}: SKIPPED - completely empty row`);
            continue;
          }

          console.log(`[CsvImporter] Airlines MCC Row ${i + 1}: mcc_code="${mcc_code}", airline_name="${airline_name}"`);

          const airline: Omit<AirlinesMCC, 'id'> = {
            mcc_code: mcc_code,
            airline_name: airline_name,
            airline_code: '', // Not available in the CSV
            description: undefined // Not available in the CSV
          };

          airlines.push(airline); // Always push, even with missing fields
          console.log(`[CsvImporter] Airlines MCC Row ${i + 1}: ACCEPTED (was: ${airline.mcc_code || 'no MCC'}, ${airline.airline_name || 'no airline'})`);
          
          if (!airline.mcc_code || !airline.airline_name) {
            console.log(`[CsvImporter] Airlines MCC Row ${i + 1}: WARNING - missing data but imported anyway`);
          }
        } catch (error) {
          console.log(`[CsvImporter] Airlines MCC Row ${i + 1}: ERROR - ${(error as Error).message}`);
          result.warnings.push(`Row ${i + 1}: ${(error as Error).message}`);
        }
      }

      console.log(`[CsvImporter] Attempting to import ${airlines.length} airlines records`);
      await this.dbManager.clearAirlinesMCC();
      await this.dbManager.insertAirlinesMCC(airlines);
      console.log(`[CsvImporter] Successfully imported ${airlines.length} airlines records`);

      result.success = true;
      result.rowsImported = airlines.length;
      
    } catch (error) {
      result.errors.push(`Import failed: ${(error as Error).message}`);
    }

    return result;
  }

  async importRegionCountry(filePath: string): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: false,
      rowsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      console.log(`[CsvImporter] Region Country: Found ${records.length} records in CSV`);
      if (records.length > 0) {
        console.log('[CsvImporter] Region Country: Available columns:', Object.keys(records[0]));
      }

      const regions: Omit<RegionCountry, 'id'>[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Try multiple possible column names
          const provider_code = record['Provider_Customer_Code'] || 
                               record['Provider Customer Code'] || 
                               record['ProviderCustomerCode'] || '';
          
          const product_name = record['Product_Name'] || 
                              record['Product Name'] || 
                              record['ProductName'] || '';
          
          const region_mc = record['Region_MC'] || 
                           record['Region MC'] || 
                           record['RegionMC'] || '';
          
          const merchant_country = record['Transaction Merchant Country'] || 
                                  record['TransactionMerchantCountry'] || 
                                  record['Merchant Country'] || '';

          // Skip only completely empty rows
          if (this.isRowCompletelyEmpty(record)) {
            console.log(`[CsvImporter] Region Country Row ${i + 1}: SKIPPED - completely empty row`);
            continue;
          }

          console.log(`[CsvImporter] Region Country Row ${i + 1}: provider="${provider_code}", product="${product_name}", region="${region_mc}", country="${merchant_country}"`);

          const region: Omit<RegionCountry, 'id'> = {
            provider_customer_code: provider_code,
            product_name: product_name,
            region_mc: region_mc,
            transaction_merchant_country: merchant_country,
            rebate_1_yearly: this.parseRebateValue(record['Rebate 1 Yearly']),
            rebate_2_yearly: this.parseRebateValue(record['Rebate 2 Yearly']),
            rebate_3_yearly: this.parseRebateValue(record['Rebate 3 Yearly']),
            rebate_4_yearly: this.parseRebateValue(record['Rebate 4 Yearly']),
            rebate_5_yearly: this.parseRebateValue(record['Rebate 5 Yearly']),
            rebate_6_yearly: this.parseRebateValue(record['Rebate 6 Yearly']),
            rebate_7_yearly: this.parseRebateValue(record['Rebate 7 Yearly']),
            rebate_8_yearly: this.parseRebateValue(record['Rebate 8 Yearly'])
          };

          regions.push(region); // Always push, even with missing fields
          console.log(`[CsvImporter] Region Country Row ${i + 1}: ACCEPTED (all rows imported now)`);
          
          if (!provider_code && !product_name && !region_mc && !merchant_country) {
            console.log(`[CsvImporter] Region Country Row ${i + 1}: WARNING - no key identifiers but imported anyway`);
          }
        } catch (error) {
          console.log(`[CsvImporter] Region Country Row ${i + 1}: ERROR - ${(error as Error).message}`);
          result.warnings.push(`Row ${i + 1}: ${(error as Error).message}`);
        }
      }

      console.log(`[CsvImporter] Attempting to import ${regions.length} region records`);
      await this.dbManager.clearRegionCountry();
      await this.dbManager.insertRegionCountry(regions);
      console.log(`[CsvImporter] Successfully imported ${regions.length} region records`);

      result.success = true;
      result.rowsImported = regions.length;
      
    } catch (error) {
      result.errors.push(`Import failed: ${(error as Error).message}`);
    }

    return result;
  }

  async importVoyagePriveRebates(filePath: string): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: false,
      rowsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      console.log(`[CsvImporter] Voyage Prive: Found ${records.length} records in CSV`);
      if (records.length > 0) {
        console.log('[CsvImporter] Voyage Prive: Available columns:', Object.keys(records[0]));
        // Show first record values for debugging
        console.log('[CsvImporter] Voyage Prive: First record values:', records[0]);
      }

      const rebates: Omit<VoyagePriveRebate, 'id'>[] = [];

      // Helper function to find column by partial match (case insensitive)
      const findColumn = (record: Record<string, string>, searchTerms: string[]): string => {
        const columnNames = Object.keys(record);
        for (const term of searchTerms) {
          const found = columnNames.find(col => 
            col.toLowerCase().includes(term.toLowerCase())
          );
          if (found) return record[found] || '';
        }
        return '';
      };

      // If no specific columns found, use first two columns as fallback
      const columnNames = records.length > 0 ? Object.keys(records[0]) : [];
      console.log(`[CsvImporter] Voyage Prive: Column names: ${columnNames.join(', ')}`);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Try to find provider code column
          let provider_code = findColumn(record, ['provider', 'customer', 'code']);
          
          // Try to find product name column
          let product_name = findColumn(record, ['product', 'name']);

          // Fallback: if columns not found, use first two columns
          if (!provider_code && !product_name && columnNames.length >= 2) {
            provider_code = record[columnNames[0]] || '';
            product_name = record[columnNames[1]] || '';
            if (i === 0) {
              console.log(`[CsvImporter] Voyage Prive: Using fallback columns: '${columnNames[0]}' for Provider, '${columnNames[1]}' for Product`);
            }
          }

          // Skip only completely empty rows
          if (this.isRowCompletelyEmpty(record)) {
            console.log(`[CsvImporter] Voyage Prive Row ${i + 1}: SKIPPED - completely empty row`);
            continue;
          }

          console.log(`[CsvImporter] Voyage Prive Row ${i + 1}: provider="${provider_code}", product="${product_name}"`);

          const rebate: Omit<VoyagePriveRebate, 'id'> = {
            provider_customer_code: provider_code,
            product_name: product_name,
            rebate_1_yearly: this.parseRebateValue(findColumn(record, ['rebate 1', 'rebate_1'])),
            rebate_2_yearly: this.parseRebateValue(findColumn(record, ['rebate 2', 'rebate_2'])),
            rebate_3_yearly: this.parseRebateValue(findColumn(record, ['rebate 3', 'rebate_3'])),
            rebate_4_yearly: this.parseRebateValue(findColumn(record, ['rebate 4', 'rebate_4'])),
            rebate_5_yearly: this.parseRebateValue(findColumn(record, ['rebate 5', 'rebate_5'])),
            rebate_6_yearly: this.parseRebateValue(findColumn(record, ['rebate 6', 'rebate_6'])),
            rebate_7_yearly: this.parseRebateValue(findColumn(record, ['rebate 7', 'rebate_7'])),
            rebate_8_yearly: this.parseRebateValue(findColumn(record, ['rebate 8', 'rebate_8']))
          };

          rebates.push(rebate); // Always push, even with missing fields
          console.log(`[CsvImporter] Voyage Prive Row ${i + 1}: ACCEPTED (all rows imported now)`);
          
          if (!provider_code && !product_name) {
            console.log(`[CsvImporter] Voyage Prive Row ${i + 1}: WARNING - no provider or product but imported anyway`);
          }
        } catch (error) {
          console.log(`[CsvImporter] Voyage Prive Row ${i + 1}: ERROR - ${(error as Error).message}`);
          result.warnings.push(`Row ${i + 1}: ${(error as Error).message}`);
        }
      }

      console.log(`[CsvImporter] Attempting to import ${rebates.length} voyage prive records`);
      await this.dbManager.clearVoyagePriveRebates();
      await this.dbManager.insertVoyagePriveRebates(rebates);
      console.log(`[CsvImporter] Successfully imported ${rebates.length} voyage prive records`);

      result.success = true;
      result.rowsImported = rebates.length;
      
    } catch (error) {
      result.errors.push(`Import failed: ${(error as Error).message}`);
    }

    return result;
  }

  async importBillingMaterials(filePath: string): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: false,
      rowsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      console.log(`[CsvImporter] Billing Materials: Found ${records.length} records in CSV`);
      if (records.length > 0) {
        console.log('[CsvImporter] Billing Materials: Available columns:', Object.keys(records[0]));
      }

      const materials: Omit<BillingMaterial, 'id'>[] = [];

      // Helper function to find column by partial match (case insensitive)
      const findColumn = (record: Record<string, string>, searchTerms: string[]): string => {
        const columnNames = Object.keys(record);
        for (const term of searchTerms) {
          const found = columnNames.find(col => 
            col.toLowerCase().includes(term.toLowerCase())
          );
          if (found) return record[found] || '';
        }
        return '';
      };

      // If no specific columns found, use first two columns as fallback
      const columnNames = records.length > 0 ? Object.keys(records[0]) : [];
      console.log(`[CsvImporter] Billing Materials: Column names: ${columnNames.join(', ')}`);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Try to find material code column - search more terms
          let material_code = findColumn(record, ['billing material', 'material id', 'material', 'billing', 'id', 'code', 'materialid']);
          
          // Try to find description column - search more terms
          let description = findColumn(record, ['product name', 'product', 'description', 'desc', 'name', 'productname']);

          // Fallback: if columns not found, use first two columns
          if (!material_code && !description && columnNames.length >= 1) {
            material_code = record[columnNames[0]] || '';
            description = columnNames.length >= 2 ? record[columnNames[1]] || '' : 'No description';
            if (i === 0) {
              console.log(`[CsvImporter] Billing Materials: Using fallback columns: '${columnNames[0]}' for Material Code, '${columnNames.length >= 2 ? columnNames[1] : 'none'}' for Description`);
            }
          }

          // Skip only completely empty rows
          if (this.isRowCompletelyEmpty(record)) {
            console.log(`[CsvImporter] Billing Materials Row ${i + 1}: SKIPPED - completely empty row`);
            continue;
          }

          console.log(`[CsvImporter] Billing Materials Row ${i + 1}: material_code="${material_code}", description="${description}"`);

          const material: Omit<BillingMaterial, 'id'> = {
            material_code: material_code,
            description: description || 'No description',
            category: undefined // Not available in the CSV
          };

          materials.push(material); // Always push, even without material code
          console.log(`[CsvImporter] Billing Materials Row ${i + 1}: ACCEPTED (all rows imported now)`);
          
          if (!material_code) {
            console.log(`[CsvImporter] Billing Materials Row ${i + 1}: WARNING - no material code but imported anyway`);
            // Log all column values for debugging
            if (i < 3) { // Only log first 3 rows to avoid spam
              console.log(`[CsvImporter] Billing Materials Row ${i + 1} all values:`, record);
            }
          }
        } catch (error) {
          console.log(`[CsvImporter] Billing Materials Row ${i + 1}: ERROR - ${(error as Error).message}`);
          result.warnings.push(`Row ${i + 1}: ${(error as Error).message}`);
        }
      }

      console.log(`[CsvImporter] Attempting to import ${materials.length} billing materials records`);
      await this.dbManager.clearBillingMaterials();
      await this.dbManager.insertBillingMaterials(materials);
      console.log(`[CsvImporter] Successfully imported ${materials.length} billing materials records`);

      result.success = true;
      result.rowsImported = materials.length;
      
    } catch (error) {
      result.errors.push(`Import failed: ${(error as Error).message}`);
    }

    return result;
  }

  async importSAPBPCodes(filePath: string): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      success: false,
      rowsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      console.log(`[CsvImporter] SAP BP Codes: Found ${records.length} records in CSV`);
      if (records.length > 0) {
        console.log('[CsvImporter] SAP BP Codes: Available columns:', Object.keys(records[0]));
        // Show first record values for debugging
        console.log('[CsvImporter] SAP BP Codes: First record values:', records[0]);
      }

      const codes: Omit<SAPBPCode, 'id'>[] = [];

      // Helper function to find column by partial match (case insensitive)
      const findColumn = (record: Record<string, string>, searchTerms: string[]): string => {
        const columnNames = Object.keys(record);
        for (const term of searchTerms) {
          const found = columnNames.find(col => 
            col.toLowerCase().includes(term.toLowerCase())
          );
          if (found) return record[found] || '';
        }
        return '';
      };

      // If no specific columns found, use first two columns as fallback
      const columnNames = records.length > 0 ? Object.keys(records[0]) : [];
      console.log(`[CsvImporter] SAP BP Codes: Column names: ${columnNames.join(', ')}`);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Try to find bp code column
          let bp_code = findColumn(record, ['mapping', 'id', 'bp', 'code']);
          
          // Try to find business partner column
          let business_partner = findColumn(record, ['payment', 'business', 'partner', 'vendor']);
          
          // Try to find description column
          let description = findColumn(record, ['comment', 'description', 'note']);

          // Fallback: if columns not found, use first two columns
          if (!bp_code && !business_partner && columnNames.length >= 2) {
            bp_code = record[columnNames[0]] || '';
            business_partner = record[columnNames[1]] || '';
            description = columnNames.length >= 3 ? record[columnNames[2]] || '' : '';
            if (i === 0) {
              console.log(`[CsvImporter] SAP BP Codes: Using fallback columns: '${columnNames[0]}' for BP Code, '${columnNames[1]}' for Business Partner`);
            }
          }

          // Skip only completely empty rows
          if (this.isRowCompletelyEmpty(record)) {
            console.log(`[CsvImporter] SAP BP Codes Row ${i + 1}: SKIPPED - completely empty row`);
            continue;
          }

          console.log(`[CsvImporter] SAP BP Codes Row ${i + 1}: bp_code="${bp_code}", business_partner="${business_partner}", description="${description}"`);

          const code: Omit<SAPBPCode, 'id'> = {
            bp_code: bp_code,
            business_partner: business_partner,
            description: description || undefined
          };

          codes.push(code); // Always push, even with missing fields
          console.log(`[CsvImporter] SAP BP Codes Row ${i + 1}: ACCEPTED (all rows imported now)`);
          
          if (!bp_code && !business_partner) {
            console.log(`[CsvImporter] SAP BP Codes Row ${i + 1}: WARNING - no bp_code and no business_partner but imported anyway`);
          }
        } catch (error) {
          console.log(`[CsvImporter] SAP BP Codes Row ${i + 1}: ERROR - ${(error as Error).message}`);
          result.warnings.push(`Row ${i + 1}: ${(error as Error).message}`);
        }
      }

      console.log(`[CsvImporter] Attempting to import ${codes.length} SAP BP codes records`);
      await this.dbManager.clearSAPBPCodes();
      await this.dbManager.insertSAPBPCodes(codes);
      console.log(`[CsvImporter] Successfully imported ${codes.length} SAP BP codes records`);

      result.success = true;
      result.rowsImported = codes.length;
      
    } catch (error) {
      result.errors.push(`Import failed: ${(error as Error).message}`);
    }

    return result;
  }

  // Batch import method for multiple files
  async importAllTables(dataFolderPath: string): Promise<{ [tableName: string]: CSVImportResult }> {
    const results: { [tableName: string]: CSVImportResult } = {};

    try {
      // Import Visa & MCO rebates
      const visaMonthlyPath = path.join(dataFolderPath, 'Visa & MCO Monthly Rebate.csv');
      const visaYearlyPath = path.join(dataFolderPath, 'Visa & MCO Yearly Rebate.csv');
      
      if (fs.existsSync(visaMonthlyPath)) {
        results['visa_mco_monthly'] = await this.importVisaMCORebates(visaMonthlyPath, false);
      }
      if (fs.existsSync(visaYearlyPath)) {
        results['visa_mco_yearly'] = await this.importVisaMCORebates(visaYearlyPath, true);
      }

      // Import PartnerPay rebates
      const partnerMonthlyPath = path.join(dataFolderPath, 'PartnerPay_PartnerDirect Monthly Rebate.csv');
      const partnerYearlyPath = path.join(dataFolderPath, 'PartnerPay_PartnerDirect Yearly Rebate.csv');
      
      if (fs.existsSync(partnerMonthlyPath)) {
        results['partnerpay_monthly'] = await this.importPartnerPayRebates(partnerMonthlyPath, false);
      }
      if (fs.existsSync(partnerYearlyPath)) {
        results['partnerpay_yearly'] = await this.importPartnerPayRebates(partnerYearlyPath, true);
      }

      // Import Library_NIUM tables
      const libraryPath = path.join(dataFolderPath, 'Library_NIUM');
      
      if (fs.existsSync(libraryPath)) {
        const airlinesMCCPath = path.join(libraryPath, 'AirlinesMCC.csv');
        const regionCountryPath = path.join(libraryPath, 'RegionCountry.csv');
        const voyagePrivePath = path.join(libraryPath, 'VoyagePrive.csv');
        const billingMaterialsPath = path.join(libraryPath, 'BillingMaterials.csv');
        const sapBPCodesPath = path.join(libraryPath, 'SAP_BPCodes.csv');

        if (fs.existsSync(airlinesMCCPath)) {
          results['airlines_mcc'] = await this.importAirlinesMCC(airlinesMCCPath);
        }
        if (fs.existsSync(regionCountryPath)) {
          results['region_country'] = await this.importRegionCountry(regionCountryPath);
        }
        if (fs.existsSync(voyagePrivePath)) {
          results['voyage_prive'] = await this.importVoyagePriveRebates(voyagePrivePath);
        }
        if (fs.existsSync(billingMaterialsPath)) {
          results['billing_materials'] = await this.importBillingMaterials(billingMaterialsPath);
        }
        if (fs.existsSync(sapBPCodesPath)) {
          results['sap_bp_codes'] = await this.importSAPBPCodes(sapBPCodesPath);
        }
      }

    } catch (error) {
      console.error('Batch import error:', error);
    }

    return results;
  }

  // Helper method to check if a row is completely empty
  private isRowCompletelyEmpty(record: Record<string, string>): boolean {
    return Object.values(record).every(value => !value || !value.trim());
  }

  // Helper method to parse rebate values
  private parseRebateValue(value: string): number | undefined {
    if (!value || value.trim() === '' || value.trim() === '0') return undefined;
    const cleaned = value.trim()
      .replace(/^"|"$/g, '')  // Remove quotes
      .replace('%', '');      // Remove percentage sign
    const num = parseFloat(cleaned);
    return isNaN(num) || num === 0 ? undefined : num;
  }

  // Method to get import statistics
  async getImportStats(): Promise<{
    transactions: number;
    visaMCORebatesMonthly: number;
    visaMCORebatesYearly: number;
    partnerPayRebatesMonthly: number;
    partnerPayRebatesYearly: number;
    airlinesMCC: number;
    regionCountry: number;
    voyagePriveRebates: number;
    billingMaterials: number;
    sapBPCodes: number;
  }> {
    const [
      transactions,
      visaMCORebates, 
      partnerPayRebates,
      airlinesData,
      regionData,
      voyageData,
      billingData,
      sapData
    ] = await Promise.all([
      this.dbManager.getTableRowCount('transaction_data'),
      this.dbManager.getTableRowCount('visa_mco_rebates'),
      this.dbManager.getTableRowCount('partnerpay_rebates'),
      this.dbManager.getLibraryData('AirlinesMCC'),
      this.dbManager.getLibraryData('RegionCountry'),
      this.dbManager.getLibraryData('VoyagePrive'),
      this.dbManager.getLibraryData('BillingMaterials'),
      this.dbManager.getLibraryData('SAP_BPCode')
    ]);

    // Get counts from library data
    const airlinesMCC = airlinesData.length;
    const regionCountry = regionData.length;
    const voyagePriveRebates = voyageData.length;
    const billingMaterials = billingData.length;
    const sapBPCodes = sapData.length;

    // Count by import_source field for accurate tracking
    const visaMCORebatesData = await this.dbManager.getVisaMCORebates();
    const partnerPayRebatesData = await this.dbManager.getPartnerPayRebates();
    
    const visaMCOMonthly = visaMCORebatesData.filter(r => r.import_source === 'monthly').length;
    const visaMCOYearly = visaMCORebatesData.filter(r => r.import_source === 'yearly').length;
    const partnerPayMonthly = partnerPayRebatesData.filter(r => r.import_source === 'monthly').length;
    const partnerPayYearly = partnerPayRebatesData.filter(r => r.import_source === 'yearly').length;

    return {
      transactions,
      visaMCORebatesMonthly: visaMCOMonthly,
      visaMCORebatesYearly: visaMCOYearly,
      partnerPayRebatesMonthly: partnerPayMonthly,
      partnerPayRebatesYearly: partnerPayYearly,
      airlinesMCC,
      regionCountry,
      voyagePriveRebates,
      billingMaterials,
      sapBPCodes
    };
  }
}