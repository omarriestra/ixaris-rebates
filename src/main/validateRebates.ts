import { RebateCalculator } from './services/RebateCalculator';
import { ValidationHelper } from './services/ValidationHelper';
import { DatabaseManager } from '../database/DatabaseManager';
import { FileProcessor } from './services/FileProcessor';
import * as path from 'path';

async function runValidation() {
  console.log('=== REBATE CALCULATION VALIDATION ===\n');
  
  const databaseManager = new DatabaseManager();
  const fileProcessor = new FileProcessor(databaseManager);
  const rebateCalculator = new RebateCalculator(databaseManager);
  
  try {
    // Initialize database
    console.log('1. Initializing database...');
    await databaseManager.initialize();
    
    // Process files
    console.log('2. Processing transaction files...');
    const config = {
      folderPath: '/Users/omarriestra/Downloads/Data/CSV',
      year: 2024,
      month: 12
    };
    
    await fileProcessor.processFiles(config);
    
    // Calculate rebates
    console.log('3. Calculating rebates...');
    const result = await rebateCalculator.calculateRebates(config);
    console.log(`   - Transactions processed: ${result.transactionsProcessed}`);
    console.log(`   - Rebates calculated: ${result.rebatesCalculated}`);
    console.log(`   - Total rebate amount EUR: €${result.summary.totalRebateAmountEUR.toFixed(2)}`);
    
    // Generate master table
    console.log('4. Generating master table...');
    const masterTable = await rebateCalculator.generateMasterTable();
    console.log(`   - Master table rows: ${masterTable.length}`);
    
    // Load validation data
    console.log('5. Loading validation data...');
    const validationPath = '/Users/omarriestra/Downloads/Validation_Rebates.csv';
    const validationData = await ValidationHelper.loadValidationData(validationPath);
    console.log(`   - Validation rows loaded: ${validationData.length}`);
    
    // Group calculated data
    console.log('6. Grouping calculated rebates...');
    const calculatedGroups = ValidationHelper.groupCalculatedRebates(masterTable);
    console.log(`   - Unique provider/product/merchant combinations: ${calculatedGroups.size}`);
    
    // Validate
    console.log('7. Running validation...');
    const validationResults = ValidationHelper.validateCalculations(calculatedGroups, validationData);
    
    // Generate report
    const report = ValidationHelper.generateReport(validationResults);
    console.log(report);
    
    // Save report
    const reportPath = path.join(config.folderPath, 'validation_report.txt');
    const fs = require('fs');
    fs.writeFileSync(reportPath, report);
    console.log(`\nValidation report saved to: ${reportPath}`);
    
    // Also save detailed results as JSON
    const detailsPath = path.join(config.folderPath, 'validation_details.json');
    fs.writeFileSync(detailsPath, JSON.stringify(validationResults, null, 2));
    console.log(`Detailed results saved to: ${detailsPath}`);
    
  } catch (error) {
    console.error('Error during validation:', error);
  } finally {
    await databaseManager.close();
  }
}

// Run validation
runValidation().catch(console.error);