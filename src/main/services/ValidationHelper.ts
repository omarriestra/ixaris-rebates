import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface ValidationRow {
  providerCustomerName: string;
  productName: string;
  merchantNameNew: string;
  currency: string;
  rebate1Yearly: number;
  transactionAmount: number;
  rebateAmount: number;
  rebateAmountEUR: number;
}

export class ValidationHelper {
  /**
   * Load validation data from CSV file
   */
  static async loadValidationData(filePath: string): Promise<ValidationRow[]> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: false,
        skip_empty_lines: true,
        from_line: 2, // Skip header
        relax_column_count: true
      });

      const validationRows: ValidationRow[] = [];
      
      for (const record of records) {
        // Skip empty rows
        if (!record[0] || record[0].trim() === '') continue;
        
        const row: ValidationRow = {
          providerCustomerName: record[0] || '',
          productName: record[1] || '',
          merchantNameNew: record[2] || '',
          currency: record[3] || 'EUR',
          rebate1Yearly: this.parsePercentage(record[4]),
          transactionAmount: parseFloat(record[5]) || 0,
          rebateAmount: parseFloat(record[6]) || 0,
          rebateAmountEUR: parseFloat(record[7]) || 0
        };
        
        validationRows.push(row);
      }
      
      return validationRows;
    } catch (error) {
      console.error('Error loading validation data:', error);
      throw error;
    }
  }

  /**
   * Parse percentage value from string (handles "(en blanco)" and decimal values)
   */
  private static parsePercentage(value: string): number {
    if (!value || value.trim() === '' || value === '(en blanco)') {
      return 0;
    }
    return parseFloat(value) || 0;
  }

  /**
   * Validate calculated rebates against expected values
   */
  static validateCalculations(
    calculatedData: Map<string, { amount: number, amountEUR: number, count: number }>,
    validationData: ValidationRow[]
  ): { matches: number, mismatches: number, details: any[] } {
    let matches = 0;
    let mismatches = 0;
    const details: any[] = [];
    
    for (const validation of validationData) {
      const key = `${validation.providerCustomerName}|${validation.productName}|${validation.merchantNameNew}`;
      const calculated = calculatedData.get(key);
      
      if (!calculated) {
        console.log(`[ValidationHelper] No calculated data found for: ${key}`);
        mismatches++;
        details.push({
          key,
          status: 'MISSING',
          expected: validation.rebateAmountEUR,
          calculated: 0,
          difference: validation.rebateAmountEUR
        });
        continue;
      }
      
      // Compare rebate amounts (with tolerance for floating point)
      const tolerance = 0.01; // 1 cent tolerance
      const difference = Math.abs(calculated.amountEUR - validation.rebateAmountEUR);
      
      if (difference <= tolerance) {
        matches++;
        details.push({
          key,
          status: 'MATCH',
          expected: validation.rebateAmountEUR,
          calculated: calculated.amountEUR,
          difference: difference,
          transactionCount: calculated.count
        });
      } else {
        mismatches++;
        details.push({
          key,
          status: 'MISMATCH',
          expected: validation.rebateAmountEUR,
          calculated: calculated.amountEUR,
          difference: difference,
          transactionCount: calculated.count
        });
        
        console.log(`[ValidationHelper] Mismatch for ${key}:`);
        console.log(`  Expected: €${validation.rebateAmountEUR}`);
        console.log(`  Calculated: €${calculated.amountEUR}`);
        console.log(`  Difference: €${difference}`);
      }
    }
    
    return { matches, mismatches, details };
  }

  /**
   * Group calculated rebates by provider/product/merchant for comparison
   */
  static groupCalculatedRebates(masterTable: any[]): Map<string, { amount: number, amountEUR: number, count: number }> {
    const grouped = new Map<string, { amount: number, amountEUR: number, count: number }>();
    
    for (const row of masterTable) {
      // Only count rows with actual rebates
      if (!row.rebateAmountEUR1 || row.rebateAmountEUR1 === 0) continue;
      
      const key = `${row.providerCustomerCode}|${row.salesforceProductName}|${row.merchantNameNew}`;
      
      const existing = grouped.get(key) || { amount: 0, amountEUR: 0, count: 0 };
      existing.amount += row.rebateAmount1 || 0;
      existing.amountEUR += row.rebateAmountEUR1 || 0;
      existing.count += 1;
      
      grouped.set(key, existing);
    }
    
    return grouped;
  }

  /**
   * Generate validation report
   */
  static generateReport(validationResults: any): string {
    const { matches, mismatches, details } = validationResults;
    const total = matches + mismatches;
    const accuracy = total > 0 ? (matches / total * 100).toFixed(2) : '0';
    
    let report = `
=== REBATE CALCULATION VALIDATION REPORT ===

Summary:
- Total validations: ${total}
- Matches: ${matches}
- Mismatches: ${mismatches}
- Accuracy: ${accuracy}%

Detailed Results:
`;
    
    // Sort by status (mismatches first)
    const sortedDetails = details.sort((a: any, b: any) => {
      if (a.status === 'MISMATCH' && b.status !== 'MISMATCH') return -1;
      if (a.status !== 'MISMATCH' && b.status === 'MISMATCH') return 1;
      return b.difference - a.difference; // Then by difference amount
    });
    
    for (const detail of sortedDetails) {
      report += `\n${detail.status}: ${detail.key}`;
      report += `\n  Expected: €${detail.expected?.toFixed(2) || '0.00'}`;
      report += `\n  Calculated: €${detail.calculated?.toFixed(2) || '0.00'}`;
      report += `\n  Difference: €${detail.difference?.toFixed(2) || '0.00'}`;
      if (detail.transactionCount) {
        report += `\n  Transactions: ${detail.transactionCount}`;
      }
      report += '\n';
    }
    
    return report;
  }
}