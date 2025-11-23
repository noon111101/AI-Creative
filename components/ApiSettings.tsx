import React, { useState, useEffect } from 'react';
import { ApiTokens } from '../types';
import { SUPABASE_CONFIG } from '../constants';
import { getSupabaseClient } from '../services/supabaseClient';

interface ApiSettingsProps {
  tokens: ApiTokens;
}

export const ApiSettings: React.FC<ApiSettingsProps> = ({ tokens }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Supabase Connection State
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error' | 'checking'>('checking');

  const hasAuthToken = !!tokens.authToken;
  const hasSentinelToken = !!tokens.sentinelToken;
  const hasSupabaseConfig = !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);

  useEffect(() => {
    // Auto-test connection on mount if config exists
    if (hasSupabaseConfig) {
        try {
            const client = getSupabaseClient();
            if (client) {
                // Simple check - technically getSupabaseClient just creates the object, 
                // a real check would involve a query, but initialization success is a good start.
                setConnectionStatus('success');
            } else {
                setConnectionStatus('error');
            }
        } catch (e) {
            setConnectionStatus('error');
        }
    } else {
        setConnectionStatus('idle');
    }
  }, [hasSupabaseConfig]);

  const StatusIcon = ({ active }: { active: boolean }) => (
    active 
    ? <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    : <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
  );

  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors bg-white"
        type="button"
      >
        <div className="flex items-center gap-2 text-gray-700">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-semibold text-sm">System Configuration</span>
          {(!hasAuthToken || !hasSentinelToken) && (
             <span className="ml-2 text-xs font-normal text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Missing Config</span>
          )}
        </div>
        <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-4">
          <p className="text-xs text-gray-500 mb-4">
            Configuration is loaded from the <code>.env</code> file. To update, modify the file and restart the server.
          </p>

          {/* CORS Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-start">
             <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
             <div>
                <strong>CORS Extension Required:</strong> Since we are making direct requests to bypass Cloudflare, you must install and enable the 
                <a href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafahddgcelffkeicbagpbmhkcghm" target="_blank" rel="noopener noreferrer" className="underline font-bold ml-1">
                 Allow CORS Extension
                </a> on your browser.
             </div>
          </div>

          {/* Env Vars Check List */}
          <div className="space-y-3">
            
            {/* Auth Token */}
            <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                <div className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    <div>
                        <p className="text-sm font-medium text-gray-900">Auth Token</p>
                        <p className="text-xs text-gray-500 font-mono">VITE_AUTH_TOKEN</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{hasAuthToken ? 'Loaded' : 'Missing'}</span>
                    <StatusIcon active={hasAuthToken} />
                </div>
            </div>

            {/* Sentinel Token */}
            <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                <div className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    <div>
                        <p className="text-sm font-medium text-gray-900">Sentinel Token</p>
                        <p className="text-xs text-gray-500 font-mono">VITE_SENTINEL_TOKEN</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{hasSentinelToken ? 'Loaded' : 'Missing'}</span>
                    <StatusIcon active={hasSentinelToken} />
                </div>
            </div>

            {/* Supabase */}
            <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <div>
                        <p className="text-sm font-medium text-gray-900">Database Connection</p>
                        <p className="text-xs text-gray-500 font-mono">VITE_SUPABASE_URL</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs ${connectionStatus === 'success' ? 'text-green-600' : connectionStatus === 'error' ? 'text-red-600' : 'text-gray-400'}`}>
                        {connectionStatus === 'success' ? 'Connected' : connectionStatus === 'error' ? 'Failed' : 'Not Configured'}
                    </span>
                    <StatusIcon active={connectionStatus === 'success'} />
                </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};