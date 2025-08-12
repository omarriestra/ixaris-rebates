import React, { useState, useEffect } from 'react';
import { Upload, Database, FileText, CheckCircle, AlertCircle, Calculator, Eye, BarChart3 } from 'lucide-react';

interface ImportResult {
  success: boolean;
  rowsImported: number;
  errors: string[];
  warnings: string[];
}

interface ImportStats {
  transactions: number;
  visaMCORebatesMonthly: number;
  visaMCORebatesYearly: number;
  partnerPayRebatesMonthly: number;
  partnerPayRebatesYearly: number;
  airlinesMCC: number;
  regionCountry: number;
  voyagePriveRebates: number;
  billingMaterials: number;
  sapBPCodes: number;
}

interface TableViewModalProps {
  tableName: string;
  displayName: string;
  isOpen: boolean;
  onClose: () => void;
}

const TableViewModal: React.FC<TableViewModalProps> = ({ tableName, displayName, isOpen, onClose }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTableData();
    }
  }, [isOpen, tableName]);

  const loadTableData = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.csvGetTableData(tableName);
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{displayName}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading...</span>
          </div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value: any, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {value !== null && value !== undefined ? value.toString() : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 py-8 text-center">No data available</p>
        )}
      </div>
    </div>
  );
};

export default function TableManagement(): JSX.Element {
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [results, setResults] = useState<{ [key: string]: ImportResult }>({});
  const [calculating, setCalculating] = useState(false);
  const [calculateResult, setCalculateResult] = useState<any>(null);
  const [viewModal, setViewModal] = useState<{ tableName: string; displayName: string } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const stats = await window.electronAPI.csvGetImportStats();
      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleImportFile = async (tableType: string, title: string) => {
    try {
      setImporting(tableType);
      
      // Select file
      const filePath = await window.electronAPI.csvSelectFile(title, ['csv']);
      if (!filePath) {
        setImporting(null);
        return;
      }

      let result: ImportResult;

      // Import based on table type
      switch (tableType) {
        case 'transactions':
          result = await window.electronAPI.csvImportTransactions(filePath);
          break;
        case 'visa_mco_yearly':
          result = await window.electronAPI.csvImportVisaMCORebates(filePath, true);
          break;
        case 'visa_mco_monthly':
          result = await window.electronAPI.csvImportVisaMCORebates(filePath, false);
          break;
        case 'partnerpay_yearly':
          result = await window.electronAPI.csvImportPartnerPayRebates(filePath, true);
          break;
        case 'partnerpay_monthly':
          result = await window.electronAPI.csvImportPartnerPayRebates(filePath, false);
          break;
        case 'airlines_mcc':
          result = await window.electronAPI.csvImportAirlinesMCC(filePath);
          break;
        case 'region_country':
          result = await window.electronAPI.csvImportRegionCountry(filePath);
          break;
        case 'voyage_prive':
          result = await window.electronAPI.csvImportVoyagePriveRebates(filePath);
          break;
        case 'billing_materials':
          result = await window.electronAPI.csvImportBillingMaterials(filePath);
          break;
        case 'sap_bp_codes':
          result = await window.electronAPI.csvImportSAPBPCodes(filePath);
          break;
        default:
          throw new Error('Unknown table type');
      }

      setResults(prev => ({ ...prev, [tableType]: result }));
      await loadStats(); // Refresh stats
      
    } catch (error) {
      console.error(`Error importing ${tableType}:`, error);
      setResults(prev => ({ 
        ...prev, 
        [tableType]: { 
          success: false, 
          rowsImported: 0, 
          errors: [error instanceof Error ? error.message : 'Unknown error'], 
          warnings: [] 
        } 
      }));
    } finally {
      setImporting(null);
    }
  };

  const handleCalculateRebates = async () => {
    try {
      setCalculating(true);
      const result = await window.electronAPI.rebate.calculate({});
      setCalculateResult(result);
    } catch (error) {
      console.error('Error calculating rebates:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleViewTable = (tableName: string, displayName: string) => {
    setViewModal({ tableName, displayName });
  };

  const isAllReferenceDataImported = () => {
    if (!stats) return false;
    return (
      stats.visaMCORebatesMonthly > 0 &&
      stats.visaMCORebatesYearly > 0 &&
      stats.partnerPayRebatesMonthly > 0 &&
      stats.partnerPayRebatesYearly > 0 &&
      stats.airlinesMCC > 0 &&
      stats.regionCountry > 0 &&
      stats.voyagePriveRebates > 0 &&
      stats.billingMaterials > 0 &&
      stats.sapBPCodes > 0
    );
  };

  const canCalculateRebates = () => {
    return stats && stats.transactions > 0 && isAllReferenceDataImported();
  };

  const ImportCard = ({ 
    tableType, 
    title, 
    description, 
    count, 
    hasViewButton = true,
    tableName = '',
    displayName = ''
  }: { 
    tableType: string; 
    title: string; 
    description: string; 
    count: number;
    hasViewButton?: boolean;
    tableName?: string;
    displayName?: string;
  }) => {
    const result = results[tableType];
    const isImporting = importing === tableType;
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              count > 0 ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {count > 0 ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <Database className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-500">rows</div>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => handleImportFile(tableType, `Select ${title} CSV file`)}
            disabled={isImporting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </button>

          {hasViewButton && count > 0 && (
            <button
              onClick={() => handleViewTable(tableName, displayName)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center"
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </button>
          )}
        </div>

        {result && (
          <div className="mt-4 p-3 rounded-md bg-gray-50">
            {result.success ? (
              <div className="flex items-center text-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">Successfully imported {result.rowsImported} rows</span>
              </div>
            ) : (
              <div className="flex items-center text-red-700">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">Import failed: {result.errors.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
        <p className="text-gray-600 mt-2">
          Import your CSV files and manage reference data for rebate calculations.
        </p>
      </div>

      {/* Transaction Data Section */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
            Transaction Data
          </h2>
          <p className="text-gray-600 mt-1">Import your transaction file to calculate rebates</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <ImportCard
            tableType="transactions"
            title="Transactions"
            description="Main transaction data file"
            count={stats.transactions}
            hasViewButton={false}
          />
        </div>
      </div>

      {/* Reference Data Section */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Database className="w-6 h-6 mr-2 text-green-600" />
            Reference Data
          </h2>
          <p className="text-gray-600 mt-1">Import all reference tables required for rebate calculations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImportCard
            tableType="visa_mco_monthly"
            title="Visa & MCO Monthly"
            description="Monthly rebate rates for Visa & Mastercard"
            count={stats.visaMCORebatesMonthly}
            tableName="visaMCORebatesMonthly"
            displayName="Visa & MCO Monthly Rebates"
          />
          
          <ImportCard
            tableType="visa_mco_yearly"
            title="Visa & MCO Yearly"
            description="Yearly rebate rates for Visa & Mastercard"
            count={stats.visaMCORebatesYearly}
            tableName="visaMCORebatesYearly"
            displayName="Visa & MCO Yearly Rebates"
          />

          <ImportCard
            tableType="partnerpay_monthly"
            title="PartnerPay Monthly"
            description="Monthly rebate rates for PartnerPay"
            count={stats.partnerPayRebatesMonthly}
            tableName="partnerPayRebatesMonthly"
            displayName="PartnerPay Monthly Rebates"
          />

          <ImportCard
            tableType="partnerpay_yearly"
            title="PartnerPay Yearly"
            description="Yearly rebate rates for PartnerPay"
            count={stats.partnerPayRebatesYearly}
            tableName="partnerPayRebatesYearly"
            displayName="PartnerPay Yearly Rebates"
          />

          <ImportCard
            tableType="airlines_mcc"
            title="Airlines MCC"
            description="Airline merchant category codes"
            count={stats.airlinesMCC}
            tableName="airlinesMCC"
            displayName="Airlines MCC Data"
          />

          <ImportCard
            tableType="region_country"
            title="Region Country"
            description="Regional and country mappings"
            count={stats.regionCountry}
            tableName="regionCountry"
            displayName="Region Country Data"
          />

          <ImportCard
            tableType="voyage_prive"
            title="Voyage Prive"
            description="Special rebate rules for Voyage Prive"
            count={stats.voyagePriveRebates}
            tableName="voyagePriveRebates"
            displayName="Voyage Prive Rebates"
          />

          <ImportCard
            tableType="billing_materials"
            title="Billing Materials"
            description="SAP billing material codes"
            count={stats.billingMaterials}
            tableName="billingMaterials"
            displayName="Billing Materials"
          />

          <ImportCard
            tableType="sap_bp_codes"
            title="SAP BP Codes"
            description="SAP business partner codes"
            count={stats.sapBPCodes}
            tableName="sapBPCodes"
            displayName="SAP BP Codes"
          />
        </div>
      </div>

      {/* Calculate Rebates Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calculator className="w-6 h-6 mr-2 text-blue-600" />
              Calculate Rebates
            </h3>
            <p className="text-gray-600 mt-1">
              {canCalculateRebates() 
                ? "All data imported. Ready to calculate rebates!" 
                : "Import transaction data and all reference tables to calculate rebates"
              }
            </p>
          </div>

          <button
            onClick={handleCalculateRebates}
            disabled={!canCalculateRebates() || calculating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium flex items-center"
          >
            {calculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Rebates
              </>
            )}
          </button>
        </div>

        {calculateResult && (
          <div className="mt-4 p-4 bg-white rounded-md border">
            {calculateResult.success ? (
              <div className="text-green-700">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Calculation completed successfully!</span>
                </div>
                <div className="text-sm">
                  <p>Calculated rebates: {calculateResult.calculatedRebates?.length || 0}</p>
                  <p>Total rebate amount: €{calculateResult.summary?.totalRebateAmountEUR?.toLocaleString() || '0'}</p>
                </div>
              </div>
            ) : (
              <div className="text-red-700">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Calculation failed</span>
                </div>
                <div className="text-sm">
                  {calculateResult.errors?.join(', ') || 'Unknown error'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600">{stats.transactions}</div>
            <div className="text-sm text-gray-500">Transactions</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">
              {stats.visaMCORebatesMonthly + stats.visaMCORebatesYearly}
            </div>
            <div className="text-sm text-gray-500">Visa/MCO</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">
              {stats.partnerPayRebatesMonthly + stats.partnerPayRebatesYearly}
            </div>
            <div className="text-sm text-gray-500">PartnerPay</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">
              {stats.airlinesMCC + stats.regionCountry + stats.voyagePriveRebates}
            </div>
            <div className="text-sm text-gray-500">Special Rules</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">
              {stats.billingMaterials + stats.sapBPCodes}
            </div>
            <div className="text-sm text-gray-500">SAP Data</div>
          </div>
        </div>
      </div>

      {/* Table View Modal */}
      <TableViewModal
        tableName={viewModal?.tableName || ''}
        displayName={viewModal?.displayName || ''}
        isOpen={!!viewModal}
        onClose={() => setViewModal(null)}
      />
    </div>
  );
}