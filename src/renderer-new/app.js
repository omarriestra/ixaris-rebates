// Ixaris Rebates Calculator - Vanilla JavaScript App
// Clean, minimal frontend using existing backend APIs

class IxarisApp {
  constructor() {
    this.currentPage = 'import';
    this.importState = this.loadImportState();
    this.calculationSummary = this.loadCalculationSummary();
    
    this.init();
  }

  async init() {
    // Initialize database connection
    try {
      if (window.electronAPI) {
        await window.electronAPI.db.initialize();
        console.log('✅ Database initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      this.showNotification('error', 'Database initialization failed');
    }

    // Setup navigation
    this.setupNavigation();
    
    // Load initial page based on URL or state
    const page = this.getPageFromUrl() || this.determineStartPage();
    this.navigateTo(page);
    
    // Update sidebar status
    this.updateSidebarStatus();
  }

  // Navigation
  setupNavigation() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      const page = this.getPageFromUrl() || 'import';
      this.showPage(page);
      this.updateNavigation(page);
    });

    // Setup nav item clicks
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        if (!item.disabled) {
          const page = item.dataset.page;
          this.navigateTo(page);
        }
      });
    });
  }

  navigateTo(page) {
    // Update URL without reload
    const url = page === 'import' ? '/' : `/${page}`;
    window.history.pushState({ page }, '', url);
    
    // Show page content
    this.showPage(page);
    this.updateNavigation(page);
    this.currentPage = page;
  }

  getPageFromUrl() {
    const path = window.location.pathname;
    if (path === '/') return 'import';
    if (path === '/results') return 'results';
    if (path === '/table') return 'table';
    return null;
  }

  determineStartPage() {
    // If we have calculation results, start on results page
    if (this.calculationSummary) return 'results';
    
    // If we have imported files, start on import page
    if (this.hasImportedFiles()) return 'import';
    
    // Default to import page
    return 'import';
  }

  showPage(page) {
    // Hide all pages
    document.querySelectorAll('[data-page-content]').forEach(el => {
      el.classList.add('hidden');
    });

    // Show target page
    const pageEl = document.querySelector(`[data-page-content="${page}"]`);
    if (pageEl) {
      pageEl.classList.remove('hidden');
      
      // Update page title
      this.updatePageTitle(page);
      
      // Initialize page-specific functionality
      this.initializePage(page);
    }
  }

  updatePageTitle(page) {
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
      const titles = {
        'import': 'Import Files',
        'results': 'Calculation Results', 
        'table': 'Detailed Table'
      };
      titleEl.textContent = titles[page] || 'Ixaris Rebates Calculator';
    }
  }

  updateNavigation(currentPage) {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      const page = item.dataset.page;
      item.classList.toggle('active', page === currentPage);
      
      // Update disabled state based on data availability
      if (page === 'results' || page === 'table') {
        const hasResults = this.calculationSummary || this.hasCalculatedResults();
        item.disabled = !hasResults;
      }
    });
  }

  // Page Initialization
  initializePage(page) {
    switch (page) {
      case 'import':
        this.initializeImportPage();
        break;
      case 'results':
        this.initializeResultsPage();
        break;
      case 'table':
        this.initializeTablePage();
        break;
    }
  }

  // Import Page
  initializeImportPage() {
    // Render current import state
    this.renderImportCards();
    
    // Setup file selection handlers
    this.setupFileHandlers();
    
    // Setup calculate button
    this.setupCalculateButton();
    
    // Show session status if files are loaded
    this.updateSessionStatus();
  }

  renderImportCards() {
    const requiredFiles = [
      { key: 'transactions', title: 'Transaction Data', description: 'Main transaction file for calculation', required: true },
      { key: 'visaMCOMonthly', title: 'Visa/MCO Monthly Rates', description: 'Monthly rebate rates for Visa/Mastercard', required: true },
      { key: 'visaMCOYearly', title: 'Visa/MCO Yearly Rates', description: 'Yearly rebate rates for Visa/Mastercard', required: true },
    ];

    const optionalFiles = [
      { key: 'partnerPayMonthly', title: 'PartnerPay Monthly', description: 'Monthly PartnerPay rates', required: false },
      { key: 'partnerPayYearly', title: 'PartnerPay Yearly', description: 'Yearly PartnerPay rates', required: false },
      { key: 'airlinesMCC', title: 'Airlines MCC', description: 'Airline merchant codes', required: false },
      { key: 'regionCountry', title: 'Region Country', description: 'Regional mapping rules', required: false },
      { key: 'voyagePrive', title: 'Voyage Prive', description: 'Special Voyage Prive rules', required: false },
    ];

    // Render required files
    const requiredContainer = document.getElementById('file-cards');
    if (requiredContainer) {
      requiredContainer.innerHTML = requiredFiles.map(type => this.renderFileCard(type)).join('');
    }

    // Render optional files
    const optionalContainer = document.getElementById('optional-files');
    if (optionalContainer) {
      optionalContainer.innerHTML = optionalFiles.map(type => this.renderFileCard(type)).join('');
    }
  }

  renderFileCard(type) {
    const status = this.importState[type.key] || { loaded: false, rowCount: 0, fileName: null };
    const requiredBadge = type.required ? '<span class="text-xs font-medium text-red-500">*Required</span>' : '';
    
    return `
      <div class="file-card ${status.loaded ? 'loaded' : ''}" data-file-type="${type.key}">
        <div class="file-card-title">
          ${type.title}
          ${requiredBadge}
        </div>
        <div class="file-card-description">${type.description}</div>
        
        ${status.loaded ? `
          <div class="file-card-status">
            <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
            ${status.fileName} (${status.rowCount.toLocaleString()} rows)
          </div>
        ` : ''}
        
        <div class="mt-4">
          <button class="btn btn-primary btn-sm" data-upload="${type.key}">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            ${status.loaded ? 'Replace' : 'Import'} File
          </button>
        </div>
      </div>
    `;
  }

  setupFileHandlers() {
    document.querySelectorAll('[data-upload]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const fileType = e.target.closest('[data-upload]').dataset.upload;
        await this.handleFileUpload(fileType);
      });
    });
  }

  async handleFileUpload(fileType) {
    try {
      this.showLoading(`Selecting ${fileType} file...`);
      
      const filePath = await window.electronAPI.csvSelectFile(
        `Select ${fileType} CSV file`,
        ['csv']
      );
      
      if (!filePath) {
        this.hideLoading();
        return;
      }

      this.showLoading(`Importing ${fileType}...`);

      // Call appropriate import method
      let importResult;
      switch (fileType) {
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
        default:
          throw new Error(`Unknown file type: ${fileType}`);
      }

      if (!importResult.success) {
        throw new Error(importResult.errors?.join(', ') || 'Import failed');
      }

      // Update import state
      this.importState[fileType] = {
        fileName: filePath.split('/').pop() || filePath,
        rowCount: importResult.rowsImported,
        loaded: true,
        data: null
      };

      this.saveImportState();
      this.renderImportCards();
      this.updateSessionStatus();
      this.updateSidebarStatus();

      this.showNotification('success', `${fileType}: ${importResult.rowsImported.toLocaleString()} rows imported`);

    } catch (error) {
      console.error('File upload error:', error);
      this.showNotification('error', `Failed to import ${fileType}: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  setupCalculateButton() {
    const btn = document.getElementById('calculate-btn');
    btn.addEventListener('click', () => this.calculateRebates());
    
    // Update button state
    this.updateCalculateButton();
  }

  updateCalculateButton() {
    const btn = document.getElementById('calculate-btn');
    const canCalculate = this.canCalculate();
    
    btn.disabled = !canCalculate;
    
    if (!canCalculate) {
      btn.innerHTML = `
        <svg class="nav-icon text-warning" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        Please import required files
      `;
    } else {
      btn.innerHTML = `
        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>
        Calculate Rebates
      `;
    }
  }

  async calculateRebates() {
    if (!this.canCalculate()) return;

    try {
      this.showLoading('Calculating rebates...');
      
      const result = await window.electronAPI.rebate.calculate({
        folderPath: 'imported_via_simple_import',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      });

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Calculation failed');
      }

      // Save calculation summary
      this.calculationSummary = {
        totalRebates: result.rebatesCalculated,
        totalAmount: result.totalRebateAmountEur,
        calculatedAt: new Date().toISOString(),
        processingTime: result.processingTime
      };
      
      this.saveCalculationSummary();
      this.updateSidebarStatus();

      this.showNotification('success', `Calculated ${result.rebatesCalculated.toLocaleString()} rebates successfully!`);
      
      // Navigate to results
      setTimeout(() => {
        this.navigateTo('results');
      }, 1500);

    } catch (error) {
      console.error('Calculation error:', error);
      this.showNotification('error', `Calculation failed: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  // Results Page
  initializeResultsPage() {
    this.renderCalculationSummary();
    this.setupExportButton();
  }

  renderCalculationSummary() {
    const container = document.getElementById('calculation-summary');
    
    if (!this.calculationSummary) {
      container.innerHTML = `
        <div class="text-center text-muted">
          <p>No calculation results available.</p>
          <button class="btn btn-primary mt-4" onclick="app.navigateTo('import')">
            Import Files to Calculate
          </button>
        </div>
      `;
      return;
    }

    const summary = this.calculationSummary;
    const calculatedDate = new Date(summary.calculatedAt).toLocaleString();
    
    container.innerHTML = `
      <div class="grid grid-2 mb-8">
        <div class="card">
          <div class="card-body text-center">
            <div class="text-lg font-semibold text-accent mb-2">
              €${summary.totalAmount?.toLocaleString() || '0'}
            </div>
            <div class="text-sm text-secondary">Total Rebate Amount</div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-body text-center">
            <div class="text-lg font-semibold text-accent mb-2">
              ${summary.totalRebates?.toLocaleString() || '0'}
            </div>
            <div class="text-sm text-secondary">Rebates Calculated</div>
          </div>
        </div>
      </div>
      
      <div class="card mb-6">
        <div class="card-header">
          <div class="card-title">Calculation Details</div>
        </div>
        <div class="card-body">
          <div class="grid grid-2 text-sm">
            <div>
              <span class="text-secondary">Calculated:</span>
              <span class="font-medium">${calculatedDate}</span>
            </div>
            <div>
              <span class="text-secondary">Processing Time:</span>
              <span class="font-medium">${summary.processingTime || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupExportButton() {
    const btn = document.getElementById('export-btn');
    if (btn) {
      btn.addEventListener('click', () => this.exportResults());
      btn.disabled = !this.calculationSummary;
    }
  }

  async exportResults() {
    if (!this.calculationSummary) return;

    try {
      this.showLoading('Preparing export data...');

      // Get metadata to understand data structure
      const metadata = await window.electronAPI.db.getCalculatedRebatesMetadata();
      
      if (!metadata || metadata.totalRebates === 0) {
        throw new Error('No calculation data available for export');
      }

      this.showLoading('Generating Excel file...');

      // For now, export just the summary data
      // TODO: Add chunked processing for full data export if needed
      const exportData = [{
        'Summary': 'Total Rebate Amount',
        'Value': `€${this.calculationSummary.totalAmount?.toLocaleString() || '0'}`,
        'Count': this.calculationSummary.totalRebates?.toLocaleString() || '0',
        'Calculated': new Date(this.calculationSummary.calculatedAt).toLocaleDateString()
      }];

      const filePath = await window.electronAPI.file.exportExcel({
        data: exportData,
        filename: `ixaris_rebates_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Rebates Summary'
      });

      if (filePath) {
        this.showNotification('success', 'Excel file exported successfully!');
      }

    } catch (error) {
      console.error('Export error:', error);
      this.showNotification('error', `Export failed: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  // Table Page
  initializeTablePage() {
    this.renderDataTable();
  }

  async renderDataTable() {
    const container = document.getElementById('data-table');
    
    if (!this.calculationSummary) {
      container.innerHTML = `
        <div class="text-center text-muted">
          <p>No data available to display.</p>
        </div>
      `;
      return;
    }

    try {
      this.showLoading('Loading table data...');

      // Get metadata
      const metadata = await window.electronAPI.db.getCalculatedRebatesMetadata();
      
      if (!metadata || metadata.totalRebates === 0) {
        container.innerHTML = `
          <div class="text-center text-muted">
            <p>No detailed data available.</p>
          </div>
        `;
        return;
      }

      // Load first chunk for display
      const firstChunk = await window.electronAPI.db.getCalculatedRebatesChunk(0);
      
      if (firstChunk && firstChunk.length > 0) {
        // Display first 100 rows
        const displayData = firstChunk.slice(0, 100);
        container.innerHTML = this.renderTable(displayData, metadata);
      }

    } catch (error) {
      console.error('Table loading error:', error);
      container.innerHTML = `
        <div class="text-center text-muted">
          <p>Error loading table data: ${error.message}</p>
        </div>
      `;
    } finally {
      this.hideLoading();
    }
  }

  renderTable(data, metadata) {
    const totalText = metadata ? ` (showing first 100 of ${metadata.totalRebates.toLocaleString()})` : '';
    
    return `
      <div class="mb-4">
        <p class="text-sm text-secondary">Detailed Rebate Calculations${totalText}</p>
      </div>
      
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Product</th>
              <th>Currency</th>
              <th>Level</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Amount EUR</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                <td class="text-sm">${row.providerCustomerCode || ''}</td>
                <td class="text-sm">${row.productName || ''}</td>
                <td class="text-sm">${row.originalTransaction?.transactionCurrency || ''}</td>
                <td class="text-sm">Level ${row.rebateLevel}</td>
                <td class="text-sm">${row.rebatePercentage?.toFixed(3)}%</td>
                <td class="text-sm">${row.rebateAmount?.toLocaleString()}</td>
                <td class="text-sm font-medium">€${row.rebateAmountEUR?.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Utility Methods
  canCalculate() {
    return this.importState.transactions?.loaded &&
           this.importState.visaMCOMonthly?.loaded &&
           this.importState.visaMCOYearly?.loaded;
  }

  hasImportedFiles() {
    return Object.values(this.importState).some(file => file?.loaded);
  }

  hasCalculatedResults() {
    return Boolean(this.calculationSummary);
  }

  updateSessionStatus() {
    const statusEl = document.getElementById('session-status');
    if (!statusEl) return;

    const loadedFiles = Object.values(this.importState).filter(file => file?.loaded);
    const totalRows = loadedFiles.reduce((sum, file) => sum + (file?.rowCount || 0), 0);

    if (loadedFiles.length > 0) {
      statusEl.classList.remove('hidden');
      statusEl.innerHTML = `
        <div class="notification notification-success">
          <div>
            <div class="font-medium">Session Active</div>
            <div class="text-sm">${loadedFiles.length} files loaded, ${totalRows.toLocaleString()} total rows</div>
          </div>
          <button class="btn btn-sm" onclick="app.clearSession()">Clear Session</button>
        </div>
      `;
    } else {
      statusEl.classList.add('hidden');
    }
  }

  updateSidebarStatus() {
    // Update data status indicators
    document.querySelector('[data-status="configuration"]')?.classList.toggle('active', true);
    document.querySelector('[data-status="files"]')?.classList.toggle('active', this.hasImportedFiles());
    document.querySelector('[data-status="rebates"]')?.classList.toggle('active', this.hasCalculatedResults());
    
    // Update nav item states
    this.updateNavigation(this.currentPage);
  }

  clearSession() {
    this.importState = {};
    this.calculationSummary = null;
    localStorage.removeItem('ixaris_import_state');
    localStorage.removeItem('ixaris_calculation_summary');
    
    this.renderImportCards();
    this.updateSessionStatus();
    this.updateSidebarStatus();
    
    this.showNotification('success', 'Session cleared successfully');
  }

  // State Management
  loadImportState() {
    try {
      const saved = localStorage.getItem('ixaris_import_state');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  saveImportState() {
    localStorage.setItem('ixaris_import_state', JSON.stringify(this.importState));
  }

  loadCalculationSummary() {
    try {
      const saved = localStorage.getItem('ixaris_calculation_summary');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  saveCalculationSummary() {
    localStorage.setItem('ixaris_calculation_summary', JSON.stringify(this.calculationSummary));
  }

  // UI Helpers
  showNotification(type, message, duration = 5000) {
    const container = document.getElementById('notifications');
    if (!container) return;

    const id = Date.now();
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <svg class="nav-icon" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
      </svg>
      <div>
        <div class="font-medium">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
        <div class="text-sm">${message}</div>
      </div>
    `;

    container.appendChild(notification);

    // Auto remove
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, duration);
  }

  showLoading(message) {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.classList.remove('hidden');
      const messageEl = loader.querySelector('[data-loading-message]');
      if (messageEl) messageEl.textContent = message;
    }
  }

  hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.classList.add('hidden');
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new IxarisApp();
});