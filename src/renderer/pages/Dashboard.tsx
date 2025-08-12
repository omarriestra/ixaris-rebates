import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useData } from '../contexts/DataContext';
import { useProgress } from '../contexts/ProgressContext-simple';
import { useNotification } from '../contexts/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { ProcessingResult } from '../../shared/types';

interface DashboardStats {
  totalTransactions: number;
  totalRebateAmount: number;
  totalRebateAmountEUR: number;
  byCalculationType: Record<string, number>;
  byProvider: Record<string, number>;
  lastProcessed?: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { configuration } = useConfiguration();
  const { processingResult, loadData, processRebates, isLoading } = useData();
  const { progress, isProcessing, setProgress } = useProgress();
  const { showNotification } = useNotification();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    totalRebateAmount: 0,
    totalRebateAmountEUR: 0,
    byCalculationType: {},
    byProvider: {},
  });

  // Load data on component mount and refresh periodically
  useEffect(() => {
    loadData();
    
    // Refresh data every 5 seconds if we have transactions but no rebate amounts
    const interval = setInterval(() => {
      if (stats.totalTransactions > 0 && stats.totalRebateAmountEUR === 0) {
        console.log('🔄 Auto-refreshing data due to missing rebate amounts...');
        loadData();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [stats.totalTransactions, stats.totalRebateAmountEUR]);

  // Update stats when processing result changes
  useEffect(() => {
    if (processingResult?.summary) {
      setStats({
        totalTransactions: processingResult.summary.totalTransactions,
        totalRebateAmount: processingResult.summary.totalRebateAmount,
        totalRebateAmountEUR: processingResult.summary.totalRebateAmountEUR,
        byCalculationType: processingResult.summary.byCalculationType,
        byProvider: processingResult.summary.byProvider,
        lastProcessed: new Date().toISOString(),
      });
    }
  }, [processingResult]);

  const handleStartProcessing = async () => {
    if (!configuration) {
      showNotification({
        type: 'error',
        title: 'Configuration Required',
        message: 'Please configure your data folder and parameters first.',
      });
      navigate('/configuration');
      return;
    }

    try {
      // Start processing
      setProgress({
        stage: 'validation',
        percentage: 0,
        message: 'Starting rebate calculation...',
      });

      const result = await processRebates({
        folderPath: configuration.folderPath,
        year: configuration.year,
        month: configuration.month,
      });

      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Processing Complete',
          message: `Successfully processed ${result.transactionsProcessed} transactions and calculated ${result.rebatesCalculated} rebates`,
        });
        
        setProgress({
          stage: 'complete',
          percentage: 100,
          message: 'Processing complete!',
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Processing Failed',
          message: result.errors.join(', '),
        });
      }
    } catch (error) {
      console.error('Error processing rebates:', error);
      showNotification({
        type: 'error',
        title: 'Processing Error',
        message: 'An error occurred during processing. Please try again.',
      });
    }
  };

  const getConfigurationStatus = () => {
    if (!configuration) {
      return { status: 'error' as const, message: 'Not configured' };
    }
    
    return { status: 'success' as const, message: 'Configured' };
  };

  const getDataStatus = () => {
    if (isLoading) {
      return { status: 'pending' as const, message: 'Loading...' };
    }
    
    if (stats.totalTransactions > 0) {
      return { status: 'success' as const, message: `${stats.totalTransactions} transactions` };
    }
    
    return { status: 'inactive' as const, message: 'No data' };
  };

  const handleDebugInfo = async () => {
    try {
      console.log('🔍 Debug: Getting database stats...');
      
      // Get debug stats from backend
      const stats = await window.electronAPI.debug.getStats();
      console.log('📊 Database Stats:', stats);
      
      console.log('📊 Debug Summary:');
      console.log(`- Transactions: ${stats.transactions.count}`);
      console.log(`- Visa/MCO Rebates: ${stats.visaMCORebates.count}`);
      console.log(`- PartnerPay Rebates: ${stats.partnerPayRebates.count}`);
      console.log(`- Calculated Rebates: ${stats.calculatedRebates.count}`);
      
      console.log('📝 Sample Transaction:', stats.transactions.samples[0]);
      console.log('📝 Sample Visa/MCO Rebate:', stats.visaMCORebates.samples[0]);
      console.log('📝 Sample PartnerPay Rebate:', stats.partnerPayRebates.samples[0]);
      
      // Show notification with debug info
      showNotification({
        type: 'info',
        title: 'Debug Stats',
        message: `DB: ${stats.transactions.count} txns, ${stats.visaMCORebates.count} visa, ${stats.partnerPayRebates.count} pp, ${stats.calculatedRebates.count} calc`,
      });
    } catch (error) {
      console.error('Debug error:', error);
      showNotification({
        type: 'error',
        title: 'Debug Error',
        message: 'Failed to get debug info',
      });
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const configStatus = getConfigurationStatus();
  const dataStatus = getDataStatus();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Overview of your rebate calculation system and current processing status.
        </p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Configuration Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Configuration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {configuration ? `${configuration.year}-${configuration.month.toString().padStart(2, '0')}` : 'N/A'}
                </p>
              </div>
              <StatusBadge status={configStatus.status} />
            </div>
            <p className="text-sm text-gray-500 mt-2">{configStatus.message}</p>
          </CardContent>
        </Card>

        {/* Data Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats.totalTransactions)}
                </p>
              </div>
              <StatusBadge status={dataStatus.status} />
            </div>
            <p className="text-sm text-gray-500 mt-2">{dataStatus.message}</p>
          </CardContent>
        </Card>

        {/* Processing Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isProcessing ? `${progress?.percentage || 0}%` : 'Ready'}
                </p>
              </div>
              <StatusBadge status={isProcessing ? 'pending' : 'active'} />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {isProcessing ? progress?.message : 'System ready for processing'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Processing Controls */}
        <Card>
          <CardHeader
            title="Rebate Processing"
            subtitle="Start rebate calculations or view existing results"
          />
          <CardContent>
            <div className="space-y-4">
              {configuration && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Current Configuration</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Folder:</strong> {configuration.folderPath}</p>
                    <p><strong>Period:</strong> {configuration.year}-{configuration.month.toString().padStart(2, '0')}</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={handleStartProcessing}
                  disabled={!configuration || isProcessing}
                  isLoading={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? 'Processing...' : 'Start Processing'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/configuration')}
                  disabled={isProcessing}
                >
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader
            title="Quick Actions"
            subtitle="Navigate to different sections of the application"
          />
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/results')}
                disabled={stats.totalTransactions === 0}
                className="h-20 flex-col"
              >
                <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm">View Results</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/export')}
                disabled={stats.totalTransactions === 0}
                className="h-20 flex-col"
              >
                <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">Export Data</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/configuration')}
                className="h-20 flex-col"
              >
                <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">Settings</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.electronAPI.file.openFolder(configuration?.folderPath || '')}
                disabled={!configuration}
                className="h-20 flex-col"
              >
                <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-sm">Open Folder</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      {stats.totalTransactions > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatNumber(stats.totalTransactions)}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Rebates</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalRebateAmount)}</dd>
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
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Calculation Types</dt>
                    <dd className="text-lg font-medium text-gray-900">{Object.keys(stats.byCalculationType).length}</dd>
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
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Providers</dt>
                    <dd className="text-lg font-medium text-gray-900">{Object.keys(stats.byProvider).length}</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      {stats.lastProcessed && (
        <Card>
          <CardHeader title="Recent Activity" />
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Rebate processing completed successfully
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(stats.lastProcessed).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Section */}
      <Card>
        <CardHeader title="Debug Tools" />
        <CardContent>
          <div className="flex space-x-4">
            <Button 
              onClick={handleDebugInfo}
              variant="outline"
              className="bg-gray-50 hover:bg-gray-100"
            >
              🔍 Debug Info
            </Button>
            <Button 
              onClick={async () => {
                console.log('🔄 Manual data reload triggered...');
                await loadData();
                console.log('📊 Data reloaded, current stats:', stats);
              }}
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100"
            >
              🔄 Reload Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};