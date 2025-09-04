import { RebateCalculator } from '../main/services/RebateCalculator';
import { DatabaseManager } from '../database/DatabaseManager';
import { TransactionRecord, CalculatedRebate } from '../shared/types';

// Mock DatabaseManager
jest.mock('../database/DatabaseManager');

describe('RebateCalculator - COE-46 Compliance Tests', () => {
  let rebateCalculator: RebateCalculator;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockDatabaseManager = new DatabaseManager() as jest.Mocked<DatabaseManager>;
    rebateCalculator = new RebateCalculator(mockDatabaseManager);
  });

  describe('Visa & MCO Calculations', () => {
    test('should calculate rebates with yearly priority over monthly', async () => {
      // Test data according to COE-46 specifications
      const testTransaction: TransactionRecord = {
        transactionId: 'TXN_001',
        transactionCardNumber: '1234567890123456',
        transactionCurrency: 'EUR',
        providerCustomerCode: 'testprovider#testprovider',
        transactionType: 'Purchase',
        transactionCard: 'VISA',
        salesforceProductName: 'B2B Wallet - Test Product',
        fundingAccountName: 'Test Account',
        region: 'EU',
        regionMC: 'EU',
        transactionDate: new Date('2024-12-01'),
        binCardNumber: 123456, // First 6 digits according to COE-46 line 51
        transactionAmount: 1000.00,
        interchangeAmount: 20.00,
        interchangePercentage: 2.0,
        transactionAmountEUR: 1000.00,
        fxRate: 1.0,
        pkReference: 'PK_001',
        transactionMerchantCountry: 'ES',
        transactionMerchantCategoryCode: 4511,
        merchantName: 'Test Airline',
        transactionMerchantName: 'Test Airline Services'
      };

      const mockVisaMCORebates = [
        {
          provider_customer_code: 'testprovider#testprovider',
          product_name: 'B2B Wallet - Test Product',
          rebate_1_yearly: 0.5,    // 0.5% yearly
          rebate_1_monthly: 0.3,   // 0.3% monthly (should be ignored due to yearly priority)
          rebate_2_yearly: null,   // null yearly
          rebate_2_monthly: 0.2,   // 0.2% monthly (should be used as yearly is null)
          rebate_3_yearly: 0,      // 0% yearly (should be ignored)
          rebate_3_monthly: 0.1    // 0.1% monthly (should be ignored as yearly is 0)
        }
      ];

      // Mock database call
      mockDatabaseManager.getVisaMCORebates.mockResolvedValue(mockVisaMCORebates);

      // Execute calculation
      const result = await (rebateCalculator as any).calculateVisaMCORebates(testTransaction, mockVisaMCORebates);

      // Expected calculations according to COE-46:
      // Level 1: yearly (0.5%) has priority over monthly (0.3%) → 1000.00 × 0.5 / 100 = €5.00
      // Level 2: yearly is null → use monthly (0.2%) → 1000.00 × 0.2 / 100 = €2.00
      // Level 3: yearly is 0 → skip (0 is not > 0)

      expect(result).toHaveLength(2);
      
      // Rebate Level 1
      expect(result[0]).toMatchObject({
        transactionId: 'TXN_001',
        providerCustomerCode: 'testprovider#testprovider',
        productName: 'B2B Wallet - Test Product',
        rebateLevel: 1,
        rebatePercentage: 0.5,
        rebateAmount: 5.00,
        rebateAmountEUR: 5.00,
        calculationType: 'visa_mco'
      });

      // Rebate Level 2
      expect(result[1]).toMatchObject({
        transactionId: 'TXN_001',
        providerCustomerCode: 'testprovider#testprovider',
        productName: 'B2B Wallet - Test Product',
        rebateLevel: 2,
        rebatePercentage: 0.2,
        rebateAmount: 2.00,
        rebateAmountEUR: 2.00,
        calculationType: 'visa_mco'
      });

      console.log('✅ Visa & MCO Test Results:');
      console.log('Expected: Level 1 = €5.00 (0.5%), Level 2 = €2.00 (0.2%)');
      console.log('Actual  :', result.map(r => `Level ${r.rebateLevel} = €${r.rebateAmountEUR} (${r.rebatePercentage}%)`));
    });
  });

  describe('PartnerPay Calculations', () => {
    test('should calculate rebates with correct 4-way matching according to COE-46', async () => {
      const testTransaction: TransactionRecord = {
        transactionId: 'TXN_002',
        transactionCardNumber: '1234567890123456',
        transactionCurrency: 'EUR',
        providerCustomerCode: 'partnerpay#partnerpay',
        transactionType: 'Purchase',
        transactionCard: 'MASTERCARD',
        salesforceProductName: 'B2B Wallet - PartnerPay Product',
        fundingAccountName: 'PartnerPay Account',
        region: 'EU',
        regionMC: 'EU',
        transactionDate: new Date('2024-12-01'),
        binCardNumber: 654321, // First 6 digits according to COE-46
        transactionAmount: 1500.00,
        interchangeAmount: 30.00,
        interchangePercentage: 2.0,
        transactionAmountEUR: 1500.00,
        fxRate: 1.0,
        pkReference: 'PK_002',
        transactionMerchantCountry: 'FR',
        transactionMerchantCategoryCode: 4511,
        merchantName: 'Air Europa', // This should match partner_pay_airline
        transactionMerchantName: 'Air Europa Services'
      };

      const mockPartnerPayRebates = [
        {
          provider_customer_code: 'partnerpay#partnerpay',
          product_name: 'B2B Wallet - PartnerPay Product',
          partnerpay_bin: '654321', // First 6 digits - should match
          partner_pay_airline: 'Air Europa', // Must match raw transaction.merchantName for 4-key match
          rebate_1_yearly: 1.2,    // 1.2% yearly
          rebate_1_monthly: 0.8,   // 0.8% monthly (should be ignored)
          rebate_2_yearly: null,   // null yearly
          rebate_2_monthly: 0.6    // 0.6% monthly (should be used)
        }
      ];

      // Mock database calls
      mockDatabaseManager.getPartnerPayRebates.mockResolvedValue(mockPartnerPayRebates);
      mockDatabaseManager.getAirlinesMCC.mockResolvedValue([
        {
          mcc_code: '4511',
          airline_name: 'Air Europa',
          airline_code: 'UX'
        }
      ]);

      // Execute calculation
      const result = await (rebateCalculator as any).calculatePartnerPayRebates(testTransaction, mockPartnerPayRebates);

      // Expected calculations according to COE-46 line 195:
      // Matching: Provider ✅ + Product ✅ + BIN("654321") ✅ + Airline("Air Europa (UX)") ✅
      // Level 1: yearly (1.2%) has priority → 1500.00 × 1.2 / 100 = €18.00
      // Level 2: yearly is null → use monthly (0.6%) → 1500.00 × 0.6 / 100 = €9.00

      expect(result).toHaveLength(2);

      // Rebate Level 1
      expect(result[0]).toMatchObject({
        transactionId: 'TXN_002',
        providerCustomerCode: 'partnerpay#partnerpay',
        productName: 'B2B Wallet - PartnerPay Product',
        rebateLevel: 1,
        rebatePercentage: 1.2,
        rebateAmount: 18.00,
        rebateAmountEUR: 18.00,
        calculationType: 'partnerpay'
      });

      // Rebate Level 2
      expect(result[1]).toMatchObject({
        transactionId: 'TXN_002',
        providerCustomerCode: 'partnerpay#partnerpay',
        productName: 'B2B Wallet - PartnerPay Product',
        rebateLevel: 2,
        rebatePercentage: 0.6,
        rebateAmount: 9.00,
        rebateAmountEUR: 9.00,
        calculationType: 'partnerpay'
      });

      console.log('✅ PartnerPay Test Results:');
      console.log('Expected: Level 1 = €18.00 (1.2%), Level 2 = €9.00 (0.6%)');
      console.log('Actual  :', result.map(r => `Level ${r.rebateLevel} = €${r.rebateAmountEUR} (${r.rebatePercentage}%)`));
    });
  });

  describe('BIN Card Number Validation (COE-46 Line 51)', () => {
    test('should use first 6 digits of BIN card number, not last 6', async () => {
      const testTransaction: TransactionRecord = {
        transactionId: 'TXN_BIN_TEST',
        transactionCardNumber: '1234567890123456',
        transactionCurrency: 'EUR',
        providerCustomerCode: 'bintest#bintest',
        transactionType: 'Purchase',
        transactionCard: 'VISA',
        salesforceProductName: 'B2B Wallet - BIN Test',
        fundingAccountName: 'BIN Test Account',
        region: 'EU',
        regionMC: 'EU',
        transactionDate: new Date('2024-12-01'),
        binCardNumber: 123456789012, // Full BIN number
        transactionAmount: 500.00,
        interchangeAmount: 10.00,
        interchangePercentage: 2.0,
        transactionAmountEUR: 500.00,
        fxRate: 1.0,
        pkReference: 'PK_BIN',
        transactionMerchantCountry: 'DE',
        transactionMerchantCategoryCode: 4511,
        merchantName: 'Test Merchant',
        transactionMerchantName: 'Test Merchant Services'
      };

      const mockPartnerPayRebates = [
        {
          provider_customer_code: 'bintest#bintest',
          product_name: 'B2B Wallet - BIN Test',
          partnerpay_bin: '123456', // First 6 digits - should match
          partner_pay_airline: 'Test Merchant',
          rebate_1_yearly: 0.75
        },
        {
          provider_customer_code: 'bintest#bintest',
          product_name: 'B2B Wallet - BIN Test',
          partnerpay_bin: '789012', // Last 6 digits - should NOT match
          partner_pay_airline: 'Test Merchant',
          rebate_1_yearly: 999 // High value to catch if wrong BIN is used
        }
      ];

      mockDatabaseManager.getPartnerPayRebates.mockResolvedValue(mockPartnerPayRebates);
      mockDatabaseManager.getAirlinesMCC.mockResolvedValue([]);

      const result = await (rebateCalculator as any).calculatePartnerPayRebates(testTransaction, mockPartnerPayRebates);

      // Should match first record (123456) not second (789012)
      expect(result).toHaveLength(1);
      expect(result[0].rebatePercentage).toBe(0.75); // Not 999
      expect(result[0].rebateAmountEUR).toBe(3.75); // 500 × 0.75 / 100

      console.log('✅ BIN Test Results:');
      console.log('Transaction BIN: 123456789012');
      console.log('First 6 digits: 123456 (should match)');
      console.log('Last 6 digits: 789012 (should NOT match)');
      console.log('Matched rebate percentage:', result[0].rebatePercentage, '% (expected: 0.75%, NOT 999%)');
    });
  });

  describe('Mathematical Precision', () => {
    test('should handle decimal calculations and rounding correctly', async () => {
      const testTransaction: TransactionRecord = {
        transactionId: 'TXN_PRECISION',
        transactionCardNumber: '1234567890123456',
        transactionCurrency: 'EUR',
        providerCustomerCode: 'precision#precision',
        transactionType: 'Purchase',
        transactionCard: 'VISA',
        salesforceProductName: 'B2B Wallet - Precision Test',
        fundingAccountName: 'Precision Account',
        region: 'EU',
        regionMC: 'EU',
        transactionDate: new Date('2024-12-01'),
        binCardNumber: 111111,
        transactionAmount: 333.33, // Tricky amount for precision
        interchangeAmount: 6.67,
        interchangePercentage: 2.0,
        transactionAmountEUR: 333.33,
        fxRate: 1.0,
        pkReference: 'PK_PRECISION',
        transactionMerchantCountry: 'IT',
        transactionMerchantCategoryCode: 4511,
        merchantName: 'Precision Merchant',
        transactionMerchantName: 'Precision Merchant Services'
      };

      const mockVisaMCORebates = [
        {
          provider_customer_code: 'precision#precision',
          product_name: 'B2B Wallet - Precision Test',
          rebate_1_yearly: 1.123 // Tricky percentage for precision
        }
      ];

      mockDatabaseManager.getVisaMCORebates.mockResolvedValue(mockVisaMCORebates);

      const result = await (rebateCalculator as any).calculateVisaMCORebates(testTransaction, mockVisaMCORebates);

      // Manual calculation: 333.33 × 1.123 / 100 = 3.743259
      // Should be rounded to 2 decimals: 3.74
      const expectedAmount = Math.round((333.33 * 1.123 / 100) * 100) / 100;

      expect(result).toHaveLength(1);
      expect(result[0].rebateAmountEUR).toBe(expectedAmount);
      expect(result[0].rebateAmountEUR).toBe(3.74);

      console.log('✅ Precision Test Results:');
      console.log('Amount: €333.33 × 1.123% = €3.743259');
      console.log('Rounded: €3.74');
      console.log('Actual:', `€${result[0].rebateAmountEUR}`);
    });
  });
});
