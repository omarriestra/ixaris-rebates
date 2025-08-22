import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Settings, 
  BarChart3, 
  Download, 
  FileText,
  Database,
  Shield
} from 'lucide-react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useData } from '../contexts/DataContext';
import coeLogo from '../assets/coe-logo.png';
import amadeusLogo from '../assets/amadeus-logo-dark.png';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: string | number;
  disabled?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  to, 
  icon, 
  label, 
  isActive, 
  badge, 
  disabled 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    console.log('🔗 [Sidebar] Item clicked:', { to, label, disabled });
    if (!disabled) {
      console.log('🔗 [Sidebar] Navigating to:', to);
      navigate(to);
      console.log('🔗 [Sidebar] Navigation called');
    } else {
      console.log('🔗 [Sidebar] Navigation blocked - item disabled');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        sidebar-item w-full
        ${isActive ? 'sidebar-item-active' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          {icon}
          <span>{label}</span>
        </div>
        {badge && (
          <span className="badge badge-info">
            {badge}
          </span>
        )}
      </div>
    </button>
  );
};

export const Sidebar: React.FC = () => {
  console.log('📋 [Sidebar] Rendering sidebar...');
  
  const location = useLocation();
  const { configuration } = useConfiguration();
  const { transactionData, calculatedRebates, processingResult, hasExistingData, existingDataSummary } = useData();

  console.log('📋 [Sidebar] Current location:', location.pathname);
  console.log('📋 [Sidebar] Data state:', { hasExistingData, transactionDataLength: transactionData.length });

  const hasConfiguration = Boolean(configuration) || hasExistingData;
  const hasData = transactionData.length > 0 || hasExistingData;
  const hasCalculatedRebates = calculatedRebates.length > 0;
  
  // Also check if we have a calculation summary in localStorage
  const calculationSummary = localStorage.getItem('calculationSummary');
  const hasCalculationSummary = Boolean(calculationSummary);
  const hasResults = hasCalculatedRebates || hasCalculationSummary || hasExistingData;

  return (
    <div className="sidebar w-64 h-full flex flex-col">
      {/* Amadeus Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-center">
          <img 
            src={amadeusLogo} 
            alt="Amadeus" 
            className="h-16 w-auto"
            onError={(e) => {
              console.log('Failed to load Amadeus logo in sidebar, using fallback');
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Main navigation */}
        <div className="space-y-1">
          <SidebarItem
            to="/"
            icon={<Database className="w-5 h-5" />}
            label="Import Files"
            isActive={location.pathname === '/'}
          />

          <SidebarItem
            to="/results"
            icon={<BarChart3 className="w-5 h-5" />}
            label="Results"
            isActive={location.pathname === '/results'}
            disabled={!hasResults}
          />

          <SidebarItem
            to="/table"
            icon={<FileText className="w-5 h-5" />}
            label="Rebates Viewer"
            isActive={location.pathname === '/table'}
            disabled={!hasResults}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Data status section */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Data Status
          </h3>

          {/* Configuration status */}
          <div className="flex items-center space-x-3 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              hasConfiguration ? 'bg-success-500' : 'bg-gray-300'
            }`}></div>
            <span className={hasConfiguration ? 'text-gray-700' : 'text-gray-500'}>
              Configuration
            </span>
          </div>

          {/* Data status */}
          <div className="flex items-center space-x-3 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              hasData ? 'bg-success-500' : 'bg-gray-300'
            }`}></div>
            <span className={hasData ? 'text-gray-700' : 'text-gray-500'}>
              Files Imported
            </span>
          </div>

          {/* Rebates status */}
          <div className="flex items-center space-x-3 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              hasResults ? 'bg-success-500' : 'bg-gray-300'
            }`}></div>
            <span className={hasResults ? 'text-gray-700' : 'text-gray-500'}>
              Rebates Calculated
            </span>
          </div>
        </div>

        {/* Summary section */}
        {(processingResult || existingDataSummary) && (
          <>
            <div className="border-t border-gray-200 my-4"></div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Summary
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Rebates</span>
                  <span className="font-medium text-gray-900">
                    €{(processingResult?.summary?.totalRebateAmountEUR || existingDataSummary?.totalAmountEUR || 0).toLocaleString()}
                  </span>
                </div>
                
                {(processingResult?.summary?.totalTransactions || existingDataSummary?.transactionCount) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Transactions</span>
                    <span className="font-medium text-gray-900">
                      {(processingResult?.summary?.totalTransactions || existingDataSummary?.transactionCount || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {processingResult?.errors?.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-error-500">Errors</span>
                    <span className="font-medium text-error-600">
                      {processingResult.errors.length}
                    </span>
                  </div>
                )}
                
                {processingResult?.warnings?.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-warning-500">Warnings</span>
                    <span className="font-medium text-warning-600">
                      {processingResult.warnings.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-center">
          <img 
            src={coeLogo} 
            alt="COE" 
            className="h-24 w-auto"
            onError={(e) => {
              console.log('Failed to load COE logo, using fallback');
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
};