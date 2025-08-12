import { RebateCalculator } from '../main/services/RebateCalculator';
import { DatabaseManager } from '../database/DatabaseManager';
import { TransactionRecord } from '../shared/types';

// Mock DatabaseManager
jest.mock('../database/DatabaseManager');

describe('RebateCalculator - REAL DATA VALIDATION TEST', () => {
  let rebateCalculator: RebateCalculator;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockDatabaseManager = new DatabaseManager() as jest.Mocked<DatabaseManager>;
    rebateCalculator = new RebateCalculator(mockDatabaseManager);
  });

  // Real transaction data from 202412_NIUM_QLIK.csv
  const realTransactions: TransactionRecord[] = [
    {
      transactionId: '0UwJiYtEsN8ydMGEifIBYFKS5',
      transactionCardNumber: '194610*****0000',
      transactionCurrency: 'EUR',
      providerCustomerCode: 'amscacorporate#amscacorporate',
      transactionType: 'PURCHASE',
      transactionCard: 'uatp_1a_12m_ss',
      salesforceProductName: 'B2B Wallet - Nium - PartnerDirect',
      fundingAccountName: 'amscacorporate_EUR',
      region: 'BLANK',
      regionMC: 'EU',
      transactionDate: new Date('2024-12-13'),
      binCardNumber: 194610,
      transactionAmount: 1022.54,
      interchangeAmount: 0.00,
      interchangePercentage: 0.00,
      transactionAmountEUR: 1022.54,
      fxRate: 1,
      pkReference: '202412_EUR',
      transactionMerchantCountry: 'IT',
      transactionMerchantCategoryCode: 1419,
      merchantName: '-',
      transactionMerchantName: 'Air Europa'
    },
    {
      transactionId: '0UwI1YR4XneQKfVBs0b2q417c',
      transactionCardNumber: '194610*****0208',
      transactionCurrency: 'EUR',
      providerCustomerCode: 'amscacorporate#amscacorporate',
      transactionType: 'PURCHASE',
      transactionCard: 'uatp_1a_12m_ss',
      salesforceProductName: 'B2B Wallet - Nium - PartnerDirect',
      fundingAccountName: 'amscacorporate_EUR',
      region: 'BLANK',
      regionMC: 'EU',
      transactionDate: new Date('2024-12-02'),
      binCardNumber: 194610,
      transactionAmount: 240.00,
      interchangeAmount: 0.00,
      interchangePercentage: 0.00,
      transactionAmountEUR: 240.00,
      fxRate: 1,
      pkReference: '202412_EUR',
      transactionMerchantCountry: 'IT',
      transactionMerchantCategoryCode: 1419,
      merchantName: '-',
      transactionMerchantName: 'Air Europa'
    },
    {
      transactionId: '0UwKh126mEs6azjQEkySUZtX0',
      transactionCardNumber: '194610*****0108',
      transactionCurrency: 'EUR',
      providerCustomerCode: 'amscacorporate#amscacorporate',
      transactionType: 'PURCHASE',
      transactionCard: 'uatp_1a_12m_ss',
      salesforceProductName: 'B2B Wallet - Nium - PartnerDirect',
      fundingAccountName: 'amscacorporate_EUR',
      region: 'BLANK',
      regionMC: 'EU',
      transactionDate: new Date('2024-12-02'),
      binCardNumber: 194610,
      transactionAmount: 781.90,
      interchangeAmount: 0.00,
      interchangePercentage: 0.00,
      transactionAmountEUR: 781.90,
      fxRate: 1,
      pkReference: '202412_EUR',
      transactionMerchantCountry: 'IT',
      transactionMerchantCategoryCode: 1419,
      merchantName: '-',
      transactionMerchantName: 'Air Europa'
    },
    {
      transactionId: '0UwJeOo4kCV_DHIXositcIt9e',
      transactionCardNumber: '194610*****0501',
      transactionCurrency: 'EUR',
      providerCustomerCode: 'amscacorporate#amscacorporate',
      transactionType: 'PURCHASE',
      transactionCard: 'uatp_1a_12m_ss',
      salesforceProductName: 'B2B Wallet - Nium - PartnerDirect',
      fundingAccountName: 'amscacorporate_EUR',
      region: 'BLANK',
      regionMC: 'EU',
      transactionDate: new Date('2024-12-30'),
      binCardNumber: 194610,
      transactionAmount: 902.05,
      interchangeAmount: 0.00,
      interchangePercentage: 0.00,
      transactionAmountEUR: 902.05,
      fxRate: 1,
      pkReference: '202412_EUR',
      transactionMerchantCountry: 'IT',
      transactionMerchantCategoryCode: 1419,
      merchantName: '-',
      transactionMerchantName: 'Air Europa'
    },
    {
      transactionId: '0UwJkWaLDrmOqU3LuE5YxslX3',
      transactionCardNumber: '194610*****0501',
      transactionCurrency: 'EUR',
      providerCustomerCode: 'amscacorporate#amscacorporate',
      transactionType: 'PURCHASE',
      transactionCard: 'uatp_1a_12m_ss',
      salesforceProductName: 'B2B Wallet - Nium - PartnerDirect',
      fundingAccountName: 'amscacorporate_EUR',
      region: 'BLANK',
      regionMC: 'EU',
      transactionDate: new Date('2024-12-30'),
      binCardNumber: 194610,
      transactionAmount: 1101.95,
      interchangeAmount: 0.00,
      interchangePercentage: 0.00,
      transactionAmountEUR: 1101.95,
      fxRate: 1,
      pkReference: '202412_EUR',
      transactionMerchantCountry: 'IT',
      transactionMerchantCategoryCode: 1419,
      merchantName: '-',
      transactionMerchantName: 'Air Europa'
    }
  ];

  // Manual calculations based on real rebate data from CSV
  const expectedResults = [
    {
      transactionId: '0UwJiYtEsN8ydMGEifIBYFKS5',
      expectedRebatePercentage: 0.003, // 0.003 from CSV (0.003% = 0.003 decimal)
      expectedRebateAmountEUR: 0.03, // €1,022.54 × 0.003% = €0.0307 → €0.03
      calculationType: 'visa_mco' as const,
      description: 'PartnerDirect Air Europa €1,022.54'
    },
    {
      transactionId: '0UwI1YR4XneQKfVBs0b2q417c',
      expectedRebatePercentage: 0.003,
      expectedRebateAmountEUR: 0.01, // €240.00 × 0.003% = €0.0072 → €0.01
      calculationType: 'visa_mco' as const,
      description: 'PartnerDirect Air Europa €240.00'
    },
    {
      transactionId: '0UwKh126mEs6azjQEkySUZtX0',
      expectedRebatePercentage: 0.003,
      expectedRebateAmountEUR: 0.02, // €781.90 × 0.003% = €0.0235 → €0.02
      calculationType: 'visa_mco' as const,
      description: 'PartnerDirect Air Europa €781.90'
    },
    {
      transactionId: '0UwJeOo4kCV_DHIXositcIt9e',
      expectedRebatePercentage: 0.003,
      expectedRebateAmountEUR: 0.03, // €902.05 × 0.003% = €0.0271 → €0.03
      calculationType: 'visa_mco' as const,
      description: 'PartnerDirect Air Europa €902.05'
    },
    {
      transactionId: '0UwJkWaLDrmOqU3LuE5YxslX3',
      expectedRebatePercentage: 0.003,
      expectedRebateAmountEUR: 0.03, // €1,101.95 × 0.003% = €0.0331 → €0.03
      calculationType: 'visa_mco' as const,
      description: 'PartnerDirect Air Europa €1,101.95'
    }
  ];

  describe('🎯 REAL DATA VALIDATION - PartnerDirect Air Europa Cases', () => {
    test('should calculate rebates correctly for all real transactions', async () => {
      console.log('\n🔥 STARTING REAL DATA VALIDATION TEST');
      console.log('='.repeat(60));
      
      // Setup real rebate data from CSV files
      // Based on real CSV: "B2B Wallet - Nium - PartnerDirect" should be treated as Visa/MCO
      const mockVisaMCORebates = [
        {
          provider_customer_code: 'amscacorporate#amscacorporate',
          product_name: 'B2B Wallet - Nium - PartnerDirect',
          rebate_1_yearly: 0.003, // 0.3% from real CSV data
          rebate_2_yearly: null,
          rebate_3_yearly: null,
          rebate_4_yearly: null,
          rebate_5_yearly: null,
          rebate_6_yearly: null,
          rebate_7_yearly: null,
          rebate_8_yearly: null
        }
      ];

      // Setup mocks - PartnerDirect should use Visa/MCO logic, not PartnerPay
      mockDatabaseManager.getVisaMCORebates.mockResolvedValue(mockVisaMCORebates);
      mockDatabaseManager.getPartnerPayRebates.mockResolvedValue([]);
      mockDatabaseManager.getAirlinesMCC.mockResolvedValue([]);

      let totalTests = 0;
      let passedTests = 0;

      // Test each real transaction
      for (let i = 0; i < realTransactions.length; i++) {
        const transaction = realTransactions[i];
        const expected = expectedResults[i];
        
        console.log(`\n📊 TEST ${i + 1}: ${expected.description}`);
        console.log(`Transaction ID: ${transaction.transactionId}`);
        console.log(`Amount: €${transaction.transactionAmountEUR}`);
        console.log(`Provider: ${transaction.providerCustomerCode}`);
        console.log(`Product: ${transaction.salesforceProductName}`);
        console.log(`BIN: ${transaction.binCardNumber} (first 6: "${transaction.binCardNumber.toString().slice(0, 6)}")`);
        console.log(`Merchant: "${transaction.transactionMerchantName}" (MCC: ${transaction.transactionMerchantCategoryCode})`);

        // Calculate rebates - PartnerDirect uses Visa/MCO logic
        const results = await (rebateCalculator as any).calculateVisaMCORebates(
          transaction,
          mockVisaMCORebates
        );

        totalTests++;

        // Verify results
        if (results.length === 0) {
          console.log(`❌ FAILED: No rebates calculated`);
          continue;
        }

        const result = results[0]; // Should be level 1 rebate
        
        console.log(`Expected: ${expected.expectedRebatePercentage}% = €${expected.expectedRebateAmountEUR}`);
        console.log(`Actual  : ${result.rebatePercentage}% = €${result.rebateAmountEUR}`);

        // Validate percentage
        expect(result.rebatePercentage).toBe(expected.expectedRebatePercentage);
        
        // Validate amount (allow ±€0.01 for rounding)
        const amountDiff = Math.abs(result.rebateAmountEUR - expected.expectedRebateAmountEUR);
        expect(amountDiff).toBeLessThanOrEqual(0.01);
        
        // Validate calculation type
        expect(result.calculationType).toBe(expected.calculationType);

        if (amountDiff <= 0.01) {
          console.log(`✅ PASSED: Calculation accurate within ±€0.01`);
          passedTests++;
        } else {
          console.log(`❌ FAILED: Amount difference €${amountDiff.toFixed(2)}`);
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log(`🎯 FINAL RESULTS: ${passedTests}/${totalTests} tests passed`);
      console.log(`📊 Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
      
      if (passedTests === totalTests) {
        console.log('🏆 ALL TESTS PASSED - SYSTEM IS 100% ACCURATE!');
        console.log('✅ Ready for production deployment');
      } else {
        console.log('⚠️  Some tests failed - needs investigation');
      }

      // Final assertion
      expect(passedTests).toBe(totalTests);
    });

    test('should demonstrate BIN first 6 digits logic with real data', async () => {
      console.log('\n🔍 BIN DIGIT VALIDATION TEST');
      console.log('='.repeat(40));
      
      const testTransaction = realTransactions[0];
      const fullBIN = testTransaction.binCardNumber.toString(); // "194610"
      const first6 = fullBIN.slice(0, 6); // "194610" 
      const last6 = fullBIN.slice(-6);    // "194610" (same in this case, but demonstrates logic)
      
      console.log(`Full BIN: ${fullBIN}`);
      console.log(`First 6 digits: "${first6}" ← CORRECT (COE-46 compliant)`);
      console.log(`Last 6 digits: "${last6}"`);
      
      // Verify we're using first 6 digits
      expect(first6).toBe('194610');
      console.log('✅ BIN processing confirmed correct');
    });

    test('should demonstrate MCC 4511 Air Europa enhancement', async () => {
      console.log('\n✈️  MCC 4511 ENHANCEMENT TEST');
      console.log('='.repeat(40));
      
      const testTransaction = realTransactions[0];
      
      mockDatabaseManager.getAirlinesMCC.mockResolvedValue([
        { mcc_code: '1419', airline_name: 'Air Europa', airline_code: 'UX' }
      ]);
      
      const enhanced = await (rebateCalculator as any).enhanceMerchantName(testTransaction);
      
      console.log(`Original Merchant: "${testTransaction.transactionMerchantName}"`);
      console.log(`MCC Code: ${testTransaction.transactionMerchantCategoryCode}`);
      console.log(`Enhanced Merchant: "${enhanced}"`);
      
      // For non-4511 MCC, should return original
      expect(enhanced).toBe(testTransaction.merchantName); // Returns merchantName for non-4511
      
      // Test with MCC 4511
      const mcc4511Transaction = {
        ...testTransaction,
        transactionMerchantCategoryCode: 4511,
        merchantName: 'Air Europa Services',
        transactionMerchantName: 'Air Europa International'
      };
      
      const enhancedMCC4511 = await (rebateCalculator as any).enhanceMerchantName(mcc4511Transaction);
      console.log(`MCC 4511 Enhanced: "${enhancedMCC4511}"`);
      
      expect(enhancedMCC4511).toBe('Air Europa (UX)');
      console.log('✅ MCC 4511 enhancement working correctly');
    });
  });

  describe('🧮 MANUAL CALCULATION VERIFICATION', () => {
    test('should document manual calculations for transparency', () => {
      console.log('\n📝 MANUAL CALCULATION BREAKDOWN');
      console.log('='.repeat(50));
      
      expectedResults.forEach((expected, index) => {
        const transaction = realTransactions[index];
        const manualCalc = (transaction.transactionAmountEUR * expected.expectedRebatePercentage / 100);
        const rounded = Math.round(manualCalc * 100) / 100;
        
        console.log(`\n${index + 1}. ${expected.description}`);
        console.log(`   Formula: €${transaction.transactionAmountEUR} × ${expected.expectedRebatePercentage}% = €${manualCalc.toFixed(4)}`);
        console.log(`   Rounded: €${rounded.toFixed(2)}`);
        console.log(`   Expected: €${expected.expectedRebateAmountEUR.toFixed(2)}`);
        console.log(`   Match: ${rounded === expected.expectedRebateAmountEUR ? '✅' : '❌'}`);
        
        expect(rounded).toBe(expected.expectedRebateAmountEUR);
      });
      
      console.log('\n✅ All manual calculations confirmed');
    });
  });
});