import React from 'react';
import { TaskStatus } from '../types';

interface StatusBadgeProps {
  status: TaskStatus;
  attempt?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, attempt }) => {
  const styles = {
    [TaskStatus.IDLE]: 'bg-gray-100 text-gray-600',
    [TaskStatus.PENDING]: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    [TaskStatus.PROCESSING]: 'bg-blue-50 text-blue-700 border border-blue-200',
    [TaskStatus.RUNNING]: 'bg-blue-50 text-blue-700 border border-blue-200',
    [TaskStatus.COMPLETED]: 'bg-green-50 text-green-700 border border-green-200',
    [TaskStatus.FAILED]: 'bg-red-50 text-red-700 border border-red-200',
  };

  const labels = {
    [TaskStatus.IDLE]: 'Idle',
    [TaskStatus.PENDING]: 'Pending',
    [TaskStatus.PROCESSING]: 'Sending...',
    [TaskStatus.RUNNING]: `Polling (${attempt})`,
    [TaskStatus.COMPLETED]: 'Completed',
    [TaskStatus.FAILED]: 'Failed',
  };

  const icons = {
    [TaskStatus.IDLE]: null,
    [TaskStatus.PENDING]: (
      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    [TaskStatus.PROCESSING]: (
      <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    ),
    [TaskStatus.RUNNING]: (
       <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    ),
    [TaskStatus.COMPLETED]: (
      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    [TaskStatus.FAILED]: (
      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  );
};