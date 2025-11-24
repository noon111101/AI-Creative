
import React, { useState, useRef } from 'react';
import { ApiTokens } from '../types';
import { uploadFile } from '../services/apiService';
import { logUploadToDb, checkFileNameExists } from '../services/dbService';

interface ImageUploaderProps {
  tokens: ApiTokens;
  onUploadSuccess?: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ tokens, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState(''); // State for custom name
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setCustomFileName(file.name); // Default to original name
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

    const finalName = customFileName.trim() || selectedFile.name;

    try {
      // 0. Check for duplicate name
      const isDuplicate = await checkFileNameExists(finalName);
      if (isDuplicate) {
        throw new Error(`Filename "${finalName}" already exists in the library. Please choose a unique name.`);
      }

      // 1. Upload to Sora API (passing custom name)
      const result = await uploadFile(selectedFile, finalName, tokens);
      
      // 2. Save to Supabase (using custom name)
      await logUploadToDb(finalName, result);

      // 3. Notify parent to refresh gallery
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Reset form
      setSelectedFile(null);
      setCustomFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Image Uploader
      </h3>

      {/* Upload Section */}
      <div className="flex flex-col gap-4">
        
        {/* File Input */}
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">1. Select Image</label>
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
        </div>

        {/* Custom Name Input (Only shows when file is selected) */}
        {selectedFile && (
            <div className="w-full animate-fadeIn">
                <label className="block text-sm font-medium text-gray-700 mb-1">2. Rename (Required Unique)</label>
                <input 
                    type="text" 
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder="Enter a memorable name..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-4 py-2 border"
                />
            </div>
        )}

        {/* Upload Button */}
        <div>
            <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors w-full sm:w-auto
                ${!selectedFile || isUploading 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-brand-600 hover:bg-brand-700'}`}
            >
            {isUploading ? 'Checking & Uploading...' : 'Upload & Save to Library'}
            </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 font-medium">
          {error}
        </div>
      )}
    </div>
  );
};
