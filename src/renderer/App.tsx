import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigurationProvider } from './contexts/ConfigurationContext';
import { ProgressProvider } from './contexts/ProgressContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Results } from './pages/Results';
import { SimpleImport } from './pages/SimpleImport';
import { RebateTable } from './pages/RebateTable';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';

export const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔌 [App] Checking for electronAPI...');
        if (window.electronAPI) {
          console.log('✅ [App] ElectronAPI found, initializing database...');
          await window.electronAPI.db.initialize();
          console.log('✅ [App] Database initialized successfully');
        } else {
          console.warn('⚠️ [App] ElectronAPI not found, running in browser mode');
        }
        console.log('🎯 [App] Setting isInitialized to true...');
        setIsInitialized(true);
        console.log('✅ [App] Initialization complete');
      } catch (error) {
        console.error('[App] Failed to initialize app:', error);
        if (window.electronAPI) {
          await window.electronAPI.error.show('Failed to initialize database');
        }
        setIsInitialized(true); // Continue anyway
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Initializing Ixaris Rebates Calculator...</h2>
          <p className="text-gray-500 mt-2">Please wait while we set up the application.</p>
        </div>
      </div>
    );
  }

  console.log('🎨 [App] Rendering main app...');
  
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <ConfigurationProvider>
          <DataProvider>
            <ProgressProvider>
              <Router>
                <Layout>
                  <Routes>
                    <Route path="/" element={<SimpleImport />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/table" element={<RebateTable />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="*" element={
                      <div className="p-8 text-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                        <p className="text-gray-600">The requested page could not be found.</p>
                        <button 
                          onClick={() => window.location.hash = '#/'}
                          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                        >
                          Go Home
                        </button>
                      </div>
                    } />
                  </Routes>
                </Layout>
              </Router>
            </ProgressProvider>
          </DataProvider>
        </ConfigurationProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
};