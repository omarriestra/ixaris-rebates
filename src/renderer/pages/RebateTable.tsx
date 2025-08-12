import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { CalculatedRebate } from '../../shared/types';

interface RebateTableProps {}

// Interface for grouped data matching export format
interface GroupedRebateRow {
  id: string;
  providerCustomerName: string;
  productName: string;
  merchantName: string;
  currency: string;
  rebate1Yearly: number | null;
  transactionAmount: number;
  rebateAmount: number;
  rebateAmountEUR: number;
}

interface TableFilters {
  provider: string;
  product: string;
  merchant: string;
  search: string;
}

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// Function to get processed merchant name (same as export logic)
function getMerchantNameNew(rebate: CalculatedRebate): string {
  const originalTransaction = rebate.originalTransaction;
  if (!originalTransaction) return '';
  
  // If MCC 4511, process special cases
  if (originalTransaction.transactionMerchantCategoryCode === 4511) {
    const merchantName = (originalTransaction.merchantName || '').toLowerCase();
    const transactionMerchantName = (originalTransaction.transactionMerchantName || '').toLowerCase();
    
    if (merchantName.includes('air europa') || transactionMerchantName.includes('air europa')) {
      return 'Air Europa (UX)';
    } else if (merchantName.includes('air greenland') || transactionMerchantName.includes('air greenland')) {
      return 'Air Greenland (GL)';
    } else if (merchantName.includes('latam') || transactionMerchantName.includes('latam')) {
      return 'LATAM Airlines Group';
    }
  }
  
  return originalTransaction.merchantName || '';
}

