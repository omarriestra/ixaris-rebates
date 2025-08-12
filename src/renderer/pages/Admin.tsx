import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useProgress } from '../contexts/ProgressContext';

interface ImportStats {
  airlinesMCC: number;
  voyagePriveRebates: number;
  billingMaterials: number;
  sapCodes: number;
  regionCountryRules: number;
}

export const Admin: React.FC = () => {
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [libraryPath, setLibraryPath] = useState<string>('');
  
  const { addNotification } = useNotification();
  const { setProgress } = useProgress();

  useEffect(() => {
    loadImportStats();
  }, []);

  const loadImportStats = async () => {
    try {
      const stats = await window.electronAPI.csv.getImportStats();
      setImportStats(stats);
    } catch (error) {
      console.error('Error loading import stats:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load reference data statistics'
      });
    }
  };

  const handleSelectLibraryFolder = async () => {
    try {
      const folderPath = await window.electronAPI.csv.selectLibraryFolder();
      if (folderPath) {
        setLibraryPath(folderPath);
        addNotification({
          type: 'success',
          title: 'Folder Selected',
          message: `Selected: ${folderPath}`
        });
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to select folder'
      });
    }
  };

  const handleImportReferenceData = async () => {
    if (!libraryPath) {
      addNotification({
        type: 'warning',
        title: 'No Folder Selected',
        message: 'Please select the Library_NIUM folder first'
      });
      return;
    }

    setImporting(true);
    setProgress({
      visible: true,
      current: 0,
      total: 100,
      status: 'Importing reference data...'
    });

    try {
      const result = await window.electronAPI.csv.importReferenceData(libraryPath);
      
      setProgress({
        visible: true,
        current: 100,
        total: 100,
        status: 'Import completed successfully'
      });

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Import Successful',
          message: `Imported ${result.imported.length} files: ${result.imported.join(', ')}`
        });
        
        if (result.errors.length > 0) {
          addNotification({
            type: 'warning',
            title: 'Import Warnings',
            message: `Some files had issues: ${result.errors.join(', ')}`
          });
        }
        
        // Reload stats
        await loadImportStats();
      } else {
        addNotification({
          type: 'error',
          title: 'Import Failed',
          message: `Errors: ${result.errors.join(', ')}`
        });
      }
    } catch (error) {
      console.error('Error importing reference data:', error);
      addNotification({
        type: 'error',
        title: 'Import Error',
        message: `Failed to import reference data: ${(error as Error).message}`
      });
    } finally {
      setImporting(false);
      setTimeout(() => {
        setProgress({ visible: false, current: 0, total: 0, status: '' });
      }, 2000);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Administration Panel
        </h1>

        {/* Reference Data Import Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Reference Data Import
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Library_NIUM Folder Path
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={libraryPath}
                  readOnly
                  placeholder="Select the Library_NIUM folder containing CSV files"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <button
                  onClick={handleSelectLibraryFolder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Browse
                </button>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleImportReferenceData}
                disabled={importing || !libraryPath}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? 'Importing...' : 'Import Reference Data'}
              </button>
              
              <button
                onClick={loadImportStats}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Refresh Stats
              </button>
            </div>
          </div>
        </div>

        {/* Import Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Reference Data Statistics
          </h2>
          
          {importStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {importStats.airlinesMCC.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Airlines MCC Codes</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {importStats.voyagePriveRebates.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Voyage Prive Rebates</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {importStats.billingMaterials.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Billing Materials</div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {importStats.sapCodes.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">SAP Codes</div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {importStats.regionCountryRules.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Region/Country Rules</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">
              Loading statistics...
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Instructions
          </h3>
          <div className="text-blue-700 space-y-2">
            <p>
              1. <strong>Select Library Folder:</strong> Choose the folder containing the CSV files from Library_NIUM
            </p>
            <p>
              2. <strong>Import Reference Data:</strong> This will load all CSV files and populate the reference tables
            </p>
            <p>
              3. <strong>Required Files:</strong> AirlinesMCC.csv, VoyagePrive.csv, BillingMaterials.csv, SAP_BPCodes.csv, RegionCountry.csv
            </p>
            <p>
              4. <strong>Data Usage:</strong> This reference data will be used for rebate calculations instead of Excel file lookups
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};