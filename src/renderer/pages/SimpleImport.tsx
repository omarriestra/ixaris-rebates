import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Check, AlertCircle, Calculator } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNotifications } from '../contexts/NotificationContext';
import { useData } from '../contexts/DataContext';
import { useProgress } from '../contexts/ProgressContext';

interface FileStatus {
  fileName: string | null;
  rowCount: number;
  loaded: boolean;
  data: any[] | null;
}

interface ImportState {
  transactions: FileStatus;
  visaMCOMonthly: FileStatus;
  visaMCOYearly: FileStatus;
  partnerPayMonthly: FileStatus;
  partnerPayYearly: FileStatus;
  airlinesMCC: FileStatus;
  regionCountry: FileStatus;
  voyagePrive: FileStatus;
  billingMaterials: FileStatus;
  sapBPCodes: FileStatus;
}

const initialFileStatus: FileStatus = {
  fileName: null,
  rowCount: 0,
  loaded: false,
  data: null
};

export const SimpleImport: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { setTransactionData, setCalculatedRebates, processRebates, hasExistingData, existingDataSummary } = useData();
  const { setProgress, clearProgress } = useProgress();
  
  const [importState, setImportState] = useState<ImportState>({
    transactions: { ...initialFileStatus },
    visaMCOMonthly: { ...initialFileStatus },
    visaMCOYearly: { ...initialFileStatus },
    partnerPayMonthly: { ...initialFileStatus },
    partnerPayYearly: { ...initialFileStatus },
    airlinesMCC: { ...initialFileStatus },
    regionCountry: { ...initialFileStatus },
    voyagePrive: { ...initialFileStatus },
    billingMaterials: { ...initialFileStatus },
    sapBPCodes: { ...initialFileStatus }
  });
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
  }, []);

  // Save state to localStorage whenever importState changes
  useEffect(() => {
    saveStateToLocalStorage();
  }, [importState]);

  const loadPersistedState = () => {
    try {
      const savedState = localStorage.getItem('importState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        console.log('[SimpleImport] Loading persisted state:', parsedState);
        setImportState(parsedState);
        
        // Show notification about loaded state
        const loadedFiles = Object.values(parsedState).filter(file => file.loaded).length;
        if (loadedFiles > 0) {
          addNotification({
            type: 'info',
            title: 'Session Restored',
            message: `Found ${loadedFiles} previously imported files in this session`
          });
        }
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
  };

  const saveStateToLocalStorage = () => {
    try {
      localStorage.setItem('importState', JSON.stringify(importState));
    } catch (error) {
      console.error('Error saving state to localStorage:', error);
    }
  };

  const clearPersistedState = () => {
    localStorage.removeItem('importState');
    localStorage.removeItem('calculationSummary');
    setImportState({
      transactions: { ...initialFileStatus },
      visaMCOMonthly: { ...initialFileStatus },
      visaMCOYearly: { ...initialFileStatus },
      partnerPayMonthly: { ...initialFileStatus },
      partnerPayYearly: { ...initialFileStatus },
      airlinesMCC: { ...initialFileStatus },
      regionCountry: { ...initialFileStatus },
      voyagePrive: { ...initialFileStatus },
      billingMaterials: { ...initialFileStatus },
      sapBPCodes: { ...initialFileStatus }
    });
    addNotification({
      type: 'success',
      title: 'Session Cleared',
      message: 'All imported files and calculations have been reset'
    });
  };

  const handleFileSelect = async (fileType: keyof ImportState) => {
    try {
      const filePath = await window.electronAPI.csvSelectFile(
        `Select ${fileType} CSV file`,
        ['csv']
      );
      
      if (!filePath) return;
      
      // Use the SAME CsvImporter that works in our debug test
      let importResult;
      
      console.log(`[SimpleImport] Importing ${fileType} using CsvImporter (not manual parsing)`);
      
      switch(fileType) {
        case 'transactions':
          importResult = await window.electronAPI.csvImportTransactions(filePath);
          break;
        case 'visaMCOMonthly':
          importResult = await window.electronAPI.csvImportVisaMCORebates(filePath, false);
          break;
        case 'visaMCOYearly':
          importResult = await window.electronAPI.csvImportVisaMCORebates(filePath, true);
          break;
        case 'partnerPayMonthly':
          importResult = await window.electronAPI.csvImportPartnerPayRebates(filePath, false);
          break;
        case 'partnerPayYearly':
          importResult = await window.electronAPI.csvImportPartnerPayRebates(filePath, true);
          break;
        case 'airlinesMCC':
          importResult = await window.electronAPI.csvImportAirlinesMCC(filePath);
          break;
        case 'regionCountry':
          importResult = await window.electronAPI.csvImportRegionCountry(filePath);
          break;
        case 'voyagePrive':
          importResult = await window.electronAPI.csvImportVoyagePriveRebates(filePath);
          break;
        case 'billingMaterials':
          importResult = await window.electronAPI.csvImportBillingMaterials(filePath);
          break;
        case 'sapBPCodes':
          importResult = await window.electronAPI.csvImportSAPBPCodes(filePath);
          break;
        default:
          throw new Error(`Unknown file type: ${fileType}`);
      }
      
      if (!importResult.success) {
        throw new Error(importResult.errors?.join(', ') || 'Import failed');
      }
      
      console.log(`[SimpleImport] CsvImporter result: ${importResult.rowsImported} rows imported successfully`);
      
      // Update state with the successful import count
      setImportState(prev => ({
        ...prev,
        [fileType]: {
          fileName: filePath.split('/').pop() || filePath,
          rowCount: importResult.rowsImported,
          loaded: true,
          data: null // We don't need to store the data in state since it's in the DB
        }
      }));
      
      addNotification({
        type: 'success',
        title: 'File Loaded',
        message: `${fileType}: ${importResult.rowsImported} rows imported successfully`
      });
      
    } catch (error) {
      console.error('Error loading file:', error);
      addNotification({
        type: 'error',
        title: 'Import Error',
        message: `Failed to load ${fileType} file: ${error.message}`
      });
    }
  };

  // Check if we can calculate with existing data or loaded files
  const canCalculate = () => {
    // Can calculate if files are loaded in current session
    const filesLoaded = importState.transactions.loaded &&
                       importState.visaMCOMonthly.loaded &&
                       importState.visaMCOYearly.loaded;
    
    // OR if we have existing data from previous session
    return filesLoaded || hasExistingData;
  };

  // Check if specific file type has data (either loaded or existing)
  const hasFileData = (fileType: string) => {
    const isLoaded = importState[fileType as keyof ImportState]?.loaded || false;
    
    // For existing data, we assume all files were present
    // since we have calculated rebates
    if (hasExistingData && existingDataSummary) {
      // All files are considered "loaded" if we have existing calculations
      const allFiles = [
        'transactions', 'visaMCOMonthly', 'visaMCOYearly',
        'partnerPayMonthly', 'partnerPayYearly',
        'airlinesMCC', 'regionCountry', 'voyagePrive', 'billingMaterials', 'sapBPCodes'
      ];
      if (allFiles.includes(fileType)) {
        return true;
      }
    }
    
    return isLoaded;
  };

  const handleCalculateRebates = async () => {
    if (!canCalculate()) {
      addNotification({
        type: 'warning',
        title: 'Missing Data',
        message: 'Please import at least Transactions and Visa MCO files'
      });
      return;
    }
    
    setIsProcessing(true);
    
    // Show progress bar
    setProgress({
      stage: 'processing',
      percentage: 10,
      message: 'Initializing rebate calculation...',
      detail: 'Loading transaction data and rebate tables'
    });
    
    try {
      console.log('[SimpleImport] Starting rebate calculation using direct RebateCalculator (same as successful tests)');
      
      setProgress({
        stage: 'processing',
        percentage: 30,
        message: 'Calculating rebates...',
        detail: 'Processing transactions and applying rebate rates'
      });
      
      // Call RebateCalculator directly (same way that works in our debug test)
      // The data is already in the database from CsvImporter
      const result = await window.electronAPI.rebate.calculate({
        folderPath: 'imported_via_simple_import',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      });
      
      console.log(`[SimpleImport] RebateCalculator result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`[SimpleImport] Rebates calculated: ${result.rebatesCalculated}`);
      
      if (result.success) {
        setProgress({
          stage: 'complete',
          percentage: 100,
          message: 'Calculation complete!',
          detail: `Successfully calculated ${result.rebatesCalculated} rebates`
        });
        
        addNotification({
          type: 'success',
          title: 'Calculation Complete',
          message: `Calculated ${result.rebatesCalculated} rebates successfully`
        });
        
        // Don't load all 2M+ rebates into memory - just save the summary
        setCalculatedRebates([]); // Keep empty to avoid blocking browser
        
        // Save calculation summary for the results page
        const calculationSummary = {
          totalRebates: result.rebatesCalculated,
          totalAmount: result.totalRebateAmountEur,
          calculatedAt: new Date().toISOString(),
          processingTime: result.processingTime
        };
        localStorage.setItem('calculationSummary', JSON.stringify(calculationSummary));
        
        console.log(`[SimpleImport] Calculation complete: ${result.rebatesCalculated} rebates, €${result.totalRebateAmountEur?.toFixed(2)}`);
        
        // TODO: Re-enable auto-export after fixing performance issues
        // Auto-generate Excel export after calculation
        /* try {
          console.log('[SimpleImport] Starting automatic export generation...');
          
          // First get metadata to know how many chunks we have
          const metadata = await window.electronAPI.db.getCalculatedRebatesMetadata();
          
          if (metadata && metadata.totalRebates > 0) {
            console.log(`[SimpleImport] Processing ${metadata.totalRebates} rebates in ${metadata.chunks} chunks for export...`);
            
            // Group rebates by provider/product/merchant for summary export
            const groups = new Map<string, any[]>();
            let processedCount = 0;
            
            // Process each chunk
            for (let i = 0; i < metadata.chunks; i++) {
              const chunk = await window.electronAPI.db.getCalculatedRebatesChunk(i);
              
              // Process rebates in this chunk
              chunk.forEach(rebate => {
                const key = `${rebate.providerCustomerCode}|${rebate.productName}|${rebate.originalTransaction?.merchantName || ''}`;
                if (!groups.has(key)) {
                  groups.set(key, []);
                }
                groups.get(key)!.push(rebate);
              });
              
              processedCount += chunk.length;
              console.log(`[SimpleImport] Processed chunk ${i + 1}/${metadata.chunks} (${processedCount}/${metadata.totalRebates} rebates)`);
            }
            
            console.log(`[SimpleImport] Creating summary export data from ${groups.size} groups...`);
            
            // Create summary export data
            const exportData: any[] = [];
            let grandTotalAmount = 0;
            let grandTotalAmountEUR = 0;
            
            groups.forEach((rebates, key) => {
              const [provider, product, merchant] = key.split('|');
              
              // Sum all rebates in the group
              const totalAmount = rebates.reduce((sum, r) => sum + r.rebateAmount, 0);
              const totalAmountEUR = rebates.reduce((sum, r) => sum + r.rebateAmountEUR, 0);
              const totalTransactionAmount = rebates.reduce((sum, r) => sum + (r.originalTransaction?.transactionAmount || 0), 0);
              
              // Get rate from first level 1 rebate
              const level1Rebate = rebates.find(r => r.rebateLevel === 1);
              const rebate1Yearly = level1Rebate ? level1Rebate.rebatePercentage : null;
              const currency = rebates[0]?.originalTransaction?.transactionCurrency || 'EUR';
              
              exportData.push({
                'Provider Customer Name': provider,
                'Product Name': product,
                'Merchant Name': merchant || '',
                'Currency': currency,
                'Rebate 1 Yearly': rebate1Yearly !== null ? `${rebate1Yearly.toFixed(3)}%` : '',
                'Transaction Amount': totalTransactionAmount.toFixed(2),
                'Rebate Amount': totalAmount.toFixed(2),
                'Rebate Amount EUR': totalAmountEUR.toFixed(2)
              });
              
              grandTotalAmount += totalAmount;
              grandTotalAmountEUR += totalAmountEUR;
            });
            
            // Add grand total row
            exportData.push({
              'Provider Customer Name': 'Grand Total',
              'Product Name': '',
              'Merchant Name': '',
              'Currency': '',
              'Rebate 1 Yearly': '',
              'Transaction Amount': '',
              'Rebate Amount': grandTotalAmount.toFixed(2),
              'Rebate Amount EUR': grandTotalAmountEUR.toFixed(2)
            });
            
            // Export to Excel with file picker
            const exportedFilePath = await window.electronAPI.file.exportExcel({
              data: exportData,
              filename: `rebates_calculation_${new Date().toISOString().split('T')[0]}.xlsx`,
              sheetName: 'Rebates Summary'
            });
            
            console.log(`[SimpleImport] Successfully exported ${exportData.length - 1} grouped results plus grand total to: ${exportedFilePath}`);
            
            addNotification({
              type: 'success',
              title: 'Export Complete',
              message: `Excel file saved with ${groups.size} grouped rebate summaries`
            });
            
          }
        } catch (error) {
          console.error('Auto-export error:', error);
          // Don't fail the whole process, just show a notification
          if (!error.message?.includes('canceled by user')) {
            addNotification({
              type: 'warning',
              title: 'Auto-export Failed',
              message: 'Calculation succeeded, but automatic export failed. You can export manually from Results page.'
            });
          }
        } */
        
        // Navigate to results
        navigate('/results');
      } else {
        addNotification({
          type: 'error',
          title: 'Calculation Failed',
          message: result.errors?.join(', ') || 'Unknown error'
        });
      }
      
    } catch (error) {
      console.error('Error calculating rebates:', error);
      addNotification({
        type: 'error',
        title: 'Processing Error',
        message: `Failed to calculate rebates: ${error.message}`
      });
    } finally {
      setIsProcessing(false);
      // Clear progress bar after a short delay to show completion
      setTimeout(() => {
        clearProgress();
      }, 2000);
    }
  };

  const FileCard = ({ 
    title, 
    description, 
    fileType 
  }: { 
    title: string; 
    description: string; 
    fileType: keyof ImportState;
  }) => {
    const status = importState[fileType];
    const hasData = hasFileData(fileType);
    const isFromExistingData = hasData && !status.loaded && hasExistingData;
    
    return (
      <Card className={`${hasData ? 'border-green-500 bg-green-50' : ''} transition-colors`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">{title}</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
              
              {/* Show status for loaded files */}
              {status.loaded && (
                <div className="mt-3 flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">
                    {status.fileName} ({status.rowCount.toLocaleString()} rows)
                  </span>
                </div>
              )}
              
              {/* Show status for existing data */}
              {isFromExistingData && (
                <div className="mt-3 flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">
                    {title.replace(/[^a-zA-Z0-9]/g, '_')}.csv (loaded from database)
                  </span>
                </div>
              )}
            </div>
            
            <Button
              variant={status.loaded ? "outline" : "primary"}
              size="sm"
              onClick={() => handleFileSelect(fileType)}
              className="ml-4"
            >
              <Upload className="w-4 h-4 mr-2" />
              {status.loaded ? 'Replace' : 'Import'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      
      

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Import Data Files</h2>
        <p className="text-gray-600 mt-2">
          Upload your transaction and rebate data files to begin calculation.
        </p>
      </div>

      {/* Transaction Data */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Transaction Data
        </h2>
        <FileCard
          title="Transaction Data"
          description="Main file containing all transactions for the calculation period"
          fileType="transactions"
        />
      </div>

      {/* Rebate Tables */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Calculator className="w-5 h-5 mr-2" />
          Rebate Configuration
        </h2>
        <div className="grid gap-4">
          <FileCard
            title="Visa/MCO Monthly Rates"
            description="Monthly rebate rates for Visa and Mastercard transactions"
            fileType="visaMCOMonthly"
          />
          <FileCard
            title="Visa/MCO Yearly Rates"
            description="Yearly rebate rates for Visa and Mastercard transactions"
            fileType="visaMCOYearly"
          />
          <FileCard
            title="PartnerPay Monthly Rates"
            description="Monthly rates for PartnerPay transactions"
            fileType="partnerPayMonthly"
          />
          <FileCard
            title="PartnerPay Yearly Rates"
            description="Yearly rates for PartnerPay transactions"
            fileType="partnerPayYearly"
          />
        </div>
      </div>

      {/* Library Data (Optional) */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Additional Rules (Optional)
        </h2>
        <div className="grid gap-4">
          <FileCard
            title="Airlines MCC"
            description="Airline merchant category codes for special processing"
            fileType="airlinesMCC"
          />
          <FileCard
            title="Region Country"
            description="Regional and country mapping rules"
            fileType="regionCountry"
          />
          <FileCard
            title="Voyage Prive"
            description="Special rebate rules for Voyage Prive"
            fileType="voyagePrive"
          />
          <FileCard
            title="Billing Materials"
            description="SAP billing material codes"
            fileType="billingMaterials"
          />
          <FileCard
            title="SAP BP Codes"
            description="SAP business partner codes"
            fileType="sapBPCodes"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 -mx-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!canCalculate() && (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-amber-600">
                  Please upload all required files before calculating
                </span>
              </>
            )}
            {canCalculate() && hasExistingData && (
              <>
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600">
                  Ready to recalculate with existing data
                </span>
              </>
            )}
          </div>
          
          <Button
            size="lg"
            onClick={handleCalculateRebates}
            disabled={!canCalculate() || isProcessing}
            className="min-w-[200px]"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5 mr-2" />
                Calculate Rebates
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};