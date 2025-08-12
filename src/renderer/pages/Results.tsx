import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { CalculatedRebate, TableColumn } from '../../shared/types';

// Interface para datos agrupados como en Excel
interface GroupedRebateRow {
  id: string;
  providerCustomerName: string;
  productName: string;
  merchantNameNew?: string;
  currency: string;
  rebate1Yearly: number | null;
  transactionAmount: number;
  rebateAmount: number;
  rebateAmountEUR: number;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  originalRebates?: CalculatedRebate[];
}

// Función para obtener "Merchant Name New" (procesado con MCC 4511)
function getMerchantNameNew(rebate: CalculatedRebate): string {
  const originalTransaction = rebate.originalTransaction;
  if (!originalTransaction) return rebate.originalTransaction?.merchantName || '';
  
  // Si es MCC 4511, procesar casos especiales
  if (originalTransaction.transactionMerchantCategoryCode === 4511) {
    const merchantName = (originalTransaction.merchantName || '').toLowerCase();
    const transactionMerchantName = (originalTransaction.transactionMerchantName || '').toLowerCase();
    
    if (merchantName.includes('air europa') || transactionMerchantName.includes('air europa')) {
      return 'Air Europa (UX)';
    } else if (merchantName.includes('air greenland') || transactionMerchantName.includes('air greenland')) {
      return 'Air Greenland (GL)';
    } else if (merchantName.includes('latam') || transactionMerchantName.includes('latam')) {
      return 'LATAM Airlines Group';
    } else if (merchantName.includes('norwegian') || transactionMerchantName.includes('norwegian')) {
      return 'Norwegian (DY)';
    } else if (merchantName.includes('royal air maroc') || transactionMerchantName.includes('royal air maroc')) {
      return 'Royal Air Maroc';
    } else if (merchantName.includes('thai airways') || transactionMerchantName.includes('thai airways')) {
      return 'Thai Airways';
    } else if (merchantName.includes('turkish airlines') || transactionMerchantName.includes('turkish airlines')) {
      return 'Turkish Airlines';
    } else if (merchantName.includes('united airlines') || transactionMerchantName.includes('united airlines')) {
      return 'United Airlines';
    }
  }
  
  return originalTransaction.merchantName || '';
}

