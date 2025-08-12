import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useNotification } from '../contexts/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { SubmissionFileRow } from '../../shared/types';

export const Export: React.FC = () => {
  const { calculatedRebates, processingResult, loadData, isLoading } = useData();
  const { configuration } = useConfiguration();
  const { showNotification } = useNotification();
  
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('excel');
  const [exportType, setExportType] = useState<'detailed' | 'summary'>('summary');
  const [isExporting, setIsExporting] = useState(false);
  const [submissionData, setSubmissionData] = useState<SubmissionFileRow[]>([]);

  // Load data on mount
  useEffect(() => {
    if (calculatedRebates.length === 0) {
      loadData();
    }
  }, []);

  // Generate submission file data
  useEffect(() => {
    if (calculatedRebates.length > 0) {
      generateSubmissionData();
    }
  }, [calculatedRebates]);

  const generateSubmissionData = async () => {
    try {
      if (calculatedRebates.length > 0) {
        const submissionRows = await window.electronAPI.rebate.generateSubmissionFile({
          calculatedRebates,
          configuration: configuration || { folderPath: '', year: 2024, month: 1 },
        });
        setSubmissionData(submissionRows);
      } else {
        setSubmissionData([]);
      }
    } catch (error) {
      console.error('Error generating submission data:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate submission file data.',
      });
      setSubmissionData([]);
    }
  };

  // Export statistics
  const exportStats = useMemo(() => {
    if (exportType === 'detailed') {
      return {
        totalRows: calculatedRebates.length,
        totalRebateAmount: calculatedRebates.reduce((sum, rebate) => sum + rebate.rebateAmount, 0),
        totalRebateAmountEUR: calculatedRebates.reduce((sum, rebate) => sum + rebate.rebateAmountEUR, 0),
        uniqueProviders: new Set(calculatedRebates.map(r => r.providerCustomerCode)).size,
        uniqueProducts: new Set(calculatedRebates.map(r => r.productName)).size,
      };
    } else {
      return {
        totalRows: submissionData.length,
        totalRebateAmount: submissionData.reduce((sum, row) => sum + row.rebateAmount, 0),
        totalRebateAmountEUR: submissionData.reduce((sum, row) => sum + row.rebateAmountEUR, 0),
        uniqueProviders: new Set(submissionData.map(r => r.providerCustomerCode)).size,
        uniqueProducts: new Set(submissionData.map(r => r.productName)).size,
      };
    }
  }, [calculatedRebates, submissionData, exportType]);

  const formatOptions = [
    { value: 'excel', label: 'Excel (.xlsx)' },
    { value: 'csv', label: 'CSV (.csv)' },
  ];

  const typeOptions = [
    { value: 'summary', label: 'Summary (Submission File)' },
    { value: 'detailed', label: 'Detailed (All Calculations)' },
  ];

  const handleExport = async () => {
    if (exportType === 'detailed' && calculatedRebates.length === 0) {
      showNotification({
        type: 'error',
        title: 'No Data',
        message: 'No rebate calculations available for export.',
      });
      return;
    }

    if (exportType === 'summary' && submissionData.length === 0) {
      showNotification({
        type: 'error',
        title: 'No Data',
        message: 'No submission data available for export.',
      });
      return;
    }

    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `rebates_${exportType}_${timestamp}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
      
      // Let user select output file location
      const selectedPath = await window.electronAPI.export.selectOutputFile(filename);
      if (!selectedPath) {
        // User canceled the save dialog
        setIsExporting(false);
        return;
      }

      const dataToExport = exportType === 'detailed' ? calculatedRebates : submissionData;
      
      if (exportFormat === 'excel') {
        // Prepare data for Excel export
        const exportData = {
          transactions: calculatedRebates.map(r => r.originalTransaction),
          calculatedRebates: calculatedRebates,
          summary: {
            totalTransactions: calculatedRebates.length,
            totalRebateAmount: calculatedRebates.reduce((sum, r) => sum + r.rebateAmount, 0),
            totalRebateAmountEUR: calculatedRebates.reduce((sum, r) => sum + r.rebateAmountEUR, 0),
            byCalculationType: {},
            byProvider: {}
          },
          metadata: {
            configuration: configuration || { folderPath: '', year: 2024, month: 1 },
            exportType,
            exportDate: new Date().toISOString()
          }
        };

        const success = await window.electronAPI.export.toExcel(exportData, selectedPath);
        if (!success) {
          throw new Error('Excel export failed');
        }
      } else {
        // For CSV, we need to implement CSV export functionality
        // For now, show that CSV export needs implementation
        showNotification({
          type: 'warning',
          title: 'CSV Export',
          message: 'CSV export functionality will be implemented. Using Excel for now.',
        });
        return;
      }

      showNotification({
        type: 'success',
        title: 'Export Successful',
        message: `Data exported successfully to ${selectedPath.split('/').pop()}`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      showNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export data. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenFolder = () => {
    if (configuration?.folderPath) {
      // Use shell to open folder in file manager
      window.electronAPI.file.openFolder(configuration.folderPath);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading export data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Export Data</h1>
        <p className="text-gray-600 mt-2">
          Export your rebate calculations in various formats for submission or analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Configuration */}
        <Card>
          <CardHeader
            title="Export Configuration"
            subtitle="Configure your export settings"
          />
          <CardContent>
            <div className="space-y-6">
              {/* Export Type */}
              <Select
                label="Export Type"
                value={exportType}
                onChange={(e) => setExportType(e.target.value as 'detailed' | 'summary')}
                options={typeOptions}
                hint="Choose between detailed calculations or summary submission file"
              />

              {/* Export Format */}
              <Select
                label="Export Format"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel')}
                options={formatOptions}
                hint="Select the file format for export"
              />

              {/* Configuration Info */}
              {configuration && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Current Configuration</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Period:</strong> {configuration.year}-{configuration.month.toString().padStart(2, '0')}</p>
                    <p><strong>Folder:</strong> {configuration.folderPath.split('/').pop() || 'Unknown'}</p>
                  </div>
                </div>
              )}

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={isExporting || exportStats.totalRows === 0}
                isLoading={isExporting}
                fullWidth
              >
                {isExporting ? 'Exporting...' : `Export ${exportStats.totalRows} Records`}
              </Button>

              {/* Additional Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleOpenFolder}
                  disabled={!configuration?.folderPath}
                  className="flex-1"
                >
                  Open Folder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/results'}
                  className="flex-1"
                >
                  View Results
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Preview */}
        <Card>
          <CardHeader
            title="Export Preview"
            subtitle="Summary of data to be exported"
          />
          <CardContent>
            <div className="space-y-6">
              {/* Export Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-900">Total Records</p>
                      <p className="text-lg font-bold text-blue-900">{exportStats.totalRows.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-900">Total Rebates</p>
                      <p className="text-lg font-bold text-green-900">{formatCurrency(exportStats.totalRebateAmountEUR)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-900">Providers</p>
                      <p className="text-lg font-bold text-purple-900">{exportStats.uniqueProviders}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-900">Products</p>
                      <p className="text-lg font-bold text-orange-900">{exportStats.uniqueProducts}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Type Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Export Type</h4>
                  <Badge variant={exportType === 'detailed' ? 'primary' : 'secondary'}>
                    {exportType === 'detailed' ? 'Detailed' : 'Summary'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {exportType === 'detailed' 
                    ? 'Exports all individual rebate calculations with transaction details.'
                    : 'Exports aggregated data grouped by provider and product for submission.'}
                </p>
              </div>

              {/* Format Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Export Format</h4>
                  <Badge variant={exportFormat === 'excel' ? 'primary' : 'secondary'}>
                    {exportFormat === 'excel' ? 'Excel' : 'CSV'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {exportFormat === 'excel' 
                    ? 'Exports as Excel file with proper formatting and formulas.'
                    : 'Exports as CSV file for universal compatibility.'}
                </p>
              </div>

              {/* Status */}
              {exportStats.totalRows === 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex">
                    <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">No data available</p>
                      <p className="text-sm text-yellow-700">Process rebate calculations first to enable export.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Result Summary */}
      {processingResult && (
        <Card className="mt-8">
          <CardHeader title="Last Processing Summary" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {processingResult.transactionsProcessed.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Transactions Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {processingResult.rebatesCalculated.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Rebates Calculated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(processingResult.processingTime / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-500">Processing Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};