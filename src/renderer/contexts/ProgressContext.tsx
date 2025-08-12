import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProcessingProgress, ProgressContextType } from '../../shared/types';

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const useProgress = (): ProgressContextType => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

interface ProgressProviderProps {
  children: ReactNode;
}

export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);

  const updateProgress = (newProgress: ProcessingProgress): void => {
    setProgress(newProgress);
  };

  const clearProgress = (): void => {
    setProgress(null);
  };

  const isProcessing = progress !== null && progress.stage !== 'complete';

  // Listen for progress updates from the main process
  useEffect(() => {
    const handleProgressUpdate = (progressData: ProcessingProgress) => {
      setProgress(progressData);
    };

    window.electronAPI.progress.onUpdate(handleProgressUpdate);

    return () => {
      window.electronAPI.progress.removeAllListeners();
    };
  }, []);

  const value: ProgressContextType = {
    progress,
    setProgress: updateProgress,
    clearProgress,
    isProcessing
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};