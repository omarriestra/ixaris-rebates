// Ixaris Rebates Calculator - Simple Frontend
class SimpleRebatesApp {
    constructor() {
        this.state = {
            files: {
                transactions: { loaded: false, count: 0 },
                visaMCOMonthly: { loaded: false, count: 0 },
                visaMCOYearly: { loaded: false, count: 0 },
                partnerPayMonthly: { loaded: false, count: 0 },
                partnerPayYearly: { loaded: false, count: 0 },
                airlinesMCC: { loaded: false, count: 0 },
                regionCountry: { loaded: false, count: 0 },
                voyagePrive: { loaded: false, count: 0 }
            },
            results: null
        };
        this.init();
    }

    init() {
        console.log('🚀 Simple Rebates App initialized');
        this.setupEventListeners();
        this.updateUI();
        this.testAPI();
    }

    async testAPI() {
        try {
            const result = await window.electronAPI.testAPI();
            console.log('✅ API test:', result);
            this.showNotification('success', 'Application ready!');
        } catch (error) {
            console.error('❌ API test failed:', error);
            this.showNotification('error', 'API connection failed');
        }
    }

    setupEventListeners() {
        // Import buttons
        document.querySelectorAll('.btn-import').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const importType = e.target.dataset.import;
                this.handleImport(importType);
            });
        });

        // Calculate button
        document.getElementById('calculate-btn').addEventListener('click', () => {
            this.calculateRebates();
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportResults();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    async handleImport(importType) {
        try {
            this.showLoading(`Selecting ${importType} file...`);

            // Select file
            const filePath = await window.electronAPI.csvSelectFile(`Select ${importType} CSV file`);
            
            if (!filePath) {
                this.hideLoading();
                return;
            }

            this.showLoading(`Importing ${importType}...`);

            // Import based on type
            let result;
            switch (importType) {
                case 'transactions':
                    result = await window.electronAPI.csvImportTransactions(filePath);
                    break;
                case 'visaMCOMonthly':
                    result = await window.electronAPI.csvImportVisaMCORebates(filePath, false);
                    break;
                case 'visaMCOYearly':
                    result = await window.electronAPI.csvImportVisaMCORebates(filePath, true);
                    break;
                case 'partnerPayMonthly':
                    result = await window.electronAPI.csvImportPartnerPayRebates(filePath, false);
                    break;
                case 'partnerPayYearly':
                    result = await window.electronAPI.csvImportPartnerPayRebates(filePath, true);
                    break;
                case 'airlinesMCC':
                    result = await window.electronAPI.csvImportAirlinesMCC(filePath);
                    break;
                case 'regionCountry':
                    result = await window.electronAPI.csvImportRegionCountry(filePath);
                    break;
                case 'voyagePrive':
                    result = await window.electronAPI.csvImportVoyagePriveRebates(filePath);
                    break;
                default:
                    throw new Error(`Unknown import type: ${importType}`);
            }

            if (result.success) {
                this.state.files[importType] = {
                    loaded: true,
                    count: result.rowsImported,
                    fileName: filePath.split('/').pop()
                };
                
                this.showNotification('success', `${importType}: ${result.rowsImported.toLocaleString()} rows imported`);
            } else {
                throw new Error(result.errors?.join(', ') || 'Import failed');
            }

        } catch (error) {
            console.error(`Import error for ${importType}:`, error);
            this.showNotification('error', `Failed to import ${importType}: ${error.message}`);
        } finally {
            this.hideLoading();
            this.updateUI();
        }
    }

    async calculateRebates() {
        try {
            this.showLoading('Calculating rebates...');

            const result = await window.electronAPI['rebate:calculate']({
                folderPath: 'imported',
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1
            });

            if (result.success) {
                this.state.results = result;
                this.showNotification('success', `Calculated ${result.rebatesCalculated.toLocaleString()} rebates!`);
                this.showResults();
            } else {
                throw new Error(result.errors?.join(', ') || 'Calculation failed');
            }

        } catch (error) {
            console.error('Calculation error:', error);
            this.showNotification('error', `Calculation failed: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async exportResults() {
        try {
            this.showLoading('Exporting results...');

            const fileName = `ixaris_rebates_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            const filePath = await window.electronAPI['file:exportExcel']({
                data: this.state.results?.summary || {},
                filename: fileName,
                sheetName: 'Rebates Summary'
            });

            if (filePath) {
                this.showNotification('success', 'Results exported successfully!');
            }

        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('error', `Export failed: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    updateUI() {
        // Update file cards
        Object.keys(this.state.files).forEach(fileType => {
            const card = document.querySelector(`[data-type="${fileType}"]`);
            const status = card?.querySelector('.file-status');
            const file = this.state.files[fileType];

            if (file.loaded) {
                card?.classList.add('loaded');
                if (status) {
                    status.textContent = `${file.count?.toLocaleString() || 0} rows loaded`;
                }
            } else {
                card?.classList.remove('loaded');
                if (status) {
                    status.textContent = 'Not loaded';
                }
            }
        });

        // Update calculate button
        const calculateBtn = document.getElementById('calculate-btn');
        const canCalculate = this.canCalculate();
        
        if (calculateBtn) {
            calculateBtn.disabled = !canCalculate;
            
            if (canCalculate) {
                document.getElementById('calc-status').textContent = 'Ready to calculate rebates';
            } else {
                document.getElementById('calc-status').textContent = 'Import required files to enable calculation';
            }
        }

        // Update status indicator
        const statusIndicator = document.getElementById('status-indicator');
        const loadedFiles = Object.values(this.state.files).filter(f => f.loaded).length;
        
        if (statusIndicator) {
            if (this.state.results) {
                statusIndicator.textContent = 'Results Ready';
                statusIndicator.style.background = '#dbeafe';
                statusIndicator.style.color = '#1e40af';
            } else if (loadedFiles > 0) {
                statusIndicator.textContent = `${loadedFiles} files loaded`;
                statusIndicator.style.background = '#fef3c7';
                statusIndicator.style.color = '#92400e';
            } else {
                statusIndicator.textContent = 'Ready';
                statusIndicator.style.background = '#dcfce7';
                statusIndicator.style.color = '#166534';
            }
        }
    }

    canCalculate() {
        // Need at least transactions and one rebate file
        return this.state.files.transactions.loaded && 
               (this.state.files.visaMCOMonthly.loaded || 
                this.state.files.visaMCOYearly.loaded ||
                this.state.files.partnerPayMonthly.loaded ||
                this.state.files.partnerPayYearly.loaded);
    }

    showResults() {
        const resultsSection = document.getElementById('results-section');
        const rebatesCount = document.getElementById('rebates-count');
        const totalAmount = document.getElementById('total-amount');

        if (resultsSection) resultsSection.style.display = 'block';
        if (rebatesCount) rebatesCount.textContent = this.state.results.rebatesCalculated?.toLocaleString() || '0';
        if (totalAmount) totalAmount.textContent = `€${(this.state.results.totalRebateAmountEur || 0).toLocaleString()}`;
        
        // Scroll to results
        resultsSection?.scrollIntoView({ behavior: 'smooth' });
    }

    showLoading(message) {
        const loading = document.getElementById('loading');
        const loadingMessage = document.getElementById('loading-message');
        
        if (loading) loading.classList.remove('hidden');
        if (loadingMessage) loadingMessage.textContent = message;
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hidden');
    }

    showNotification(type, message, duration = 4000) {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        }[type] || 'ℹ️';

        notification.innerHTML = `
            <span style="font-size: 1.2rem;">${icon}</span>
            <div>
                <div style="font-weight: 500; color: #1f2937;">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">${message}</div>
            </div>
        `;

        notifications.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, duration);
    }
}

// Global debug functions
window.debugApp = function() {
    console.log('🔧 Debug Info:', {
        state: window.app?.state,
        electronAPI: Object.keys(window.electronAPI || {}),
        loadedFiles: Object.entries(window.app?.state?.files || {}).filter(([k, v]) => v.loaded)
    });
};

window.testAllButtons = function() {
    const buttons = document.querySelectorAll('.btn-import');
    console.log(`🔘 Testing ${buttons.length} import buttons...`);
    
    buttons.forEach((btn, i) => {
        const type = btn.dataset.import;
        console.log(`Button ${i + 1}: ${type}`);
    });
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SimpleRebatesApp();
    
    console.log('📚 Available debug commands:');
    console.log('debugApp() - Show app state and available APIs');
    console.log('testAllButtons() - List all import buttons');
    console.log('app.testAPI() - Test API connection');
});

// Add CSS animation for slide out
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);