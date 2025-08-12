import React, { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { NotificationContainer } from './NotificationContainer';
import { ProgressBar } from './ProgressBar';
import { useProgress } from '../contexts/ProgressContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { progress, isProcessing } = useProgress();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        {/* Progress Bar */}
        {isProcessing && progress && (
          <ProgressBar 
            progress={progress.percentage} 
            message={progress.message}
            stage={progress.stage}
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
      
      <NotificationContainer />
    </div>
  );
};