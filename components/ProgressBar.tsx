import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  isProcessing: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, isProcessing }) => {
  if (total === 0) return null;
  
  const percentage = Math.min(100, Math.round((current / total) * 100));

  return (
    <div className="mb-6">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">
          {isProcessing ? 'Processing Batch...' : 'Batch Status'}
        </span>
        <span className="text-sm font-medium text-gray-500">
          {current}/{total} Completed ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-brand-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};