export const Results: React.FC = () => {
  const navigate = useNavigate();
  const { calculatedRebates, transactionData, processingResult, loadData, isLoading } = useData();
  const { addNotification } = useNotifications();
  
  // Load calculation summary from localStorage
  const [calculationSummary, setCalculationSummary] = useState<any>(null);
  const [showSummaryOnly, setShowSummaryOnly] = useState(true);
  
  // Filtros multi-select como en Excel
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGrouped, setShowGrouped] = useState(true); // Mostrar datos agrupados como Excel
  const [selectedRows, setSelectedRows] = useState<GroupedRebateRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // Más filas para ver datos agrupados
  const [isExporting, setIsExporting] = useState(false);

  // Load calculation summary on mount
  useEffect(() => {
    const summaryStr = localStorage.getItem('calculationSummary');
    if (summaryStr) {
      try {
        const summary = JSON.parse(summaryStr);
        console.log('[Results] Loaded calculation summary:', summary);
        setCalculationSummary(summary);
        setShowSummaryOnly(true); // Don't load all data by default
      } catch (e) {
        console.error('[Results] Error parsing calculation summary:', e);
        // If we can't parse summary but have rebates, show them
        if (calculatedRebates.length > 0) {
          setShowSummaryOnly(false);
        }
      }
    } else if (calculatedRebates.length === 0 && !isLoading) {
      console.log('[Results] No summary found, loading data...');
      loadData();
    }
  }, []);

  // Listen for export success/error notifications
  useEffect(() => {
    const handleExportSuccess = (data: any) => {
      console.log('[Results] Export success:', data);
      if (data && data.format) {
        addNotification({
          type: 'success',
          title: `${data.format} Export Successful`,
          message: `Exported ${data.recordCount} records to ${data.filePath}`,
          duration: 10000, // Show for 10 seconds
        });
      }
    };

    const handleExportError = (data: any) => {
      console.error('[Results] Export error:', data);
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: data?.error || 'Unknown error occurred during export',
        duration: 10000,
      });
    };

    // Add listeners
    window.electronAPI?.on('export:success', handleExportSuccess);
    window.electronAPI?.on('export:error', handleExportError);

    // Cleanup
    return () => {
      window.electronAPI?.off('export:success', handleExportSuccess);
      window.electronAPI?.off('export:error', handleExportError);
    };
  }, [addNotification]);

  // Get unique values for filters - only if we have data and not in summary mode
  const uniqueProviders = useMemo(() => {
    if (showSummaryOnly || calculatedRebates.length === 0) return [];
    const providers = Array.from(new Set(calculatedRebates.map(r => r.providerCustomerCode)));
    return providers.sort();
  }, [calculatedRebates, showSummaryOnly]);

  const uniqueProducts = useMemo(() => {
    if (showSummaryOnly || calculatedRebates.length === 0) return [];
    const products = Array.from(new Set(calculatedRebates.map(r => r.productName)));
    return products.sort();
  }, [calculatedRebates, showSummaryOnly]);

  const uniqueMerchants = useMemo(() => {
    if (showSummaryOnly || calculatedRebates.length === 0) return [];
    const merchants = Array.from(new Set(calculatedRebates.map(r => getMerchantNameNew(r))));
    return merchants.filter(m => m && m !== '').sort();
  }, [calculatedRebates, showSummaryOnly]);

  // Procesar datos agrupados como en Excel
  const groupedData = useMemo(() => {
    // Skip processing if we're in summary mode or have no data
    if (showSummaryOnly || calculatedRebates.length === 0) return [];
    
    if (!showGrouped) {
      // Vista plana (todos los rebates individuales)
      return calculatedRebates.map(rebate => ({
        id: rebate.transactionId + '_' + rebate.rebateLevel,
        providerCustomerName: rebate.providerCustomerCode,
        productName: rebate.productName,
        merchantNameNew: getMerchantNameNew(rebate),
        currency: rebate.originalTransaction?.transactionCurrency || 'EUR',
        rebate1Yearly: rebate.rebateLevel === 1 ? rebate.rebatePercentage : null,
        transactionAmount: rebate.originalTransaction?.transactionAmount || 0,
        rebateAmount: rebate.rebateAmount,
        rebateAmountEUR: rebate.rebateAmountEUR,
        originalRebates: [rebate]
      }));
    }

    // Vista agrupada como Excel
    const groups = new Map<string, CalculatedRebate[]>();
    
    // Agrupar por Provider + Product + Merchant
    calculatedRebates.forEach(rebate => {
      const merchantNameNew = getMerchantNameNew(rebate);
      const key = `${rebate.providerCustomerCode}|${rebate.productName}|${merchantNameNew}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(rebate);
    });

    const result: GroupedRebateRow[] = [];
    let grandTotalAmount = 0;
    let grandTotalAmountEUR = 0;

    // Procesar cada grupo
    for (const [key, rebates] of groups.entries()) {
      const [provider, product, merchant] = key.split('|');
      
      // Sumar todos los rebates del grupo
      const totalAmount = rebates.reduce((sum, r) => sum + r.rebateAmount, 0);
      const totalAmountEUR = rebates.reduce((sum, r) => sum + r.rebateAmountEUR, 0);
      const totalTransactionAmount = rebates.reduce((sum, r) => sum + (r.originalTransaction?.transactionAmount || 0), 0);
      
      // Obtener rate del primer rebate level 1 (como en tu Excel)
      const level1Rebate = rebates.find(r => r.rebateLevel === 1);
      const rebate1Yearly = level1Rebate ? level1Rebate.rebatePercentage : null;
      
      // Obtener currency del primer rebate
      const currency = rebates[0]?.originalTransaction?.transactionCurrency || 'EUR';

      result.push({
        id: key,
        providerCustomerName: provider,
        productName: product,
        merchantNameNew: merchant,
        currency,
        rebate1Yearly,
        transactionAmount: totalTransactionAmount,
        rebateAmount: totalAmount,
        rebateAmountEUR: totalAmountEUR,
        originalRebates: rebates
      });

      grandTotalAmount += totalAmount;
      grandTotalAmountEUR += totalAmountEUR;
    }

    // Agregar Grand Total
    result.push({
      id: 'grand-total',
      providerCustomerName: 'Grand Total',
      productName: '',
      merchantNameNew: '',
      currency: '',
      rebate1Yearly: null,
      transactionAmount: 0,
      rebateAmount: grandTotalAmount,
      rebateAmountEUR: grandTotalAmountEUR,
      isGrandTotal: true,
      originalRebates: calculatedRebates
    });

    return result;
  }, [calculatedRebates, showGrouped, showSummaryOnly]);

  // Filter data como en Excel
  const filteredData = useMemo(() => {
    // Skip processing if we're in summary mode
    if (showSummaryOnly) return [];
    
    let filtered = [...groupedData];

    // Apply multi-select filters
    if (selectedProviders.length > 0) {
      filtered = filtered.filter(row => 
        row.isGrandTotal || selectedProviders.includes(row.providerCustomerName)
      );
    }

    if (selectedProducts.length > 0) {
      filtered = filtered.filter(row => 
        row.isGrandTotal || selectedProducts.includes(row.productName)
      );
    }

    if (selectedMerchants.length > 0) {
      filtered = filtered.filter(row => 
        row.isGrandTotal || selectedMerchants.includes(row.merchantNameNew || '')
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        row.isGrandTotal ||
        row.providerCustomerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.merchantNameNew || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by rebate amount EUR (descending) by default
    filtered.sort((a, b) => {
      if (a.isGrandTotal) return 1; // Grand total always at the end
      if (b.isGrandTotal) return -1;
      return b.rebateAmountEUR - a.rebateAmountEUR;
    });

    return filtered;
  }, [groupedData, selectedProviders, selectedProducts, selectedMerchants, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Table columns for grouped data (like Excel)
  const columns: TableColumn<GroupedRebateRow>[] = [
    {
      key: 'providerCustomerName',
      header: 'Provider Customer Name',
      width: '250px',
      sortable: true,
      render: (value: string, row: GroupedRebateRow) => (
        <span className={`font-medium ${
          row.isGrandTotal ? 'text-blue-600 font-bold' : 'text-gray-900'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'productName',
      header: 'Product Name',
      width: '200px',
      sortable: true,
      render: (value: string, row: GroupedRebateRow) => (
        <span className={row.isGrandTotal ? 'text-blue-600 font-bold' : 'text-gray-700'}>
          {value}
        </span>
      )
    },
    {
      key: 'merchantNameNew',
      header: 'Merchant Name New',
      width: '180px',
      sortable: true,
      render: (value: string, row: GroupedRebateRow) => (
        <span className={row.isGrandTotal ? 'text-blue-600 font-bold' : 'text-gray-700'}>
          {value || '-'}
        </span>
      )
    },
    {
      key: 'currency',
      header: 'Currency',
      width: '80px',
      align: 'center',
      sortable: true,
      render: (value: string, row: GroupedRebateRow) => (
        <span className={row.isGrandTotal ? 'text-blue-600 font-bold' : 'text-gray-600'}>
          {value || '-'}
        </span>
      )
    },
    {
      key: 'rebate1Yearly',
      header: 'Rebate 1 Yearly',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (value: number | null, row: GroupedRebateRow) => (
        <span className={row.isGrandTotal ? 'text-blue-600 font-bold' : 'text-gray-900'}>
          {value !== null ? `${value.toFixed(3)}%` : '-'}
        </span>
      )
    },
    {
      key: 'transactionAmount',
      header: 'Transaction Amount',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (value: number, row: GroupedRebateRow) => {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: row.currency || 'EUR',
          minimumFractionDigits: 2,
        }).format(Math.abs(value));
        return (
          <span className={row.isGrandTotal ? 'text-blue-600 font-bold' : 'text-gray-900'}>
            {row.isGrandTotal ? '-' : formatted}
          </span>
        );
      }
    },
    {
      key: 'rebateAmount',
      header: 'Rebate Amount',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (value: number, row: GroupedRebateRow) => {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: row.currency || 'EUR',
          minimumFractionDigits: 2,
        }).format(Math.abs(value));
        return (
          <span className={row.isGrandTotal ? 'text-blue-600 font-bold text-lg' : 'text-gray-900'}>
            {formatted}
          </span>
        );
      }
    },
    {
      key: 'rebateAmountEUR',
      header: 'Rebate Amount EUR',
      width: '150px',
      align: 'right',
      sortable: true,
      render: (value: number, row: GroupedRebateRow) => {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2,
        }).format(Math.abs(value));
        return (
          <span className={row.isGrandTotal ? 'text-blue-600 font-bold text-lg' : 'text-green-600 font-medium'}>
            {formatted}
          </span>
        );
      }
    },
  ];

  // Export functions
  const handleExportCSV = async () => {
    const dataToExport = selectedRows.length > 0 ? selectedRows : filteredData.filter(row => !row.isGrandTotal);
    
    try {
      // Convert grouped data to export format
      const exportData = dataToExport.map(row => ({
        'Provider Customer Name': row.providerCustomerName,
        'Product Name': row.productName,
        'Merchant Name New': row.merchantNameNew || '',
        'Currency': row.currency,
        'Rebate 1 Yearly': row.rebate1Yearly || '',
        'Transaction Amount': row.transactionAmount,
        'Rebate Amount': row.rebateAmount,
        'Rebate Amount EUR': row.rebateAmountEUR
      }));
      
      await window.electronAPI.file.exportCSV({
        data: exportData,
        filename: `rebates_grouped_${new Date().toISOString().split('T')[0]}.csv`,
      });
      
      console.log('CSV exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleExportExcel = async () => {
    const dataToExport = selectedRows.length > 0 ? selectedRows : filteredData;
    
    try {
      // Convert grouped data to export format with Grand Total
      const exportData = dataToExport.map(row => ({
        'Provider Customer Name': row.providerCustomerName,
        'Product Name': row.productName,
        'Merchant Name New': row.merchantNameNew || '',
        'Currency': row.currency,
        'Rebate 1 Yearly': row.rebate1Yearly !== null ? `${row.rebate1Yearly.toFixed(3)}%` : '',
        'Transaction Amount': row.isGrandTotal ? '' : row.transactionAmount.toFixed(2),
        'Rebate Amount': row.rebateAmount.toFixed(2),
        'Rebate Amount EUR': row.rebateAmountEUR.toFixed(2)
      }));
      
      await window.electronAPI.file.exportExcel({
        data: exportData,
        filename: `rebates_grouped_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Rebates Summary'
      });
      
      console.log('Excel exported successfully');
    } catch (error) {
      console.error('Error exporting Excel:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedProviders([]);
    setSelectedProducts([]);
    setSelectedMerchants([]);
    setCurrentPage(1);
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    // If in summary mode, use the summary data
    if (showSummaryOnly && calculationSummary) {
      return {
        totalTransactions: calculationSummary.totalRebates || 0,
        totalRebateAmount: calculationSummary.totalAmount || 0,
        totalRebateAmountEUR: calculationSummary.totalAmount || 0,
        averageRebatePercentage: 0,
      };
    }
    
    const nonGrandTotalData = filteredData.filter(row => !row.isGrandTotal);
    const totalRebateAmount = nonGrandTotalData.reduce((sum, row) => sum + row.rebateAmount, 0);
    const totalRebateAmountEUR = nonGrandTotalData.reduce((sum, row) => sum + row.rebateAmountEUR, 0);
    const averageRebatePercentage = nonGrandTotalData.length > 0 
      ? nonGrandTotalData.reduce((sum, row) => {
          const rate = row.rebate1Yearly || 0;
          return sum + rate;
        }, 0) / nonGrandTotalData.length
      : 0;

    return {
      totalTransactions: nonGrandTotalData.length,
      totalRebateAmount,
      totalRebateAmountEUR,
      averageRebatePercentage,
    };
  }, [filteredData, showSummaryOnly, calculationSummary]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading results...</span>
        </div>
      </div>
    );
  }

  // If we have a calculation summary but haven't loaded the data yet
  if (calculationSummary && showSummaryOnly) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Calculation Results</h1>
          <p className="text-gray-600 mt-2">
            Rebates have been calculated successfully. You can export the results or view detailed data.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Total Rebates Calculated</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {calculationSummary.totalRebates?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Total Rebate Amount</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(calculationSummary.totalAmount || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Processing Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((calculationSummary.processingTime || 0) / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Export Options</h2>
            <p className="text-sm text-gray-600">
              Export all {calculationSummary.totalRebates?.toLocaleString()} calculated rebates
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  variant="primary"
                  onClick={async () => {
                    setIsExporting(true);
                    try {
                      console.log('[Results] Starting chunked export from database...');
                      
                      // First get metadata to know how many chunks we have
                      const metadata = await window.electronAPI.db.getCalculatedRebatesMetadata();
                      
                      if (!metadata || metadata.totalRebates === 0) {
                        addNotification({
                          type: 'warning',
                          title: 'No Data to Export',
                          message: 'No rebates found to export',
                          duration: 5000,
                        });
                        setIsExporting(false);
                        return;
                      }
                      
                      console.log(`[Results] Processing ${metadata.totalRebates} rebates in ${metadata.chunks} chunks...`);
                      
                      // Show progress notification
                      addNotification({
                        type: 'info',
                        title: 'Export Started',
                        message: `Processing ${metadata.totalRebates.toLocaleString()} rebates...`,
                        duration: 0, // Don't auto-dismiss
                      });
                      
                      // Load transaction data for joins
                      console.log('[Results] Loading transaction data for amounts...');
                      const transactionData = await window.electronAPI.db.getTransactionData();
                      console.log(`[Results] Loaded ${transactionData.length} transactions`);
                      
                      // Create map for fast lookup of transaction amounts
                      const transactionMap = new Map<string, number>();
                      transactionData.forEach(tx => {
                        const txId = tx.transaction_id || tx.transactionId;
                        const amount = tx.transaction_amount || tx.transactionAmount || 0;
                        if (txId) {
                          transactionMap.set(txId, Math.abs(amount)); // Use absolute value
                        }
                      });
                      console.log(`[Results] Created transaction lookup map with ${transactionMap.size} entries`);
                      
                      // Create map for fast lookup of merchant names
                      console.log('[Results] Creating merchant lookup map...');
                      const merchantMap = new Map<string, string>();
                      transactionData.forEach(tx => {
                        const txId = tx.transaction_id || tx.transactionId;
                        if (txId) {
                          // Create a mock CalculatedRebate object to use getMerchantNameNew function
                          const mockRebate = {
                            originalTransaction: {
                              merchantName: tx.merchant_name || '',
                              transactionMerchantName: tx.transaction_merchant_name || '',
                              transactionMerchantCategoryCode: tx.transaction_merchant_category_code || 0
                            }
                          };
                          const merchantName = getMerchantNameNew(mockRebate as any);
                          merchantMap.set(txId, merchantName);
                        }
                      });
                      console.log(`[Results] Created merchant lookup map with ${merchantMap.size} entries`);
                      
                      // Group rebates by provider/product/merchant for summary export
                      const groups = new Map<string, any[]>();
                      let processedCount = 0;
                      
                      // Process each chunk
                      for (let i = 0; i < metadata.chunks; i++) {
                        const chunk = await window.electronAPI.db.getCalculatedRebatesChunk(i);
                        
                        // Process rebates in this chunk
                        chunk.forEach(rebate => {
                          const provider = rebate.providerCustomerCode || rebate.provider_customer_code || 'Unknown';
                          const product = rebate.productName || rebate.product_name || 'Unknown';
                          
                          // Get merchant name from lookup
                          const transactionId = rebate.transactionId || rebate.transaction_id;
                          const merchantName = transactionId ? (merchantMap.get(transactionId) || '') : '';
                          
                          // Use provider|product|merchant for grouping to include merchant in export
                          const key = `${provider}|${product}|${merchantName}`;
                          
                          if (!groups.has(key)) {
                            groups.set(key, []);
                          }
                          
                          // Add transaction amount from lookup
                          const transactionAmount = transactionId ? (transactionMap.get(transactionId) || 0) : 0;
                          
                          groups.get(key)!.push({
                            ...rebate,
                            transactionAmount: transactionAmount,
                            merchantName: merchantName
                          });
                        });
                        
                        processedCount += chunk.length;
                        console.log(`[Results] Processed chunk ${i + 1}/${metadata.chunks} (${processedCount}/${metadata.totalRebates} rebates)`);
                      }
                      
                      console.log(`[Results] Creating summary export data from ${groups.size} groups...`);
                      
                      // Create summary export data
                      const exportData: any[] = [];
                      let grandTotalAmount = 0;
                      let grandTotalAmountEUR = 0;
                      let grandTotalTransactionAmount = 0;
                      
                      groups.forEach((rebates, key) => {
                        const [provider, product, merchant] = key.split('|');
                        
                        // Sum all rebates in the group - handle both camelCase and snake_case
                        const totalAmount = rebates.reduce((sum, r) => {
                          const amount = r.rebateAmount || r.rebate_amount || 0;
                          return sum + amount;
                        }, 0);
                        
                        const totalAmountEUR = rebates.reduce((sum, r) => {
                          const amountEUR = r.rebateAmountEUR || r.rebate_amount_eur || 0;
                          return sum + amountEUR;
                        }, 0);
                        
                        // Sum transaction amounts (now populated from lookup)
                        const totalTransactionAmount = rebates.reduce((sum, r) => {
                          const amount = r.transactionAmount || 0;
                          return sum + amount;
                        }, 0);
                        
                        // Get rate from first level 1 rebate
                        const level1Rebate = rebates.find(r => 
                          (r.rebateLevel || r.rebate_level) === 1
                        );
                        const rebate1Yearly = level1Rebate ? 
                          (level1Rebate.rebatePercentage || level1Rebate.rebate_percentage) : 
                          null;
                        
                        const currency = rebates[0]?.originalTransaction?.transactionCurrency || 
                                       rebates[0]?.transaction_currency || 
                                       'EUR';
                        
                        exportData.push({
                          'Provider Customer Name': provider,
                          'Product Name': product,
                          'Merchant Name': merchant || '', // Now available from merchant lookup
                          'Currency': currency,
                          'Rebate 1 Yearly': rebate1Yearly !== null ? `${rebate1Yearly.toFixed(3)}%` : '',
                          'Transaction Amount': totalTransactionAmount.toFixed(2),
                          'Rebate Amount': totalAmount.toFixed(2),
                          'Rebate Amount EUR': totalAmountEUR.toFixed(2)
                        });
                        
                        grandTotalAmount += totalAmount;
                        grandTotalAmountEUR += totalAmountEUR;
                        grandTotalTransactionAmount += totalTransactionAmount;
                      });
                      
                      // Add grand total row
                      exportData.push({
                        'Provider Customer Name': 'Grand Total',
                        'Product Name': '',
                        'Merchant Name': '',
                        'Currency': '',
                        'Rebate 1 Yearly': '',
                        'Transaction Amount': grandTotalTransactionAmount.toFixed(2),
                        'Rebate Amount': grandTotalAmount.toFixed(2),
                        'Rebate Amount EUR': grandTotalAmountEUR.toFixed(2)
                      });
                      
                      // Export to Excel
                      await window.electronAPI.file.exportExcel({
                        data: exportData,
                        filename: `rebates_full_export_${new Date().toISOString().split('T')[0]}.xlsx`,
                        sheetName: 'Rebates Summary'
                      });
                      
                      console.log(`[Results] Successfully exported ${exportData.length - 1} grouped results plus grand total`);
                      
                      // Cache export data for Detailed Table (excluding grand total row)
                      const detailedTableData = exportData.slice(0, -1).map((row, index) => ({
                        id: `export-${index}`,
                        providerCustomerName: row['Provider Customer Name'],
                        productName: row['Product Name'],
                        merchantName: row['Merchant Name'] || '-',
                        currency: row['Currency'],
                        rebate1Yearly: row['Rebate 1 Yearly'] ? parseFloat(row['Rebate 1 Yearly'].replace('%', '')) : null,
                        transactionAmount: parseFloat(row['Transaction Amount']),
                        rebateAmount: parseFloat(row['Rebate Amount']),
                        rebateAmountEUR: parseFloat(row['Rebate Amount EUR'])
                      }));
                      
                      localStorage.setItem('detailedTableData', JSON.stringify({
                        data: detailedTableData,
                        exportedAt: new Date().toISOString(),
                        totalGroups: detailedTableData.length
                      }));
                      
                      console.log(`[Results] Cached ${detailedTableData.length} grouped rows for Detailed Table`);
                      // Success notification will be handled by the export:success event listener
                    } catch (error) {
                      console.error('Export error:', error);
                      addNotification({
                        type: 'error',
                        title: 'Export Failed',
                        message: error instanceof Error ? error.message : 'Unknown error occurred',
                        duration: 10000,
                      });
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  className="flex-1"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2 -ml-1" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Export All to Excel
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/table')}
                  className="flex-1"
                >
                  <svg className="w-5 h-5 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                  </svg>
                  View Detailed Table
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rebate Results</h1>
            <p className="text-gray-600 mt-2">
              Detailed results from rebate calculations with filtering and export options.
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={filteredData.length === 0}
            >
              Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{showGrouped ? 'Grouped Results' : 'Individual Results'}</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summaryStats.totalTransactions.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Rebates (EUR)</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(summaryStats.totalRebateAmountEUR)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summaryStats.averageRebatePercentage.toFixed(3)}%
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Selected</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {selectedRows.length}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader title="Filters" />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by provider, product, or transaction ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Providers</label>
              <div className="border rounded-md p-2 bg-white min-h-[38px] max-h-32 overflow-y-auto">
                {uniqueProviders.length > 0 ? (
                  uniqueProviders.map(provider => (
                    <label key={provider} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(provider)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProviders([...selectedProviders, provider]);
                          } else {
                            setSelectedProviders(selectedProviders.filter(p => p !== provider));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="truncate">{provider}</span>
                    </label>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No providers</span>
                )}
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Products</label>
              <div className="border rounded-md p-2 bg-white min-h-[38px] max-h-32 overflow-y-auto">
                {uniqueProducts.length > 0 ? (
                  uniqueProducts.map(product => (
                    <label key={product} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, product]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(p => p !== product));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="truncate">{product}</span>
                    </label>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No products</span>
                )}
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Merchants</label>
              <div className="border rounded-md p-2 bg-white min-h-[38px] max-h-32 overflow-y-auto">
                {uniqueMerchants.length > 0 ? (
                  uniqueMerchants.map(merchant => (
                    <label key={merchant} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedMerchants.includes(merchant)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMerchants([...selectedMerchants, merchant]);
                          } else {
                            setSelectedMerchants(selectedMerchants.filter(m => m !== merchant));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="truncate">{merchant}</span>
                    </label>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No merchants</span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={!searchTerm && selectedProviders.length === 0 && selectedProducts.length === 0 && selectedMerchants.length === 0}
              >
                Clear Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrouped(!showGrouped)}
              >
                {showGrouped ? 'Show Individual' : 'Show Grouped'}
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredData.filter(r => !r.isGrandTotal).length} grouped results
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader
          title="Rebate Calculations"
          subtitle={`${filteredData.length} of ${calculatedRebates.length} results`}
        />
        <CardContent className="p-0">
          <Table
            data={paginatedData}
            columns={columns}
            loading={isLoading}
            emptyMessage="No rebate calculations found matching your criteria."
            pagination={{
              page: currentPage,
              pageSize: pageSize,
              total: filteredData.length,
              onPageChange: setCurrentPage,
              onPageSizeChange: (newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              },
            }}
            sorting={{
              key: 'rebateAmountEUR',
              direction: 'desc',
              onSort: () => {}, // Sorting handled in useMemo
            }}
            selection={{
              selectedRows,
              onSelectionChange: setSelectedRows,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};