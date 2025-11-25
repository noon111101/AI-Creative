
import React, { useState, useEffect } from 'react';
import { uploadImageToGoogleLabs, startVeoVideoGeneration, pollVeoVideoStatus } from '../services/apiService';
import { ApiTokens, DbUploadRecord, DbTaskRecord } from '../types';
import { useToast } from './ToastProvider';

interface VideoGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  tokens: ApiTokens;
  // optional source records so we can skip re-upload when a media_id_video already exists
  sourceUpload?: DbUploadRecord | null;
  sourceTask?: DbTaskRecord | null;
}

// Helper to convert any image URL to a clean JPEG Base64 string
// This fixes issues where the API rejects PNGs or other formats
const convertImageToJpegBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS for canvas manipulation
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Ensure even dimensions to be safe (though not strictly required for upload, good for video)
        canvas.width = img.width; 
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        // White background in case of transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 0, 0);
        
        // Export as JPEG with high quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => {
      console.error("Image load error", e);
      reject(new Error("Failed to load image for processing. Possible CORS issue."));
    };
    img.src = src;
  });
};

export const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  tokens 
  , sourceUpload, sourceTask
}) => {
  const [prompt, setPrompt] = useState("A cinematic video...");
  const [status, setStatus] = useState<'idle' | 'uploading' | 'generating' | 'polling' | 'completed' | 'failed'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  
  // Reset state when opening new image
  useEffect(() => {
    if (isOpen) {
        setStatus('idle');
        setStatusMsg('');
        setResultVideoUrl('');
        setPrompt("A high-definition 8K cinematic video... (describe movement)");
    }
  }, [isOpen, imageUrl]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!tokens.googleToken) {
        setStatus('failed');
        setStatusMsg('Missing Google Labs Token in .env (VITE_GOOGLE_LABS_TOKEN).');
        return;
    }

    try {
        // 1. Process Image
        setStatus('uploading');
        setStatusMsg('Processing image (converting to JPEG)...');
        
        const { addToast } = useToast();

        let mediaId: string | null = null;

        // If caller provided an existing media ID on either the upload or task record, reuse it.
        if (sourceUpload?.media_id_video) {
          mediaId = sourceUpload.media_id_video;
        } else if (sourceTask?.media_id_video) {
          mediaId = sourceTask.media_id_video;
        } else {
          // If we only have an image URL, try a best-effort DB lookup to find a matching upload record
          try {
            const { findMediaIdByFileUrl } = await import('../services/dbService');
            const found = await findMediaIdByFileUrl(imageUrl);
                if (found) {
                  mediaId = found;
                }
          } catch (e) {
            // ignore lookup failures and continue to upload path
            console.warn('Failed to lookup media_id_video by file URL:', e);
          }
        }

        // If no existing mediaId, convert + upload
        if (!mediaId) {
              addToast('Uploading image to Veo3...', 'info');
          // Convert the image to a standardized JPEG Base64 string
          // This handles format conversion and ensures valid base64 for the API
          const jpegBase64 = await convertImageToJpegBase64(imageUrl);

          setStatusMsg('Uploading to Veo3...');
          // Upload (always as image/jpeg)
              try {
                mediaId = await uploadImageToGoogleLabs(jpegBase64, tokens.googleToken, sourceUpload?.file_name, sourceUpload?.file_id);
                addToast('Image uploaded to Veo3', 'success');
              } catch (err: any) {
                console.error('Upload failed:', err);
                addToast('Image upload failed', 'error');
                throw err;
              }
        } else {
              setStatusMsg('Using existing Veo media ID, skipping upload...');
              addToast('Using existing Veo media ID, skipping upload', 'info');
        }
        
        // 2. Start Generation
        setStatus('generating');
        setStatusMsg('Initializing video generation task...');
        addToast('Starting video generation...', 'info');
        const { operationName, sceneId } = await startVeoVideoGeneration(prompt, mediaId, tokens.googleToken);

        // 3. Poll
        setStatus('polling');
        const videoUrl = await pollVeoVideoStatus(
            operationName, 
            sceneId, 
            tokens.googleToken, 
            (msg) => setStatusMsg(msg)
        );
        if (videoUrl) {
          addToast('Video generation complete', 'success');
        } else {
          addToast('Video generation completed (no URL returned)', 'warning');
        }

        setResultVideoUrl(videoUrl);
        setStatus('completed');

    } catch (e: any) {
        console.error("Video Gen Error:", e);
        setStatus('failed');
        setStatusMsg(e.message || "Unknown error occurred");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Generate Video with Veo3
                </h3>
                
                <div className="mt-4 flex justify-center mb-4 bg-gray-100 rounded p-2">
                    <img src={imageUrl} alt="Source" className="h-32 object-contain" />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt
                  </label>
                  <textarea
                    rows={4}
                    className="shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2"
                    placeholder="Describe the video..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={status !== 'idle' && status !== 'failed' && status !== 'completed'}
                  />
                </div>

                {/* Status / Result Area */}
                <div className="mt-4">
                    {status === 'uploading' && <p className="text-blue-600 text-sm animate-pulse">{statusMsg}</p>}
                    {status === 'generating' && <p className="text-purple-600 text-sm animate-pulse">{statusMsg}</p>}
                    {status === 'polling' && <p className="text-indigo-600 text-sm animate-pulse">{statusMsg}</p>}
                    {status === 'failed' && <p className="text-red-600 text-sm font-medium">Error: {statusMsg}</p>}
                    
                    {status === 'completed' && resultVideoUrl && (
                        <div className="mt-2">
                            <p className="text-green-600 font-bold mb-2">Generation Complete!</p>
                            <video controls className="w-full rounded-lg shadow bg-black" src={resultVideoUrl} />
                            <a 
                                href={resultVideoUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="block text-center mt-2 text-brand-600 text-xs hover:underline"
                            >
                                Open Video in New Tab
                            </a>
                        </div>
                    )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {(status === 'idle' || status === 'failed') && (
                <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                onClick={handleGenerate}
                >
                Generate Video
                </button>
            )}
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
