import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppConfiguration, ConfigurationContextType } from '../../shared/types';

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

export const useConfiguration = (): ConfigurationContextType => {
  const context = useContext(ConfigurationContext);
  if (!context) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};

interface ConfigurationProviderProps {
  children: ReactNode;
}

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({ children }) => {
  const [configuration, setConfiguration] = useState<AppConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfiguration = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const config = await window.electronAPI.db.getConfiguration();
      if (config) {
        setConfiguration({
          folderPath: config.folder_path,
          year: config.year,
          month: config.month
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(errorMessage);
      console.error('Error loading configuration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async (config: AppConfiguration): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await window.electronAPI.db.saveConfiguration({
        folder_path: config.folderPath,
        year: config.year,
        month: config.month
      });
      setConfiguration(config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(errorMessage);
      console.error('Error saving configuration:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfiguration = (config: AppConfiguration): void => {
    setConfiguration(config);
  };

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const value: ConfigurationContextType = {
    configuration,
    setConfiguration: updateConfiguration,
    loadConfiguration,
    saveConfiguration,
    isLoading,
    error
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};