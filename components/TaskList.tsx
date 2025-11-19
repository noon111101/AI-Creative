import React from 'react';
import { ProcessedTask, TaskStatus } from '../types';
import { StatusBadge } from './StatusBadge';

interface TaskListProps {
  tasks: ProcessedTask[];
}

export const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  if (tasks.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Queue</h3>
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {tasks.map((task) => (
            <li key={task.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-start justify-between space-x-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs font-mono text-gray-400">#{task.index}</span>
                     {task.apiId && (
                        <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            ID: {task.apiId.split('-')[0]}...
                        </span>
                     )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {task.input.prompt}
                  </p>
                  
                  {/* Result / Error Display */}
                  <div className="mt-2">
                    {task.status === TaskStatus.FAILED && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                            Error: {task.error}
                        </p>
                    )}
                    {task.status === TaskStatus.COMPLETED && task.result?.media_url && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded">
                            <a 
                                href={task.result.media_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-green-700 hover:underline flex items-center"
                            >
                                View Result Media
                                <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={task.status} attempt={task.attemptCount} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};