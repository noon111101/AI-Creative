import React, { useState } from 'react';
import { ApiTokens } from '../types';

interface ApiSettingsProps {
  tokens: ApiTokens;
  onSave: (tokens: ApiTokens) => void;
}

export const ApiSettings: React.FC<ApiSettingsProps> = ({ tokens, onSave }) => {
  // Auto-open if tokens are missing
  const [isOpen, setIsOpen] = useState(!tokens.authToken || !tokens.sentinelToken);
  const [localTokens, setLocalTokens] = useState<ApiTokens>(tokens);

  const handleChange = (field: keyof ApiTokens, value: string) => {
    const updated = { ...localTokens, [field]: value };
    setLocalTokens(updated);
    onSave(updated);
  };

  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${!tokens.authToken ? 'bg-yellow-50' : 'bg-white'}`}
        type="button"
      >
        <div className="flex items-center gap-2 text-gray-700">
          <svg className={`w-5 h-5 ${!tokens.authToken ? 'text-yellow-500' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-semibold text-sm">
            API Configuration
            {!tokens.authToken && <span className="ml-2 text-xs font-normal text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">Required</span>}
          </span>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Auth Token (Bearer)</label>
              <input 
                type="password"
                value={localTokens.authToken}
                onChange={(e) => handleChange('authToken', e.target.value)}
                placeholder="e.g. eyJhbGciOi..."
                className="block w-full rounded-md border-gray-300 bg-white border p-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Sentinel Token</label>
              <input 
                type="password"
                value={localTokens.sentinelToken}
                onChange={(e) => handleChange('sentinelToken', e.target.value)}
                placeholder="Sentinel token..."
                className="block w-full rounded-md border-gray-300 bg-white border p-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            You can also set defaults in <code>constants.ts</code> or these will be saved to your browser.
          </p>
        </div>
      )}
    </div>
  );
};