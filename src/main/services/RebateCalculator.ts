import { DatabaseManager } from '../../database/DatabaseManager';
import {
  AppConfiguration,
  TransactionRecord,
  CalculatedRebate,
  ProcessingProgress,
  ProcessingResult,
  RebateLevel,
  CalculationType,
  MasterTableRow
} from '../../shared/types';

export class RebateCalculator {
  private databaseManager: DatabaseManager;
  private voyagePriveProviders = [
    'amvoyageprivefr#amvoyageprivefr',
    'amvoyagepriveit#amvoyagepriveit',
    'amvoyagepriveuk#amvoyagepriveuk'
  ];

  private regionCountryProviders = [
    'ama1inclimited#ama1inclimited',
    'amesky#amesky',
    'amjttravelhk#amjttravel',
    'amjttravelhk#amjttravelhk',
    'amletsflyhk#amletsflyhk',
    'amletsflylimited#amletsflylimited',
    'amqiyoujihk#amqiyoujihk',
    'amtttlimited#amtttlimited',
    'amtttlimitedhk#amtttlimitedhk'
  ];

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  async calculateRebates(config: AppConfiguration): Promise<ProcessingResult> {
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
      // Get all transaction data
      this.updateProgress('calculation', 10, 'Loading transaction data...');
      const transactions = await this.databaseManager.getTransactionData();
      result.transactionsProcessed = transactions.length;
      result.summary.totalTransactions = transactions.length;

      // Load lookup data
      this.updateProgress('calculation', 20, 'Loading rebate lookup data...');
      const visaMCORebates = await this.databaseManager.getVisaMCORebates();
      const partnerPayRebates = await this.databaseManager.getPartnerPayRebates();

      console.log(`[RebateCalculator] Loaded rebate configuration:`);
      console.log(`  - Transactions to process: ${transactions.length}`);
      console.log(`  - Visa/MCO rebates: ${visaMCORebates.length}`);
      console.log(`  - PartnerPay rebates: ${partnerPayRebates.length}`);

      // Clear previous calculations
      await this.databaseManager.clearCalculatedRebates();

      // Calculate rebates for each transaction
      const calculatedRebates: CalculatedRebate[] = [];
      let processed = 0;

      // Convert database records to application format
      const appTransactions: TransactionRecord[] = transactions.map(dbTxn => ({
        transactionCardNumber: dbTxn.transaction_card_number,
        transactionCurrency: dbTxn.transaction_currency,
        providerCustomerCode: dbTxn.provider_customer_code,
        transactionType: dbTxn.transaction_type,
        transactionCard: dbTxn.transaction_card,
        salesforceProductName: dbTxn.salesforce_product_name,
        fundingAccountName: dbTxn.funding_account_name,
        region: dbTxn.region,
        regionMC: dbTxn.region_mc,
        transactionDate: dbTxn.transaction_date,
        binCardNumber: dbTxn.bin_card_number,
        transactionAmount: dbTxn.transaction_amount,
        interchangeAmount: dbTxn.interchange_amount,
        interchangePercentage: dbTxn.interchange_percentage,
        transactionId: dbTxn.transaction_id,
        transactionAmountEUR: dbTxn.transaction_amount_eur,
        fxRate: dbTxn.fx_rate,
        pkReference: dbTxn.pk_reference,
        transactionMerchantCountry: dbTxn.transaction_merchant_country,
        transactionMerchantCategoryCode: dbTxn.transaction_merchant_category_code,
        merchantName: dbTxn.merchant_name,
        transactionMerchantName: dbTxn.transaction_merchant_name
      }));

      for (const transaction of appTransactions) {
        try {
          const rebates = await this.calculateTransactionRebates(transaction, visaMCORebates, partnerPayRebates);
          calculatedRebates.push(...rebates);
          
          processed++;
          if (processed % 100 === 0) {
            const percentage = 20 + (processed / appTransactions.length) * 60;
            this.updateProgress('calculation', percentage, `Processing transaction ${processed} of ${appTransactions.length}...`);
          }
        } catch (error) {
          result.errors.push(`Error processing transaction ${transaction.transactionId}: ${(error as Error).message}`);
        }
      }

      // Store calculated rebates - convert to database format
      this.updateProgress('calculation', 85, 'Storing calculated rebates...');
      console.log(`[RebateCalculator] Converting ${calculatedRebates.length} rebates to database format...`);
      const dbCalculatedRebates = calculatedRebates.map(rebate => ({
        transaction_id: rebate.transactionId,
        provider_customer_code: rebate.providerCustomerCode,
        product_name: rebate.productName,
        rebate_level: rebate.rebateLevel,
        rebate_percentage: rebate.rebatePercentage,
        rebate_amount: rebate.rebateAmount,
        rebate_amount_eur: rebate.rebateAmountEUR,
        calculation_type: rebate.calculationType
      }));
      
      console.log(`[RebateCalculator] Inserting ${dbCalculatedRebates.length} rebates into database...`);
      try {
        await this.databaseManager.insertCalculatedRebates(dbCalculatedRebates);
        console.log(`[RebateCalculator] ✅ Successfully stored all rebates in database`);
      } catch (error) {
        console.error(`[RebateCalculator] ❌ Failed to store rebates:`, error);
        throw new Error(`Failed to store calculated rebates: ${(error as Error).message}`);
      }
      
      // Add realistic delay
      await this.delay(500);

      // Calculate summary
      this.updateProgress('calculation', 95, 'Calculating summary...');
      this.calculateSummary(calculatedRebates, result);
      
      // Add final delay
      await this.delay(300);

      result.success = true;
      result.rebatesCalculated = calculatedRebates.length;
      // Don't include the full list to avoid OOM with millions of rebates
      // result.calculatedRebates = calculatedRebates; 
      result.totalRebateAmountEur = result.summary.totalRebateAmountEUR; // Add for frontend compatibility
      result.processingTime = Date.now() - startTime;

      console.log(`[RebateCalculator] Calculation completed:`);
      console.log(`  - Total rebates calculated: ${calculatedRebates.length}`);
      console.log(`  - Total rebate amount: €${result.summary.totalRebateAmountEUR}`);
      console.log(`  - Processing time: ${result.processingTime}ms`);

      this.updateProgress('complete', 100, 'Rebate calculation complete!');

    } catch (error) {
      result.errors.push(`Calculation failed: ${(error as Error).message}`);
      console.error('Rebate calculation error:', error);
    }

