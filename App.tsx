import React, { useState } from 'react';

import SoraUI from './components/SoraUI';
import StoryboardEditor from './components/StoryboardEditor';
import BatchPage from './components/BatchPage';
import HistoryTab from './components/HistoryTab';
import TiktokTab from './components/TiktokTab';

const App: React.FC = () => {
  const [active, setActive] = useState<'batch' | 'history' | 'tiktok'>('batch');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Interface Selector</h1>
            <p className="text-sm text-gray-500">Choose SORA (classic) or FLOW (new) — Flow is coming soon.</p>
          </div>

          <div className="inline-flex items-center rounded-lg bg-white shadow-sm p-1.5 border border-gray-100">
            {/* <button
              onClick={() => setActive('flow')}
              aria-pressed={active === 'flow'}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none ${
                active === 'flow'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke={active === 'flow' ? 'white' : '#374151'} strokeWidth="1.5" />
                <path d="M8 12h8" stroke={active === 'flow' ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" />
              </svg>
              FLOW
            </button> */}
            <button
              onClick={() => setActive('batch')}
              aria-pressed={active === 'batch'}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none ${
                active === 'batch'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="14" height="14" rx="3" stroke={active === 'batch' ? 'white' : '#374151'} strokeWidth="1.5" />
                <path d="M8 12h8" stroke={active === 'batch' ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" />
              </svg>
              BATCH
            </button>
            <button
              onClick={() => setActive('history')}
              aria-pressed={active === 'history'}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none ${
                active === 'history'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6v6l4 2" stroke={active === 'history' ? 'white' : '#374151'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke={active === 'history' ? 'white' : '#374151'} strokeWidth="1.5" />
              </svg>
              HISTORY
            </button>
            <button
              onClick={() => setActive('tiktok')}
              aria-pressed={active === 'tiktok'}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none ${
                active === 'tiktok'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 7v7a4 4 0 1 0 4-4h-1" stroke={active === 'tiktok' ? 'white' : '#EC4899'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke={active === 'tiktok' ? 'white' : '#EC4899'} strokeWidth="1.5" />
              </svg>
              TIKTOK
            </button>
          </div>
        </div>

        <div>
          {/* {active === 'sora' && <SoraUI />} */}
          {/* {active === 'flow' && (
            <div>
              <StoryboardEditor />
            </div>
          )} */}
          {active === 'batch' && <BatchPage />}
          {active === 'history' && <HistoryTab />}
          {active === 'tiktok' && <TiktokTab />}
        </div>
      </div>
    </div>
  );
};

export default App;