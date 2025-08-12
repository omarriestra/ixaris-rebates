import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigurationProvider } from './contexts/ConfigurationContext';
import { ProgressProvider } from './contexts/ProgressContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
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
        console.log('🔌 Checking for electronAPI...');
        if (window.electronAPI) {
          console.log('✅ ElectronAPI found, initializing database...');
          await window.electronAPI.db.initialize();
          console.log('✅ Database initialized successfully');
        } else {
          console.warn('⚠️ ElectronAPI not found, running in browser mode');
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
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

  return (
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
                </Routes>
              </Layout>
            </Router>
          </ProgressProvider>
        </DataProvider>
      </ConfigurationProvider>
    </NotificationProvider>
  );
};