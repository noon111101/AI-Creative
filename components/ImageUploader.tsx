import React, { useState, useRef } from 'react';
import { ApiTokens, UploadLogItem } from '../types';
import { uploadFile } from '../services/apiService';

interface ImageUploaderProps {
  tokens: ApiTokens;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ tokens }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!tokens.authToken) {
      setError("Missing Auth Token. Please configure API settings first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadFile(selectedFile, tokens);
      
      const logItem: UploadLogItem = {
        fileName: selectedFile.name,
        timestamp: new Date().toLocaleString(),
        response: result
      };

      setUploadHistory(prev => [logItem, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadLogFile = () => {
    if (uploadHistory.length === 0) return;

    const logContent = uploadHistory.map(item => {
        return `[${item.timestamp}] Filename: ${item.fileName}\nResponse: ${JSON.stringify(item.response, null, 2)}\n----------------------------------------\n`;
    }).join('');

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload_log_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Image Uploader
      </h3>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          disabled={isUploading}
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-brand-50 file:text-brand-700
            hover:file:bg-brand-100
          "
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors
            ${!selectedFile || isUploading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-brand-600 hover:bg-brand-700'}`}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
          {error}
        </div>
      )}

      {/* Upload History & Log Download */}
      {uploadHistory.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-700">Upload History</span>
            <button 
              onClick={downloadLogFile}
              className="text-xs flex items-center text-brand-600 hover:text-brand-800 font-medium"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Log (.txt)
            </button>
          </div>
          
          <div className="bg-slate-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto text-xs font-mono p-2 space-y-2">
            {uploadHistory.map((item, idx) => (
              <div key={idx} className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                <div className="flex justify-between text-gray-500 mb-1">
                    <span>{item.fileName}</span>
                    <span>{item.timestamp}</span>
                </div>
                <div className="break-all text-gray-800">
                    {JSON.stringify(item.response)}
                </div>
                <div className="mt-1 text-right">
                     <button 
                        onClick={() => copyToClipboard(JSON.stringify(item.response))}
                        className="text-brand-600 hover:underline"
                     >
                        Copy JSON
                     </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};