import { RebateCalculator } from './services/RebateCalculator';
import { ValidationHelper } from './services/ValidationHelper';
import { DatabaseManager } from '../database/DatabaseManager';
import { FileProcessor } from './services/FileProcessor';
import * as path from 'path';
import * as fs from 'fs';

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const [key, inlineVal] = token.replace(/^--/, '').split('=');
      if (inlineVal !== undefined) {
        args[key] = inlineVal;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[key] = argv[++i];
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

async function runValidation() {
  console.log('=== REBATE CALCULATION VALIDATION ===\n');

  const argv = parseArgs(process.argv.slice(2));
  const folderPath = argv.folderPath || argv.folder || process.cwd();
  const year = parseInt(argv.year || '', 10) || new Date().getFullYear();
  const month = parseInt(argv.month || '', 10) || new Date().getMonth() + 1;
  const validationCsv = argv.validationCsv || argv.validation || '';

  console.log('Input parameters:');
  console.log(` - folderPath: ${folderPath}`);
  console.log(` - year      : ${year}`);
  console.log(` - month     : ${month}`);
  if (validationCsv) console.log(` - validationCsv: ${validationCsv}`);

  const databaseManager = new DatabaseManager();
  const fileProcessor = new FileProcessor(databaseManager);
  const rebateCalculator = new RebateCalculator(databaseManager);

  try {
    console.log('1. Initializing database...');
    await databaseManager.initialize();

    console.log('2. Processing transaction files...');
    const config = { folderPath, year, month };
    await fileProcessor.processFiles(config);

    console.log('3. Calculating rebates...');
    const result = await rebateCalculator.calculateRebates(config);
    console.log(`   - Transactions processed: ${result.transactionsProcessed}`);
    console.log(`   - Rebates calculated: ${result.rebatesCalculated}`);
    console.log(`   - Total rebate amount EUR: €${result.summary.totalRebateAmountEUR.toFixed(2)}`);

    console.log('4. Generating master table...');
    const masterTable = await rebateCalculator.generateMasterTable();
    console.log(`   - Master table rows: ${masterTable.length}`);

    if (validationCsv) {
      console.log('5. Loading validation data...');
      const validationData = await ValidationHelper.loadValidationData(validationCsv);
      console.log(`   - Validation rows loaded: ${validationData.length}`);

      console.log('6. Grouping calculated rebates...');
      const calculatedGroups = ValidationHelper.groupCalculatedRebates(masterTable);
      console.log(`   - Unique provider/product/merchant combinations: ${calculatedGroups.size}`);

      console.log('7. Running validation...');
      const validationResults = ValidationHelper.validateCalculations(calculatedGroups, validationData);

      const report = ValidationHelper.generateReport(validationResults);
      console.log(report);

      const reportPath = path.join(config.folderPath, 'validation_report.txt');
      fs.writeFileSync(reportPath, report);
      console.log(`\nValidation report saved to: ${reportPath}`);

      const detailsPath = path.join(config.folderPath, 'validation_details.json');
      fs.writeFileSync(detailsPath, JSON.stringify(validationResults, null, 2));
      console.log(`Detailed results saved to: ${detailsPath}`);
    } else {
      console.log('No validation CSV provided. Skipping validation steps (5-7).');
    }
  } catch (error) {
    console.error('Error during validation:', error);
  } finally {
    await databaseManager.close();
  }
}

// Run validation
runValidation().catch(console.error);
