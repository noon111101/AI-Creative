import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="mb-8 text-center">
      <div className="inline-flex items-center justify-center p-3 bg-brand-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">BatchGen Pro</h1>
      <p className="text-gray-500 mt-2 max-w-md mx-auto">
        Sequential high-fidelity image generation pipeline.
      </p>
    </div>
  );
};