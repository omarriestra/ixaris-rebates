import React from 'react';
import { ProcessingStage } from '../../shared/types';

interface ProgressBarProps {
  progress: number;
  message: string;
  stage: ProcessingStage;
  details?: string;
}

const getStageColor = (stage: ProcessingStage): string => {
  switch (stage) {
    case 'validation':
      return 'bg-warning-500';
    case 'loading':
      return 'bg-primary-500';
    case 'calculation':
      return 'bg-success-500';
    case 'complete':
      return 'bg-success-600';
    default:
      return 'bg-primary-500';
  }
};

const getStageLabel = (stage: ProcessingStage): string => {
  switch (stage) {
    case 'validation':
      return 'Validating Files';
    case 'loading':
      return 'Loading Data';
    case 'calculation':
      return 'Calculating Rebates';
    case 'complete':
      return 'Complete';
    default:
      return 'Processing';
  }
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  message, 
  stage, 
  details 
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStageColor(stage)}`}></div>
            <span className="text-sm font-medium text-gray-700">
              {getStageLabel(stage)}
            </span>
          </div>
          <span className="text-sm text-gray-500">{message}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {clampedProgress.toFixed(0)}%
          </span>
          
          {stage !== 'complete' && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          )}
        </div>
      </div>
      
      <div className="progress-bar">
        <div 
          className={`progress-fill ${getStageColor(stage)}`}
          style={{ width: `${clampedProgress}%` }}
        ></div>
      </div>
      
      {details && (
        <div className="mt-2">
          <p className="text-xs text-gray-500">{details}</p>
        </div>
      )}
    </div>
  );
};