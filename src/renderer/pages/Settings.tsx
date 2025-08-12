import React from 'react';
import { Settings as SettingsIcon, Database, FolderOpen, Calendar, Info } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center">
          <SettingsIcon className="w-8 h-8 mr-3 text-primary-600" />
          Settings
        </h2>
        <p className="text-gray-600 mt-2">
          Configure your Ixaris Rebates Calculator preferences and system settings.
        </p>
      </div>

      {/* General Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" />
            General Settings
          </h3>
        </div>
        <div className="card-content space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Data Folder
            </label>
            <div className="flex items-center space-x-3">
              <div className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                <span className="text-gray-500">No default folder set</span>
              </div>
              <button className="btn btn-outline flex items-center space-x-2">
                <FolderOpen className="w-4 h-4" />
                <span>Select Folder</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Set a default folder for importing CSV files
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Year
            </label>
            <select className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Default year for new calculations
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Month
            </label>
            <select className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="12">December</option>
              <option value="11">November</option>
              <option value="10">October</option>
              <option value="9">September</option>
              <option value="8">August</option>
              <option value="7">July</option>
              <option value="6">June</option>
              <option value="5">May</option>
              <option value="4">April</option>
              <option value="3">March</option>
              <option value="2">February</option>
              <option value="1">January</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Default month for new calculations
            </p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Data Management
          </h3>
        </div>
        <div className="card-content space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Clear All Data</h4>
              <p className="text-sm text-gray-500">
                Remove all imported transactions and calculated rebates
              </p>
            </div>
            <button className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50">
              Clear Data
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Reset Configuration</h4>
              <p className="text-sm text-gray-500">
                Reset all settings to default values
              </p>
            </div>
            <button className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50">
              Reset Settings
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Export Settings</h4>
              <p className="text-sm text-gray-500">
                Save your current settings to a file
              </p>
            </div>
            <button className="btn btn-outline">
              Export Settings
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            About
          </h3>
        </div>
        <div className="card-content">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Application Version</span>
              <span className="font-medium">1.1.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Build Date</span>
              <span className="font-medium">August 2025</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Developer</span>
              <span className="font-medium">Amadeus COE</span>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Ixaris Rebates Calculator - A modern replacement for the Power Query Excel system.
                Built with Electron, React, and TypeScript for improved accuracy and usability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};