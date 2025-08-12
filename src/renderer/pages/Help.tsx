import React from 'react';
import { 
  HelpCircle, 
  FileText, 
  Upload, 
  Calculator, 
  Download, 
  Settings,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Folder
} from 'lucide-react';

export const Help: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center">
          <HelpCircle className="w-8 h-8 mr-3 text-primary-600" />
          Help & Documentation
        </h2>
        <p className="text-gray-600 mt-2">
          Learn how to use the Ixaris Rebates Calculator effectively.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Getting Started */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                Getting Started
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Import CSV Files</h4>
                    <p className="text-gray-600 text-sm mb-2">
                      Start by importing your CSV files containing transaction data and rebate configuration tables.
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Folder className="w-3 h-3" />
                      <span>Navigation: Import Files</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Calculate Rebates</h4>
                    <p className="text-gray-600 text-sm mb-2">
                      Click the Calculate Rebates button to process all imported data using the Power Query algorithm.
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Calculator className="w-3 h-3" />
                      <span>Automatic validation and calculation</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Review Results</h4>
                    <p className="text-gray-600 text-sm mb-2">
                      View the calculated rebates in the Results page and explore detailed transaction data in the Rebates Viewer.
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Calculator className="w-3 h-3" />
                      <span>Automatic calculation using Power Query logic</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* File Requirements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-blue-600" />
                Required Files
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Transaction Data (Required)</h4>
                  <p className="text-blue-800 text-sm mb-2">Format: <code className="bg-blue-100 px-1 rounded">YYYYmm_NIUM_QLIK.csv</code></p>
                  <p className="text-blue-700 text-sm">
                    Main file containing all transactions for the calculation period. Must include all required columns like Transaction Amount, Provider Customer Code, etc.
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">Visa & MCO Rebates (Required)</h4>
                  <p className="text-green-800 text-sm mb-2">Files: <code className="bg-green-100 px-1 rounded">Visa & MCO Monthly/Yearly Rebate.csv</code></p>
                  <p className="text-green-700 text-sm">
                    Contains rebate rates for Visa and Mastercard transactions based on provider and product combinations.
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">PartnerPay Rebates (Required)</h4>
                  <p className="text-purple-800 text-sm mb-2">Files: <code className="bg-purple-100 px-1 rounded">PartnerPay_PartnerDirect Monthly/Yearly Rebate.csv</code></p>
                  <p className="text-purple-700 text-sm">
                    Contains rebate rates for PartnerPay and PartnerDirect transactions with specific BIN and MCC matching.
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-900 mb-2">Library Files (Required)</h4>
                  <p className="text-orange-800 text-sm mb-2">Folder: <code className="bg-orange-100 px-1 rounded">Library_NIUM/</code></p>
                  <p className="text-orange-700 text-sm">
                    Contains reference data for special cases: AirlinesMCC, RegionCountry, VoyagePrive, BillingMaterials, SAP_BPCode.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertCircle className="w-6 h-6 mr-2 text-amber-600" />
                Troubleshooting
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">No Rebates Calculated</h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                    <li>Verify all required CSV files are present in the selected folder</li>
                    <li>Check that file names match the expected format exactly</li>
                    <li>Ensure transaction data contains valid Provider Customer Codes and Product Names</li>
                    <li>Confirm rebate configuration files have matching entries</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">File Import Errors</h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                    <li>Ensure CSV files use comma separators and proper quote escaping</li>
                    <li>Check for missing or extra columns in the CSV files</li>
                    <li>Verify encoding is UTF-8 compatible</li>
                    <li>Remove any empty rows or invalid characters</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Incorrect Results</h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                    <li>Compare configuration with your Power Query setup</li>
                    <li>Verify year and month settings match your data period</li>
                    <li>Check special case configurations in Library_NIUM files</li>
                    <li>Review transaction data for consistency</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* System Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Version</span>
                  <span className="font-medium">1.1.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform</span>
                  <span className="font-medium">Electron</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Database</span>
                  <span className="font-medium">SQLite</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Support</span>
                  <span className="font-medium">CSV, Excel</span>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Need More Help?</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                For technical support or questions about specific calculations, contact the Amadeus COE team.
              </p>
              <a 
                href="mailto:rmc.coe@amadeus.com?subject=Ixaris Rebates Calculator - Support Request"
                className="btn btn-primary w-full text-sm text-center inline-block"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};