
import React, { useState, useEffect } from 'react';
import { uploadImageToGoogleLabs, startVeoVideoGeneration, pollVeoVideoStatus } from '../services/apiService';
import { ApiTokens } from '../types';

interface VideoGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  tokens: ApiTokens;
}

export const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  tokens 
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
        // 1. Fetch image and convert to base64
        setStatus('uploading');
        setStatusMsg('Fetching image and preparing upload...');
        
        const imgResp = await fetch(imageUrl);
        const blob = await imgResp.blob();
        const reader = new FileReader();
        
        const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        setStatusMsg('Uploading to Veo3...');
        // Use googleToken, not authToken
        const mediaId = await uploadImageToGoogleLabs(base64Data, blob.type, tokens.googleToken);
        
        // 2. Start Generation
        setStatus('generating');
        setStatusMsg('Initializing video generation task...');
        const { operationName, sceneId } = await startVeoVideoGeneration(prompt, mediaId, tokens.googleToken);

        // 3. Poll
        setStatus('polling');
        const videoUrl = await pollVeoVideoStatus(
            operationName, 
            sceneId, 
            tokens.googleToken, 
            (msg) => setStatusMsg(msg)
        );

        setResultVideoUrl(videoUrl);
        setStatus('completed');

    } catch (e: any) {
        console.error(e);
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