export const RebateTable: React.FC<RebateTableProps> = () => {
  const [groupedRebates, setGroupedRebates] = useState<GroupedRebateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<{ totalRebates: number; chunks: number } | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<TableFilters>({
    provider: '',
    product: '',
    merchant: '',
    search: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0
  });
  
  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    providers: [] as string[],
    products: [] as string[],
    merchants: [] as string[]
  });

  // Load grouped data on mount
  useEffect(() => {
    loadGroupedData();
  }, []);

  const loadGroupedData = async () => {
    setLoading(true);
    
    try {
      console.log('[RebateTable] Loading cached export data...');
      
      // First try to load cached export data
      const cachedDataStr = localStorage.getItem('detailedTableData');
      if (cachedDataStr) {
        const cachedData = JSON.parse(cachedDataStr);
        console.log(`[RebateTable] Found cached data: ${cachedData.totalGroups} groups exported at ${cachedData.exportedAt}`);
        
        const grouped = cachedData.data || [];
        setGroupedRebates(grouped);
        
        // Set filter options from cached data
        const providers = [...new Set(grouped.map((g: any) => g.providerCustomerName))].sort();
        const products = [...new Set(grouped.map((g: any) => g.productName))].sort();
        const merchants = [...new Set(grouped.map((g: any) => g.merchantName).filter((m: string) => m !== '-'))].sort();
        
        console.log(`[RebateTable] Filter options: ${providers.length} providers, ${products.length} products, ${merchants.length} merchants`);
        console.log('[RebateTable] Sample providers:', providers.slice(0, 3));
        console.log('[RebateTable] Sample products:', products.slice(0, 3));
        console.log('[RebateTable] Sample merchants:', merchants.slice(0, 3));
        
        setFilterOptions({ providers, products, merchants });
        
        // Set metadata for display
        setMetadata({ totalRebates: grouped.length, chunks: 1 });
        
        console.log(`[RebateTable] Loaded ${grouped.length} cached grouped rows`);
        return;
      }
      
      console.log('[RebateTable] No cached data found, checking for database...');
      
      // Fallback: check if we have calculated rebates in database
      const meta = await window.electronAPI.db.getCalculatedRebatesMetadata();
      if (meta && meta.totalRebates > 0) {
        setMetadata(meta);
        setGroupedRebates([]);
        
        console.log(`[RebateTable] Found ${meta.totalRebates} rebates in database. Please export data first to populate this table.`);
      } else {
        setMetadata(null);
        setGroupedRebates([]);
        console.log('[RebateTable] No data found. Please import and calculate rebates first.');
      }
      
    } catch (error) {
      console.error('[RebateTable] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to grouped data
  const filteredData = useMemo(() => {
    return groupedRebates.filter(row => {
      if (filters.provider && row.providerCustomerName !== filters.provider) return false;
      if (filters.product && row.productName !== filters.product) return false;
      if (filters.merchant && row.merchantName !== filters.merchant) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches = (
          row.providerCustomerName.toLowerCase().includes(search) ||
          row.productName.toLowerCase().includes(search) ||
          row.merchantName.toLowerCase().includes(search)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [groupedRebates, filters]);
  
  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredData.slice(startIndex, endIndex);
  };
  
  // Update pagination when filters change
  useEffect(() => {
    const totalPages = Math.ceil(filteredData.length / pagination.pageSize);
    setPagination(prev => ({
      ...prev,
      totalCount: filteredData.length,
      totalPages,
      currentPage: Math.min(prev.currentPage, Math.max(1, totalPages)) // Keep current page within bounds
    }));
  }, [filteredData, pagination.pageSize]);

  const handleFilterChange = (key: keyof TableFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(filteredData.length / pagination.pageSize);
    if (newPage >= 1 && newPage <= totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize: newSize,
      currentPage: 1,
      totalPages: Math.ceil(filteredData.length / newSize)
    }));
  };

  const clearFilters = () => {
    setFilters({
      provider: '',
      product: '',
      merchant: '',
      search: ''
    });
  };

  if (!metadata) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4 max-w-md">
            To view the detailed rebates table, please first import your files, calculate rebates, and export the data.
          </p>
          <div className="text-sm text-gray-500">
            Go to <span className="font-medium">Import Files</span> → <span className="font-medium">Results</span> → <span className="font-medium">Export</span>
          </div>
        </div>
      </div>
    );
  }

  if (metadata && groupedRebates.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-blue-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Export Data to View Table</h3>
          <p className="text-gray-600 mb-4 max-w-md">
            Rebates have been calculated, but no export data is cached yet. Please export your data first to view it here.
          </p>
          <div className="text-sm text-gray-500">
            Go to <span className="font-medium">Results</span> → <span className="font-medium">Export All to Excel</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rebates Table</h1>
            <p className="text-gray-600 mt-2">
              Grouped view showing {groupedRebates.length} unique provider/product/merchant combinations (same as export format)
            </p>
          </div>
          <Badge className="text-lg px-3 py-1">
            {groupedRebates.length.toLocaleString()} Grouped Rows
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Filters</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <Input
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            {/* Provider Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <Select
                value={filters.provider}
                onChange={(e) => handleFilterChange('provider', e.target.value)}
                options={[
                  { value: '', label: 'All Providers' },
                  ...filterOptions.providers.map(provider => ({ value: provider, label: provider }))
                ]}
              />
            </div>

            {/* Product Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <Select
                value={filters.product}
                onChange={(e) => handleFilterChange('product', e.target.value)}
                options={[
                  { value: '', label: 'All Products' },
                  ...filterOptions.products.map(product => ({ value: product, label: product }))
                ]}
              />
            </div>

            {/* Merchant Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
              <Select
                value={filters.merchant}
                onChange={(e) => handleFilterChange('merchant', e.target.value)}
                options={[
                  { value: '', label: 'All Merchants' },
                  ...filterOptions.merchants.map(merchant => ({ value: merchant, label: merchant }))
                ]}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <div className="text-sm text-gray-600">
              Showing {getCurrentPageData().length} of {filteredData.length.toLocaleString()} grouped rebates
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Rebates Data</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <Select
                value={pagination.pageSize.toString()}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                className="w-20"
                options={[
                  { value: '100', label: '100' },
                  { value: '250', label: '250' },
                  { value: '500', label: '500' },
                  { value: '1000', label: '1000' }
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading data...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider Customer Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Merchant Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rebate 1 Yearly
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rebate Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rebate Amount EUR
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentPageData().map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.providerCustomerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.merchantName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.rebate1Yearly !== null ? `${row.rebate1Yearly.toFixed(3)}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        €{row.transactionAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        €{row.rebateAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                        €{row.rebateAmountEUR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
        <div className="flex-1 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing page {pagination.currentPage} of {Math.ceil(filteredData.length / pagination.pageSize)} 
            {' '}({filteredData.length.toLocaleString()} filtered results)
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              disabled={pagination.currentPage === 1}
              onClick={() => handlePageChange(pagination.currentPage - 1)}
            >
              Previous
            </Button>
            
            {/* Page numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, Math.ceil(filteredData.length / pagination.pageSize)) }, (_, i) => {
                const pageNum = pagination.currentPage - 2 + i;
                const totalPages = Math.ceil(filteredData.length / pagination.pageSize);
                if (pageNum < 1 || pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.currentPage ? "primary" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              disabled={pagination.currentPage >= Math.ceil(filteredData.length / pagination.pageSize)}
              onClick={() => handlePageChange(pagination.currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};