import React, { useState } from 'react';
import { Header } from './components/Header';
import { TaskList } from './components/TaskList';
import { ProgressBar } from './components/ProgressBar';
import { ApiSettings } from './components/ApiSettings';
import { INITIAL_JSON_TEMPLATE, STORAGE_KEYS, DEFAULT_API_TOKENS } from './constants';
import { useBatchQueue } from './hooks/useBatchQueue';
import { ApiTokens } from './types';

const App: React.FC = () => {
  const [jsonInput, setJsonInput] = useState(INITIAL_JSON_TEMPLATE);
  
  // Lazy initialization: Check localStorage first, then fall back to constants
  const [tokens, setTokens] = useState<ApiTokens>(() => {
    const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const savedSentinel = localStorage.getItem(STORAGE_KEYS.SENTINEL_TOKEN);
    
    return {
      authToken: savedAuth || DEFAULT_API_TOKENS.authToken || '',
      sentinelToken: savedSentinel || DEFAULT_API_TOKENS.sentinelToken || ''
    };
  });
  
  const { 
    tasks, 
    isProcessing, 
    globalError, 
    completedCount, 
    initializeQueue, 
    runBatch 
  } = useBatchQueue();

  const handleTokenSave = (newTokens: ApiTokens) => {
    setTokens(newTokens);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newTokens.authToken);
    localStorage.setItem(STORAGE_KEYS.SENTINEL_TOKEN, newTokens.sentinelToken);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newQueue = initializeQueue(jsonInput);
    if (newQueue) {
      runBatch(newQueue, tokens);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Header />

        <ApiSettings tokens={tokens} onSave={handleTokenSave} />

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            
            {/* Form Section */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="json-input" className="block text-sm font-semibold text-gray-700">
                    Task Configuration (JSON Array)
                  </label>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    Batch Processing
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    id="json-input"
                    rows={10}
                    className={`block w-full rounded-lg border-gray-300 bg-slate-50 p-4 font-mono text-sm text-slate-800 focus:border-brand-500 focus:ring-brand-500 shadow-inner transition-colors ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="Paste your JSON task array here..."
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    disabled={isProcessing}
                    spellCheck={false}
                  />
                  <div className="absolute bottom-3 right-3 pointer-events-none">
                     <span className="text-xs text-gray-400 opacity-50">JSON</span>
                  </div>
                </div>
              </div>

              {globalError && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 flex items-start">
                   <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                   <div>
                      <h4 className="text-sm font-medium text-red-800">Input Error</h4>
                      <p className="text-sm text-red-700 mt-1">{globalError}</p>
                   </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-all duration-200 
                  ${isProcessing 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-brand-600 hover:bg-brand-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500'
                  }`}
              >
                {isProcessing ? (
                   <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Running Batch Sequence...
                   </>
                ) : (
                   <>
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Start Processing
                   </>
                )}
              </button>
            </form>
            
            {/* Progress & Results Section */}
            {(tasks.length > 0) && (
               <div className="mt-8 border-t border-gray-100 pt-8">
                  <ProgressBar 
                    current={completedCount} 
                    total={tasks.length} 
                    isProcessing={isProcessing} 
                  />
                  <TaskList tasks={tasks} />
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;