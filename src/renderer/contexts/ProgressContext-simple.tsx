import React, { createContext, useContext, useState, ReactNode } from 'react';
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

  const updateProgress = (progress: ProcessingProgress): void => {
    setProgress(progress);
  };

  const clearProgress = (): void => {
    setProgress(null);
  };

  const isProcessing = progress !== null && progress.stage !== 'complete';

  const value: ProgressContextType = {
    progress,
    setProgress: updateProgress,
    clearProgress,
    isProcessing,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};