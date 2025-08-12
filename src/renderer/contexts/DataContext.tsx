import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  TransactionRecord, 
  CalculatedRebate, 
  ProcessingResult, 
  DataContextType 
} from '../../shared/types';

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [transactionData, setTransactionData] = useState<TransactionRecord[]>([]);
  const [calculatedRebates, setCalculatedRebates] = useState<CalculatedRebate[]>([]);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [existingDataSummary, setExistingDataSummary] = useState<{
    transactionCount: number;
    rebateCount: number;
    totalAmountEUR: number;
    lastProcessed?: Date;
  } | null>(null);

  const updateTransactionData = (data: TransactionRecord[]): void => {
    setTransactionData(data);
  };

  const updateCalculatedRebates = (rebates: CalculatedRebate[]): void => {
    setCalculatedRebates(rebates);
  };

  const updateProcessingResult = (result: ProcessingResult): void => {
    setProcessingResult(result);
  };

  const clearData = (): void => {
    setTransactionData([]);
    setCalculatedRebates([]);
    setProcessingResult(null);
    setError(null);
    setHasExistingData(false);
    setExistingDataSummary(null);
  };

  const checkExistingData = async (): Promise<void> => {
    try {
      console.log('[DataContext] Checking for existing data...');
      
      // Get metadata about calculated rebates
      const metadata = await window.electronAPI.db.getCalculatedRebatesMetadata();
      const config = await window.electronAPI.db.getConfiguration();
      
      if (metadata && metadata.totalRebates > 0) {
        setHasExistingData(true);
        
        // Calculate summary from metadata
        const summaryStr = localStorage.getItem('calculationSummary');
        let totalAmountEUR = 0;
        if (summaryStr) {
          try {
            const summary = JSON.parse(summaryStr);
            totalAmountEUR = summary.totalAmount || 0;
          } catch (e) {
            console.error('Error parsing calculation summary:', e);
          }
        }
        
        setExistingDataSummary({
          transactionCount: metadata.totalRebates,
          rebateCount: metadata.totalRebates,
          totalAmountEUR: totalAmountEUR,
          lastProcessed: config?.created_at ? new Date(config.created_at) : undefined
        });
        
        console.log('[DataContext] Found existing data:', {
          rebates: metadata.totalRebates,
          config: config
        });
      } else {
        setHasExistingData(false);
        setExistingDataSummary(null);
      }
    } catch (err) {
      console.error('[DataContext] Error checking existing data:', err);
      setHasExistingData(false);
      setExistingDataSummary(null);
    }
  };

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Load transaction data and calculated rebates separately
      console.log('Loading transaction data...');
      const transactions = await window.electronAPI.db.getTransactionData();
      console.log('Loading calculated rebates...');
      const rebates = await window.electronAPI.db.getCalculatedRebates();
      
      console.log(`Loaded ${transactions.length} transactions and ${rebates.length} calculated rebates`);
      
      setTransactionData(transactions || []);
      setCalculatedRebates(rebates || []);
      
      // Create a processing result from the loaded data
      if (rebates && rebates.length > 0) {
        const totalRebateAmountEUR = rebates.reduce((sum, r) => sum + (r.rebateAmountEUR || 0), 0);
        const totalRebateAmount = rebates.reduce((sum, r) => sum + (r.rebateAmount || 0), 0);
        
        const processingResult: ProcessingResult = {
          success: true,
          transactionsProcessed: transactions.length,
          rebatesCalculated: rebates.length,
          errors: [],
          warnings: [],
          processingTime: 0,
          summary: {
            totalTransactions: transactions.length,
            totalRebateAmount: totalRebateAmount,
            totalRebateAmountEUR: totalRebateAmountEUR,
            byCalculationType: {},
            byProvider: {}
          }
        };
        setProcessingResult(processingResult);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const processRebates = async (config: { folderPath: string; year: number; month: number }): Promise<ProcessingResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Process files (load data from Excel files)
      console.log('Processing files...');
      const fileResult = await window.electronAPI.file.processFiles(config);
      
      if (!fileResult.success) {
        const result: ProcessingResult = {
          success: false,
          transactionsProcessed: 0,
          rebatesCalculated: 0,
          errors: fileResult.errors || ['Failed to process files'],
          warnings: fileResult.warnings || [],
          processingTime: fileResult.processingTime || 0,
          summary: {
            totalTransactions: 0,
            totalRebateAmount: 0,
            totalRebateAmountEUR: 0,
            byCalculationType: {},
            byProvider: {}
          }
        };
        setProcessingResult(result);
        return result;
      }

      // Step 2: Calculate rebates
      console.log('Calculating rebates...');
      const rebateResult = await window.electronAPI.rebate.calculate(config);
      
      // Step 3: Load updated data
      await loadData();
      
      // Update processing result
      setProcessingResult(rebateResult);
      
      return rebateResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process rebates';
      setError(errorMessage);
      console.error('Error processing rebates:', err);
      
      const failedResult: ProcessingResult = {
        success: false,
        transactionsProcessed: 0,
        rebatesCalculated: 0,
        errors: [errorMessage],
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
      
      setProcessingResult(failedResult);
      return failedResult;
    } finally {
      setIsLoading(false);
    }
  };

  // Check for existing data on mount
  useEffect(() => {
    checkExistingData();
  }, []);

  const value: DataContextType = {
    transactionData,
    calculatedRebates,
    processingResult,
    setTransactionData: updateTransactionData,
    setCalculatedRebates: updateCalculatedRebates,
    setProcessingResult: updateProcessingResult,
    clearData,
    loadData,
    processRebates,
    isLoading,
    error,
    hasExistingData,
    existingDataSummary,
    checkExistingData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};