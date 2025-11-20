import React, { useState, useRef, useEffect } from 'react';
import { ApiTokens, DbUploadRecord } from '../types';
import { uploadFile } from '../services/apiService';
import { logUploadToDb, fetchUploadHistory } from '../services/dbService';

interface ImageUploaderProps {
  tokens: ApiTokens;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ tokens }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // DB History State
  const [dbHistory, setDbHistory] = useState<DbUploadRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
        const history = await fetchUploadHistory();
        setDbHistory(history);
    } catch (e) {
        console.error("Failed to load history", e);
    } finally {
        setIsLoadingHistory(false);
    }
  };

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
      // 1. Upload to Sora API
      const result = await uploadFile(selectedFile, tokens);
      
      // 2. Save to Supabase
      await logUploadToDb(selectedFile.name, result);

      // 3. Refresh List
      await loadHistory();

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Image Uploader & Library
      </h3>

      {/* Upload Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6 pb-6 border-b border-gray-100">
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
          className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors min-w-[100px]
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

      {/* Uploaded Files Library */}
      <div>
        <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-700">Saved Media Library</span>
            <button onClick={loadHistory} className="text-xs text-brand-600 hover:underline">Refresh</button>
        </div>

        {isLoadingHistory ? (
             <div className="text-center py-4 text-sm text-gray-400">Loading library...</div>
        ) : dbHistory.length === 0 ? (
             <div className="text-center py-4 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No images uploaded yet.
             </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Media ID (For Remix)</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {dbHistory.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.file_name}</td>
                                <td className="px-4 py-2 text-xs font-mono text-gray-600">
                                    {item.upload_media_id || item.file_id || "N/A"}
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-500">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <button
                                        onClick={() => copyToClipboard(item.upload_media_id || item.file_id)}
                                        className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded hover:bg-brand-100 border border-brand-200 transition-colors"
                                    >
                                        Copy ID
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};
