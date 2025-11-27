import React, { useState } from 'react';
import { Header } from './Header';
import { ApiSettings } from './ApiSettings';
import { ImageUploader } from './ImageUploader';
import { TaskList } from './TaskList';
import { ProgressBar } from './ProgressBar';
import { MediaGallery } from './MediaGallery';
import { useBatchQueue } from '../hooks/useBatchQueue';
import { DEFAULT_API_TOKENS, INITIAL_JSON_TEMPLATE, VARIANT_OPTIONS } from '../constants';
import ToastProvider from './ToastProvider';
import { GlobalBatchConfig } from '../types';

const SoraUI: React.FC = () => {
  const [jsonInput, setJsonInput] = useState(INITIAL_JSON_TEMPLATE);
  const [config, setConfig] = useState<GlobalBatchConfig>({
    aspectRatio: '3:2',
    nVariants: 1
  });
  
  const [galleryRefreshTrigger, setGalleryRefreshTrigger] = useState(0);

  const {
    tasks,
    isProcessing,
    globalError,
    completedCount,
    initializeQueue,
    runBatch
  } = useBatchQueue();

  const handleRunBatch = async () => {
    const queuedTasks = initializeQueue(jsonInput, config);
    if (queuedTasks) {
      await runBatch(queuedTasks, DEFAULT_API_TOKENS);
      setGalleryRefreshTrigger(prev => prev + 1);
    }
  };

  const handleUploadSuccess = () => {
    setGalleryRefreshTrigger(prev => prev + 1);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-5xl mx-auto">
          <Header />

          <ApiSettings tokens={DEFAULT_API_TOKENS} />

          <ImageUploader 
              tokens={DEFAULT_API_TOKENS} 
              onUploadSuccess={handleUploadSuccess} 
          />

          <main className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-gray-700">
                      Batch Input (JSON)
                    </label>
                    <button 
                      onClick={() => setJsonInput(INITIAL_JSON_TEMPLATE)}
                      className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                      disabled={isProcessing}
                    >
                      Reset Template
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      rows={12}
                      disabled={isProcessing}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 font-mono text-sm bg-gray-50 p-4 leading-relaxed"
                      spellCheck={false}
                    />
                    <div className="absolute bottom-4 right-4 text-xs text-gray-400 pointer-events-none">
                      JSON Array
                    </div>
                  </div>
                </div>

                <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Configuration</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['3:2', '2:3'].map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setConfig({ ...config, aspectRatio: ratio as any })}
                          disabled={isProcessing}
                          className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${
                            config.aspectRatio === ratio
                              ? 'bg-white text-brand-700 shadow ring-1 ring-brand-200'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Variants per Prompt</label>
                    <div className="flex gap-4">
                      {VARIANT_OPTIONS.map((num) => (
                        <label key={num} className="flex items-center">
                          <input
                            type="radio"
                            name="variants"
                            checked={config.nVariants === num}
                            onChange={() => setConfig({ ...config, nVariants: num as 1 | 2 })}
                            disabled={isProcessing}
                            className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">{num}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleRunBatch}
                      disabled={isProcessing}
                      className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition-all transform active:scale-95 ${
                        isProcessing 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 hover:shadow-lg'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          Processing Queue...
                        </>
                      ) : (
                        'Start Batch Generation'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {globalError && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start">
                   <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                   <span className="text-sm text-red-700">{globalError}</span>
                </div>
              )}

              <ProgressBar 
                current={completedCount} 
                total={tasks.length} 
                isProcessing={isProcessing} 
              />

              <TaskList tasks={tasks} />
            </div>
          </main>

          <MediaGallery refreshTrigger={galleryRefreshTrigger} />
        </div>
      </div>
    </ToastProvider>
  );
};

export default SoraUI;