    return result;
  }

  private async calculateTransactionRebates(
    transaction: TransactionRecord,
    visaMCORebates: any[],
    partnerPayRebates: any[]
  ): Promise<CalculatedRebate[]> {
    const rebates: CalculatedRebate[] = [];
    const rebatesByLevel: Map<number, CalculatedRebate> = new Map();

    // STEP 1: Always try Visa/MCO first (LEFT OUTER JOIN)
    const visaMCORebateResults = await this.calculateVisaMCORebates(transaction, visaMCORebates);
    
    // STEP 2: Always try PartnerPay (LEFT OUTER JOIN)
    const partnerPayRebateResults = await this.calculatePartnerPayRebates(transaction, partnerPayRebates);

    // STEP 3: Consolidate rebates - Visa/MCO takes priority if both exist
    // (This mimics Power Query's unified rebate columns logic)
    for (const rebate of visaMCORebateResults) {
      rebatesByLevel.set(rebate.rebateLevel, rebate);
    }
    
    // Only add PartnerPay rebates if no Visa/MCO rebate exists for that level
    for (const rebate of partnerPayRebateResults) {
      if (!rebatesByLevel.has(rebate.rebateLevel)) {
        rebatesByLevel.set(rebate.rebateLevel, rebate);
      }
    }

    // STEP 4: Apply special cases that may override standard rebates
    if (this.regionCountryProviders.includes(transaction.providerCustomerCode)) {
      // Region/Country specific rules can override existing rebates
      const regionCountryRebates = await this.calculateRegionCountryRebates(transaction, visaMCORebates);
      for (const rebate of regionCountryRebates) {
        rebatesByLevel.set(rebate.rebateLevel, rebate); // Override if exists
      }
    }

    if (this.voyagePriveProviders.includes(transaction.providerCustomerCode)) {
      // Voyage Prive rules can override existing rebates (only Yearly)
      const voyagePriveRebates = await this.calculateVoyagePriveRebates(transaction, visaMCORebates);
      for (const rebate of voyagePriveRebates) {
        rebatesByLevel.set(rebate.rebateLevel, rebate); // Override if exists
      }
    }

    // Convert map back to array
    rebates.push(...rebatesByLevel.values());

    return rebates;
  }

  private async calculateVisaMCORebates(
    transaction: TransactionRecord,
    visaMCORebates: any[]
  ): Promise<CalculatedRebate[]> {
    const rebates: CalculatedRebate[] = [];

    // DIAGNOSTIC: Debug logging for diagnosis - more frequent
    if (Math.random() < 0.01) { // Log ~1% of transactions for diagnosis
      console.log(`[DIAGNOSTIC] Visa/MCO matching:`);
      console.log(`  Transaction Provider: "${transaction.providerCustomerCode}"`);
      console.log(`  Transaction Product: "${transaction.salesforceProductName}"`);
      console.log(`  Transaction Amount EUR: €${transaction.transactionAmountEUR}`);
      console.log(`  Available Visa/MCO rebates (first 3):`);
      visaMCORebates.slice(0, 3).forEach((rebate, idx) => {
        console.log(`    ${idx + 1}. Provider: "${rebate.provider_customer_code}", Product: "${rebate.product_name}"`);
        console.log(`        Rebate 1 Yearly: ${rebate.rebate_1_yearly}, Monthly: ${rebate.rebate_1_monthly}`);
      });
    }

    // Find matching rebate record
    const matchingRebate = visaMCORebates.find(rebate =>
      rebate.provider_customer_code === transaction.providerCustomerCode &&
      rebate.product_name === transaction.salesforceProductName
    );

    if (!matchingRebate) {
      // Log first few non-matches for debugging
      if (Math.random() < 0.001) {
        console.log(`[RebateCalculator] DEBUG - No Visa/MCO match found for: "${transaction.providerCustomerCode}" + "${transaction.salesforceProductName}"`);
      }
      return rebates;
    }

    // Calculate for each rebate level (1-8)
    for (let level = 1; level <= 8; level++) {
      const yearlyRate = matchingRebate[`rebate_${level}_yearly`];
      const monthlyRate = matchingRebate[`rebate_${level}_monthly`];
      
      // Use yearly rate if available, otherwise use monthly
      const rebateRate = yearlyRate ?? monthlyRate;
      
      if (rebateRate && rebateRate > 0) {
        const rebateAmount = Math.round((rebateRate * transaction.transactionAmount) * 100) / 100;
        const rebateAmountEUR = Math.round((rebateRate * transaction.transactionAmountEUR) * 100) / 100;

        // DIAGNOSTIC: Log calculation details for first few rebates
        if (Math.random() < 0.005) { // Log ~0.5% of calculations for diagnosis
          console.log(`[DIAGNOSTIC] Rebate calculation:`);
          console.log(`  Level ${level}: Rate=${rebateRate}%, TxAmount=€${transaction.transactionAmountEUR}`);
          console.log(`  Formula: ${rebateRate} * €${transaction.transactionAmountEUR} = €${rebateAmountEUR}`);
          console.log(`  Yearly Rate: ${yearlyRate}, Monthly Rate: ${monthlyRate}`);
        }

        rebates.push({
          transactionId: transaction.transactionId,
          providerCustomerCode: transaction.providerCustomerCode,
          productName: transaction.salesforceProductName,
          rebateLevel: level as RebateLevel,
          rebatePercentage: rebateRate,
          rebateAmount: rebateAmount,
          rebateAmountEUR: rebateAmountEUR,
          calculationType: 'visa_mco',
          originalTransaction: transaction
        });
      }
    }

    return rebates;
  }

  private async calculatePartnerPayRebates(
    transaction: TransactionRecord,
    partnerPayRebates: any[]
  ): Promise<CalculatedRebate[]> {
    const rebates: CalculatedRebate[] = [];

    // Debug logging for PartnerPay matching
    if (Math.random() < 0.001) { // Log ~0.1% of transactions
      console.log(`[RebateCalculator] DEBUG - PartnerPay matching:`);
      console.log(`  Transaction Provider: "${transaction.providerCustomerCode}"`);
      console.log(`  Transaction Product: "${transaction.salesforceProductName}"`);
      console.log(`  Transaction BIN (first 6): "${transaction.binCardNumber.toString().slice(0, 6)}"`);
      console.log(`  Transaction Merchant Name: "${transaction.merchantName}"`);
      console.log(`  Available PartnerPay rebates (first 3):`);
      partnerPayRebates.slice(0, 3).forEach((rebate, idx) => {
        console.log(`    ${idx + 1}. Provider: "${rebate.provider_customer_code}", Product: "${rebate.product_name}", BIN: "${rebate.partnerpay_bin}", Airline: "${rebate.partner_pay_airline}"`);
      });
    }

    // Find matching rebate record using las 4 keys según especificaciones oficiales:
    // 1. Provider_Customer_Code__c ↔ Provider Customer Code
    // 2. Salesforce product name ↔ Product Name  
    // 3. BIN Card Number ↔ PartnerPay/PartnerDirect BIN
    // 4. Merchant Name ↔ Partner Pay Airline: Account Name
    
    const matchingRebate = partnerPayRebates.find(rebate => {
      // Key 1: Provider Customer Code (flexible matching for PartnerPay data issues)
      const providerMatch = this.isProviderMatch(rebate.provider_customer_code, transaction.providerCustomerCode);
      
      // Key 2: Product Name (flexible matching for number variations)
      const productMatch = this.isProductMatch(rebate.product_name, transaction.salesforceProductName);
      
      // Key 3: BIN Card Number (extract numbers from lookup BIN format)
      const lookupBinNumbers = this.extractBinNumbers(rebate.partnerpay_bin);
      const transactionBin = transaction.binCardNumber.toString();
      const binMatch = this.isBinMatch(lookupBinNumbers, transactionBin);
      
      // Key 4: Merchant Name ↔ Partner Pay Airline: Account Name
      // According to Power Query, use raw Merchant Name (Column U), NOT enhanced
      const merchantMatch = rebate.partner_pay_airline === transaction.merchantName;
      
      // Debug logging for matching attempts
      if (Math.random() < 0.001) { // Log ~0.1% of attempts
        console.log(`[RebateCalculator] DEBUG - PartnerPay 4-key matching:`, {
          provider: { tx: transaction.providerCustomerCode, lu: rebate.provider_customer_code, match: providerMatch },
          product: { tx: transaction.salesforceProductName, lu: rebate.product_name, match: productMatch },
          bin: { tx: transactionBin, lu: rebate.partnerpay_bin, luExtracted: lookupBinNumbers, match: binMatch },
          merchant: { tx: transaction.merchantName, lu: rebate.partner_pay_airline, match: merchantMatch },
          allMatch: providerMatch && productMatch && binMatch && merchantMatch
        });
      }
      
      // Según especificaciones: TODOS los 4 keys deben hacer match
      return providerMatch && productMatch && binMatch && merchantMatch;
    });

    if (!matchingRebate) {
      if (Math.random() < 0.001) {
        console.log(`[RebateCalculator] DEBUG - No PartnerPay match found for: "${transaction.providerCustomerCode}" + "${transaction.salesforceProductName}" + BIN:"${transaction.binCardNumber.toString()}" + Merchant:"${transaction.merchantName}"`);
      }
      return rebates;
    }

    // Calculate for each rebate level (1-8)
    for (let level = 1; level <= 8; level++) {
      const yearlyRate = matchingRebate[`rebate_${level}_yearly`];
      const monthlyRate = matchingRebate[`rebate_${level}_monthly`];
      
      // Use yearly rate if available, otherwise use monthly
      const rebateRate = yearlyRate ?? monthlyRate;
      
      if (rebateRate && rebateRate > 0) {
        const rebateAmount = Math.round((rebateRate * transaction.transactionAmount) * 100) / 100;
        const rebateAmountEUR = Math.round((rebateRate * transaction.transactionAmountEUR) * 100) / 100;

        rebates.push({
          transactionId: transaction.transactionId,
          providerCustomerCode: transaction.providerCustomerCode,
          productName: transaction.salesforceProductName,
          rebateLevel: level as RebateLevel,
          rebatePercentage: rebateRate,
          rebateAmount: rebateAmount,
          rebateAmountEUR: rebateAmountEUR,
          calculationType: 'partnerpay',
          originalTransaction: transaction
        });
      }
    }

    return rebates;
  }

  private async calculateVoyagePriveRebates(
    transaction: TransactionRecord,
    visaMCORebates: any[]
  ): Promise<CalculatedRebate[]> {
    try {
      // First, get base Visa/MCO rebates (like Power Query)
      const baseRebates = await this.calculateVisaMCORebates(transaction, visaMCORebates);
      
      // Get Voyage Prive rebates from SQLite database
      const voyagePriveRebates = await this.databaseManager.getVoyagePriveRebates();
      
      // Find matching rebate record
      const matchingRebate = voyagePriveRebates.find(rebate =>
        rebate.provider_customer_code === transaction.providerCustomerCode &&
        rebate.product_name === transaction.salesforceProductName
      );
      
      if (!matchingRebate) {
        return baseRebates; // Return base rebates if no VoyagePrive match
      }

      // VoyagePrive rules ONLY override Yearly rebates, keep Monthly intact
      const modifiedRebates = baseRebates.map(rebate => {
        const yearlyRateFromVP = matchingRebate[`rebate_${rebate.rebateLevel}_yearly` as keyof typeof matchingRebate] as number;
        
        // If VoyagePrive has a yearly rate, use it
        if (yearlyRateFromVP !== null && yearlyRateFromVP !== undefined && yearlyRateFromVP > 0) {
          const newRebateAmount = Math.round((yearlyRateFromVP * transaction.transactionAmount) * 100) / 100;
          const newRebateAmountEUR = Math.round((yearlyRateFromVP * transaction.transactionAmountEUR) * 100) / 100;
          
          return {
            ...rebate,
            rebatePercentage: yearlyRateFromVP,
            rebateAmount: newRebateAmount,
            rebateAmountEUR: newRebateAmountEUR,
            calculationType: 'voyage_prive' as CalculationType
          };
        }
        
        // Otherwise keep the base rebate unchanged
        return rebate;
      });
      
      // Also check if VoyagePrive has rebates for levels not in base
      for (let level = 1; level <= 8; level++) {
        if (!baseRebates.find(r => r.rebateLevel === level)) {
          const yearlyRate = matchingRebate[`rebate_${level}_yearly` as keyof typeof matchingRebate] as number;
          
          if (yearlyRate && yearlyRate > 0) {
            const rebateAmount = Math.round((yearlyRate * transaction.transactionAmount) * 100) / 100;
            const rebateAmountEUR = Math.round((yearlyRate * transaction.transactionAmountEUR) * 100) / 100;

            modifiedRebates.push({
              transactionId: transaction.transactionId,
              providerCustomerCode: transaction.providerCustomerCode,
              productName: transaction.salesforceProductName,
              rebateLevel: level as RebateLevel,
              rebatePercentage: yearlyRate,
              rebateAmount: rebateAmount,
              rebateAmountEUR: rebateAmountEUR,
              calculationType: 'voyage_prive',
              originalTransaction: transaction
            });
          }
        }
      }
      
      return modifiedRebates;

    } catch (error) {
      console.error('Error calculating Voyage Prive rebates:', error);
      // Fallback to standard calculation
      return this.calculateVisaMCORebates(transaction, visaMCORebates);
    }
  }

  private async calculateRegionCountryRebates(
    transaction: TransactionRecord,
    visaMCORebates: any[]
  ): Promise<CalculatedRebate[]> {
    try {
      // First, get base Visa/MCO rebates
      const baseRebates = await this.calculateVisaMCORebates(transaction, visaMCORebates);
      
      // Get region/country rules from SQLite database
      const regionCountryData = await this.databaseManager.getRegionCountry();
      
      // Filter rules for this provider AND product
      const providerRules = regionCountryData.filter(rule =>
        rule.provider_customer_code === transaction.providerCustomerCode &&
        rule.product_name === transaction.salesforceProductName
      );
      
      if (providerRules.length === 0) {
        // No region/country rules for this provider/product
        return baseRebates;
      }

      // Find matching rule - check specific rules first
      let matchingRule = null;
      
      // Try to find exact match first
      for (const rule of providerRules) {
        const regionMatch = rule.region_mc === transaction.regionMC;
        const countryMatch = rule.transaction_merchant_country === transaction.transactionMerchantCountry;
        
        if (regionMatch && countryMatch) {
          matchingRule = rule;
          break;
        }
      }
      
      // If no exact match, check for wildcard rules
      if (!matchingRule) {
        for (const rule of providerRules) {
          const regionMatch = rule.region_mc === '*' || rule.region_mc === 'ALL' || rule.region_mc === transaction.regionMC;
          const countryMatch = rule.transaction_merchant_country === '*' || rule.transaction_merchant_country === 'ALL' || 
                             rule.transaction_merchant_country === transaction.transactionMerchantCountry;
          
          if (regionMatch && countryMatch) {
            matchingRule = rule;
            break;
          }
        }
      }

      if (matchingRule) {
        // Region/Country rules ONLY override Yearly rebates, keep Monthly intact
        const modifiedRebates = baseRebates.map(rebate => {
          const yearlyRateFromRule = matchingRule[`rebate_${rebate.rebateLevel}_yearly`];
          
          // If region/country has a yearly rate, use it
          if (yearlyRateFromRule !== null && yearlyRateFromRule !== undefined) {
            const newRebateAmount = Math.round((yearlyRateFromRule * transaction.transactionAmount) * 100) / 100;
            const newRebateAmountEUR = Math.round((yearlyRateFromRule * transaction.transactionAmountEUR) * 100) / 100;
            
            return {
              ...rebate,
              rebatePercentage: yearlyRateFromRule,
              rebateAmount: newRebateAmount,
              rebateAmountEUR: newRebateAmountEUR,
              calculationType: 'region_country' as CalculationType
            };
          }
          
          // Otherwise keep the base rebate unchanged
          return rebate;
        });
        
        return modifiedRebates;
      }

      // No matching rule found, return base rebates
      return baseRebates;

    } catch (error) {
      console.error('Error calculating region/country rebates:', error);
      // Fallback to standard calculation
      return this.calculateVisaMCORebates(transaction, visaMCORebates);
    }
  }

  private async enhanceMerchantName(transaction: TransactionRecord): Promise<string> {
    // Handle MCC 4511 special cases according to COE-46 lines 210-219
    if (transaction.transactionMerchantCategoryCode === 4511) {
      
      try {
        // Get airlines MCC data from SQLite database
        const airlinesMCC = await this.databaseManager.getAirlinesMCC();
        
        // Check both merchantName and transactionMerchantName for airline matches
        const merchantNameLower = (transaction.merchantName || '').toLowerCase();
        const transactionMerchantNameLower = (transaction.transactionMerchantName || '').toLowerCase();
        
        // VALIDATION LOGGING for LATAM
        if (merchantNameLower.includes('latam') || transactionMerchantNameLower.includes('latam')) {
          console.log(`[ValidationHelper] LATAM Enhancement Check:`);
          console.log(`  Original Merchant Name: "${transaction.merchantName}"`);
          console.log(`  Transaction Merchant Name: "${transaction.transactionMerchantName}"`);
        }
        
        // Find matching airline by checking if merchant name contains airline name
        const matchingAirline = airlinesMCC.find(airline => {
          const airlineNameLower = (airline.airline_name || '').toLowerCase();
          return merchantNameLower.includes(airlineNameLower) || 
                 transactionMerchantNameLower.includes(airlineNameLower);
        });
        
        if (matchingAirline) {
          const enhancedName = `${matchingAirline.airline_name} (${matchingAirline.airline_code})`;
          
          // VALIDATION LOGGING
          if (merchantNameLower.includes('latam') || transactionMerchantNameLower.includes('latam')) {
            console.log(`  Enhanced to: "${enhancedName}" (from AirlinesMCC table)`);
          }
          
          return enhancedName;
        }
        
        // Fallback to hardcoded mapping for backward compatibility (COE-46 lines 210-213)
        for (const name of [merchantNameLower, transactionMerchantNameLower]) {
          if (name.includes('air europa')) {
            return 'Air Europa (UX)';
          } else if (name.includes('air greenland')) {
            return 'Air Greenland (GL)';
          } else if (name.includes('latam')) {
            console.log(`  Enhanced to: "LATAM Airlines Group" (hardcoded fallback)`);
            return 'LATAM Airlines Group'; // Changed from 'LATAM' to match validation file
          }
        }
        
      } catch (error) {
        console.error('Error enhancing merchant name:', error);
      }
    }

    return transaction.merchantName;
  }

  private async getEnhancedMCC(transaction: TransactionRecord): Promise<string> {
    // Get enhanced merchant name first
    const merchantNameNew = await this.enhanceMerchantName(transaction);
    
    // Handle MCC 4511 special cases - map to specific airline codes per Power Query logic
    if (transaction.transactionMerchantCategoryCode === 4511) {
      const mccMappings: Record<string, string> = {
        'Air Europa (UX)': '1419',
        'Air Greenland': '39GL',
        'Air Greenland (GL)': '39GL',
        'Icelandair (FI)': '3050',
        'LATAM': '3052',
        'LATAM Airlines Group': '3052',
        'Norwegian (DY)': '3211',
        'ROYAL AIR MAROC': '3048',
        'Thai Airways': '3077',
        'TURKISH AIRLINES': '3047',
        'United Airlines': '3000'
      };
      
      // Check if we have a mapping for this enhanced merchant name
      for (const [airline, mcc] of Object.entries(mccMappings)) {
        if (merchantNameNew === airline) {
          return mcc;
        }
      }
    }
    
    // For all other cases, return the original MCC as string
    return transaction.transactionMerchantCategoryCode?.toString() || '';
  }


  private isVisaMCOProduct(productName: string): boolean {
    // Determine if product is Visa/MCO based on product name
    const visaMCOKeywords = ['visa', 'mastercard', 'mco'];
    const productNameLower = productName.toLowerCase();
    
    return visaMCOKeywords.some(keyword => productNameLower.includes(keyword));
  }

  private calculateSummary(calculatedRebates: CalculatedRebate[], result: ProcessingResult): void {
    result.summary.totalRebateAmount = calculatedRebates.reduce((sum, rebate) => sum + rebate.rebateAmount, 0);
    result.summary.totalRebateAmountEUR = calculatedRebates.reduce((sum, rebate) => sum + rebate.rebateAmountEUR, 0);

    // Group by calculation type
    const byCalculationType: Record<string, number> = {};
    calculatedRebates.forEach(rebate => {
      byCalculationType[rebate.calculationType] = (byCalculationType[rebate.calculationType] || 0) + rebate.rebateAmountEUR;
    });
    result.summary.byCalculationType = byCalculationType;

    // Group by provider
    const byProvider: Record<string, number> = {};
    calculatedRebates.forEach(rebate => {
      byProvider[rebate.providerCustomerCode] = (byProvider[rebate.providerCustomerCode] || 0) + rebate.rebateAmountEUR;
    });
    result.summary.byProvider = byProvider;

    // Round all amounts to 2 decimal places
    result.summary.totalRebateAmount = Math.round(result.summary.totalRebateAmount * 100) / 100;
    result.summary.totalRebateAmountEUR = Math.round(result.summary.totalRebateAmountEUR * 100) / 100;
  }

  async getResults(): Promise<{
    transactions: TransactionRecord[];
    calculatedRebates: CalculatedRebate[];
    summary: any;
  }> {
    const transactions = await this.databaseManager.getTransactionData();
    const calculatedRebates = await this.databaseManager.getCalculatedRebates();
    
    // Convert database format to application format
    const appCalculatedRebates: CalculatedRebate[] = [];
    const appTransactions: TransactionRecord[] = transactions.map(dbTxn => ({
      transactionCardNumber: dbTxn.transaction_card_number,
      transactionCurrency: dbTxn.transaction_currency,
      providerCustomerCode: dbTxn.provider_customer_code,
      transactionType: dbTxn.transaction_type,
      transactionCard: dbTxn.transaction_card,
      salesforceProductName: dbTxn.salesforce_product_name,
      fundingAccountName: dbTxn.funding_account_name,
      region: dbTxn.region,
      regionMC: dbTxn.region_mc,
      transactionDate: dbTxn.transaction_date,
      binCardNumber: dbTxn.bin_card_number,
      transactionAmount: dbTxn.transaction_amount,
      interchangeAmount: dbTxn.interchange_amount,
      interchangePercentage: dbTxn.interchange_percentage,
      transactionId: dbTxn.transaction_id,
      transactionAmountEUR: dbTxn.transaction_amount_eur,
      fxRate: dbTxn.fx_rate,
      pkReference: dbTxn.pk_reference,
      transactionMerchantCountry: dbTxn.transaction_merchant_country,
      transactionMerchantCategoryCode: dbTxn.transaction_merchant_category_code,
      merchantName: dbTxn.merchant_name,
      transactionMerchantName: dbTxn.transaction_merchant_name
    }));
    
    for (const dbRebate of calculatedRebates) {
      const transaction = appTransactions.find(t => t.transactionId === dbRebate.transaction_id);
      if (transaction) {
        appCalculatedRebates.push({
          transactionId: dbRebate.transaction_id,
          providerCustomerCode: dbRebate.provider_customer_code || '',
          productName: dbRebate.product_name || '',
          rebateLevel: dbRebate.rebate_level as RebateLevel,
          rebatePercentage: dbRebate.rebate_percentage || 0,
          rebateAmount: dbRebate.rebate_amount || 0,
          rebateAmountEUR: dbRebate.rebate_amount_eur || 0,
          calculationType: dbRebate.calculation_type as CalculationType,
          originalTransaction: transaction
        });
      }
    }

    // Calculate summary
    const summary = {
      totalTransactions: transactions.length,
      totalRebateAmount: appCalculatedRebates.reduce((sum, rebate) => sum + rebate.rebateAmount, 0),
      totalRebateAmountEUR: appCalculatedRebates.reduce((sum, rebate) => sum + rebate.rebateAmountEUR, 0),
      byCalculationType: {} as Record<string, number>,
      byProvider: {} as Record<string, number>
    };

    // Group by calculation type
    appCalculatedRebates.forEach(rebate => {
      summary.byCalculationType[rebate.calculationType] = (summary.byCalculationType[rebate.calculationType] || 0) + rebate.rebateAmountEUR;
    });

    // Group by provider
    appCalculatedRebates.forEach(rebate => {
      summary.byProvider[rebate.providerCustomerCode] = (summary.byProvider[rebate.providerCustomerCode] || 0) + rebate.rebateAmountEUR;
    });

    return {
      transactions: appTransactions,
      calculatedRebates: appCalculatedRebates,
      summary
    };
  }

  async generateMasterTable(): Promise<MasterTableRow[]> {
    console.log('[RebateCalculator] Generating master table (Power Query style)...');
    
    // Get all data
    const { transactions, calculatedRebates } = await this.getResults();
    const masterTable: MasterTableRow[] = [];
    
    // Group calculated rebates by transaction ID for easy lookup
    const rebatesByTransaction = new Map<string, CalculatedRebate[]>();
    for (const rebate of calculatedRebates) {
      const txnRebates = rebatesByTransaction.get(rebate.transactionId) || [];
      txnRebates.push(rebate);
      rebatesByTransaction.set(rebate.transactionId, txnRebates);
    }
    
    // Process each transaction
    for (const transaction of transactions) {
      const txnRebates = rebatesByTransaction.get(transaction.transactionId) || [];
      
      // Initialize master row with transaction data
      const masterRow: MasterTableRow = {
        ...transaction,
        // Initialize all rebate fields with null/0
        rebate1Monthly: null,
        rebate2Monthly: null,
        rebate3Monthly: null,
        rebate4Monthly: null,
        rebate5Monthly: null,
        rebate6Monthly: null,
        rebate7Monthly: null,
        rebate8Monthly: null,
        rebate1Yearly: null,
        rebate2Yearly: null,
        rebate3Yearly: null,
        rebate4Yearly: null,
        rebate5Yearly: null,
        rebate6Yearly: null,
        rebate7Yearly: null,
        rebate8Yearly: null,
        rebateAmount1: 0,
        rebateAmount2: 0,
        rebateAmount3: 0,
        rebateAmount4: 0,
        rebateAmount5: 0,
        rebateAmount6: 0,
        rebateAmount7: 0,
        rebateAmount8: 0,
        rebateAmountEUR1: 0,
        rebateAmountEUR2: 0,
        rebateAmountEUR3: 0,
        rebateAmountEUR4: 0,
        rebateAmountEUR5: 0,
        rebateAmountEUR6: 0,
        rebateAmountEUR7: 0,
        rebateAmountEUR8: 0,
        merchantNameNew: await this.enhanceMerchantName(transaction),
        transactionMerchantCategoryCode2: await this.getEnhancedMCC(transaction)
      };
      
      // Fill in rebate values from calculated rebates
      for (const rebate of txnRebates) {
        const level = rebate.rebateLevel;
        
        // Note: We need to fetch the original rebate config to get monthly/yearly split
        // For now, we'll use the rebate percentage for yearly (as per Power Query priority)
        // This is a simplification - in production, we'd need to store monthly/yearly separately
        
        // Set yearly rebate percentage (Power Query prioritizes yearly)
        (masterRow as any)[`rebate${level}Yearly`] = rebate.rebatePercentage;
        
        // Set calculated amounts
        (masterRow as any)[`rebateAmount${level}`] = rebate.rebateAmount;
        (masterRow as any)[`rebateAmountEUR${level}`] = rebate.rebateAmountEUR;
      }
      
      masterTable.push(masterRow);
    }
    
    console.log(`[RebateCalculator] Generated master table with ${masterTable.length} rows`);
    
    // Log summary statistics
    const totalRebateEUR = masterTable.reduce((sum, row) => 
      sum + row.rebateAmountEUR1 + row.rebateAmountEUR2 + row.rebateAmountEUR3 + row.rebateAmountEUR4 +
      row.rebateAmountEUR5 + row.rebateAmountEUR6 + row.rebateAmountEUR7 + row.rebateAmountEUR8, 0
    );
    
    console.log(`[RebateCalculator] Total rebate amount EUR across all levels: €${totalRebateEUR.toFixed(2)}`);
    
    return masterTable;
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

  // Utility methods for testing and validation
  async validateRebateCalculation(transactionId: string): Promise<{
    isValid: boolean;
    errors: string[];
    details: any;
  }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      details: {} as any
    };

    try {
      // Get transaction
      const dbTransactions = await this.databaseManager.getTransactionData();
      const dbTransaction = dbTransactions.find(t => t.transaction_id === transactionId);
      
      if (!dbTransaction) {
        result.isValid = false;
        result.errors.push('Transaction not found');
        return result;
      }

      // Convert to application format
      const transaction: TransactionRecord = {
        transactionCardNumber: dbTransaction.transaction_card_number,
        transactionCurrency: dbTransaction.transaction_currency,
        providerCustomerCode: dbTransaction.provider_customer_code,
        transactionType: dbTransaction.transaction_type,
        transactionCard: dbTransaction.transaction_card,
        salesforceProductName: dbTransaction.salesforce_product_name,
        fundingAccountName: dbTransaction.funding_account_name,
        region: dbTransaction.region,
        regionMC: dbTransaction.region_mc,
        transactionDate: dbTransaction.transaction_date,
        binCardNumber: dbTransaction.bin_card_number,
        transactionAmount: dbTransaction.transaction_amount,
        interchangeAmount: dbTransaction.interchange_amount,
        interchangePercentage: dbTransaction.interchange_percentage,
        transactionId: dbTransaction.transaction_id,
        transactionAmountEUR: dbTransaction.transaction_amount_eur,
        fxRate: dbTransaction.fx_rate,
        pkReference: dbTransaction.pk_reference,
        transactionMerchantCountry: dbTransaction.transaction_merchant_country,
        transactionMerchantCategoryCode: dbTransaction.transaction_merchant_category_code,
        merchantName: dbTransaction.merchant_name,
        transactionMerchantName: dbTransaction.transaction_merchant_name
      };

      // Get calculated rebates for this transaction
      const calculatedRebates = await this.databaseManager.getCalculatedRebates();
      const rebates = calculatedRebates.filter(r => r.transaction_id === transactionId);

      result.details = {
        transaction,
        rebates,
        rebateCount: rebates.length,
        totalRebateAmount: rebates.reduce((sum, r) => sum + (r.rebate_amount || 0), 0),
        totalRebateAmountEUR: rebates.reduce((sum, r) => sum + (r.rebate_amount_eur || 0), 0)
      };

      // Validate rebate calculations
      for (const rebate of rebates) {
        const expectedAmount = Math.round((rebate.rebate_percentage! * transaction.transactionAmount) * 100) / 100;
        const expectedAmountEUR = Math.round((rebate.rebate_percentage! * transaction.transactionAmountEUR) * 100) / 100;

        if (Math.abs((rebate.rebate_amount || 0) - expectedAmount) > 0.01) {
          result.isValid = false;
          result.errors.push(`Rebate amount mismatch for level ${rebate.rebate_level}: expected ${expectedAmount}, got ${rebate.rebate_amount}`);
        }

        if (Math.abs((rebate.rebate_amount_eur || 0) - expectedAmountEUR) > 0.01) {
          result.isValid = false;
          result.errors.push(`Rebate amount EUR mismatch for level ${rebate.rebate_level}: expected ${expectedAmountEUR}, got ${rebate.rebate_amount_eur}`);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${(error as Error).message}`);
    }

    return result;
  }

  async getCalculationStats(): Promise<{
    totalTransactions: number;
    totalRebates: number;
    averageRebateAmount: number;
    averageRebateAmountEUR: number;
    calculationTypeBreakdown: Record<string, number>;
    rebateLevelBreakdown: Record<number, number>;
  }> {
    const transactions = await this.databaseManager.getTransactionData();
    const calculatedRebates = await this.databaseManager.getCalculatedRebates();

    const stats = {
      totalTransactions: transactions.length,
      totalRebates: calculatedRebates.length,
      averageRebateAmount: 0,
      averageRebateAmountEUR: 0,
      calculationTypeBreakdown: {} as Record<string, number>,
      rebateLevelBreakdown: {} as Record<number, number>
    };

    if (calculatedRebates.length > 0) {
      const totalAmount = calculatedRebates.reduce((sum, r) => sum + (r.rebate_amount || 0), 0);
      const totalAmountEUR = calculatedRebates.reduce((sum, r) => sum + (r.rebate_amount_eur || 0), 0);

      stats.averageRebateAmount = Math.round((totalAmount / calculatedRebates.length) * 100) / 100;
      stats.averageRebateAmountEUR = Math.round((totalAmountEUR / calculatedRebates.length) * 100) / 100;

      // Calculation type breakdown
      calculatedRebates.forEach(rebate => {
        const type = rebate.calculation_type || 'unknown';
        stats.calculationTypeBreakdown[type] = (stats.calculationTypeBreakdown[type] || 0) + 1;
      });

      // Rebate level breakdown
      calculatedRebates.forEach(rebate => {
        const level = rebate.rebate_level || 0;
        stats.rebateLevelBreakdown[level] = (stats.rebateLevelBreakdown[level] || 0) + 1;
      });
    }

    return stats;
  }

  // Flexible matching methods to handle real data format differences
  private isProductMatch(transactionProduct: string, lookupProduct: string): boolean {
    if (!transactionProduct || !lookupProduct) return false;
    
    // Exact match only - according to Power Query specifications
    // PartnerPay products like "Partner Pay 150" and "Partner Pay 100" are different products
    return transactionProduct === lookupProduct;
  }

  private isBinMatch(transactionBin: string, lookupBin: string): boolean {
    if (!transactionBin || !lookupBin) return false;
    
    // Extract only digits from both
    const txBin = transactionBin.replace(/\D/g, '');
    const luBin = lookupBin.replace(/\D/g, '');
    
    if (!txBin || !luBin) return false;
    
    // Get first 6 digits for comparison
    const txBin6 = txBin.slice(0, 6);
    const luBin6 = luBin.slice(0, 6);
    
    // Check if transaction BIN starts with any of the lookup BIN digits
    // Or if lookup contains the transaction BIN
    return txBin.startsWith(luBin6) || 
           luBin.includes(txBin6) ||
           txBin6 === luBin6;
  }

  private isAirlineMatch(enhancedMerchantName: string, lookupAirline: string): boolean {
    if (!enhancedMerchantName || !lookupAirline) return false;
    
    // Exact match
    if (enhancedMerchantName === lookupAirline) return true;
    
    // Normalize for comparison
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z]/g, '');
    const merchant = normalize(enhancedMerchantName);
    const airline = normalize(lookupAirline);
    
    // Check if airline name is contained in merchant name
    if (merchant.includes(airline) || airline.includes(merchant)) return true;
    
    // Check for common airline abbreviations and variations
    const airlineVariations: { [key: string]: string[] } = {
      'thaiairways': ['thai', 'tg'],
      'turkishairlines': ['turkish', 'tk'],
      'latamairlinesgroup': ['latam', 'la'],
      'latamairlines': ['latam', 'la'],
      'unitedairlines': ['united', 'ua'],
      'royalairmaroc': ['royal', 'at', 'ram'],
      'icelandair': ['iceland', 'fi'],
      'airgreenland': ['greenland', 'gl'],
      'aireuropa': ['europa', 'ux'],
      'norwegian': ['norwegian', 'dy']
    };
    
    // Check variations
    for (const [fullName, variations] of Object.entries(airlineVariations)) {
      if (airline.includes(fullName) || variations.some(v => airline.includes(v))) {
        if (merchant.includes(fullName) || variations.some(v => merchant.includes(v))) {
          return true;
        }
      }
    }
    
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract numeric BIN from lookup format
   * Examples: 'Tier 1: 557062' -> '557062', '194610' -> '194610'
   */
  private extractBinNumbers(binString: string): string {
    if (!binString) return '';
    
    // Try to find 6-digit BIN pattern after colon or at end
    const binMatch = binString.match(/(?::\s*)?(\d{6})(?:\s*$|$)/);
    if (binMatch) {
      return binMatch[1];
    }
    
    // Fallback: find any 6-digit number
    const digitMatch = binString.match(/\d{6}/);
    if (digitMatch) {
      return digitMatch[0];
    }
    
    // Last resort: extract all numbers (original logic)
    return binString.replace(/\D/g, '');
  }

  /**
   * Flexible provider matching for PartnerPay data issues
   * If lookup has generic 'partnerpay', accept any transaction provider
   */
  private isProviderMatch(lookupProvider: string, transactionProvider: string): boolean {
    if (!lookupProvider || !transactionProvider) return false;
    
    // Exact match (ideal case)
    if (lookupProvider === transactionProvider) return true;
    
    // If lookup has generic 'partnerpay', accept any transaction (data issue workaround)
    if (lookupProvider.toLowerCase() === 'partnerpay') return true;
    
    // Case insensitive match
    if (lookupProvider.toLowerCase() === transactionProvider.toLowerCase()) return true;
    
    return false;
  }
}