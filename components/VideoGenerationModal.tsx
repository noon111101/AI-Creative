
import React, { useState, useEffect } from 'react';
import { uploadImageToGoogleLabs, startVeoVideoGeneration, pollVeoVideoStatus } from '../services/apiService';
import { updateTiktokTaskVideoInfo } from '../services/dbService';
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
  tokens,
  sourceUpload, sourceTask
}) => {
  const [prompt, setPrompt] = useState("A cinematic video...");
  const [status, setStatus] = useState<'idle' | 'uploading' | 'generating' | 'polling' | 'completed' | 'failed'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  const { addToast } = useToast();
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


      // Luôn dùng image_media_id từ tiktok_task để tạo video
      const mediaId: string | null = sourceTask?.image_media_id || null;
      if (!mediaId) {
        setStatus('failed');
        setStatusMsg('Không tìm thấy image_media_id trong task.');
        addToast('Không tìm thấy image_media_id trong task.', 'error');
        return;
      }
      setStatusMsg('Using existing Veo media ID...');
      addToast('Using existing Veo media ID', 'info');

      // 2. Start Generation
      setStatus('generating');
      setStatusMsg('Initializing video generation task...');
      addToast('Starting video generation...', 'info');
      const { operationName, sceneId } = await startVeoVideoGeneration(prompt, mediaId, tokens.googleToken,
        { aspectRatio: "VIDEO_ASPECT_RATIO_PORTRAIT", videoModelKey: "veo_3_1_i2v_s_fast_portrait_ultra" });

      // 3. Poll
      setStatus('polling');
      let videoRespone: any = null;
      let videoUrl: string | null = null;
      let mediaGenerationId: string | null = null;
      try {
        videoUrl = await pollVeoVideoStatus(
          operationName,
          sceneId,
          tokens.googleToken,
          (msg) => setStatusMsg(msg)
        );
        // Lấy mediaGenerationId từ operationName hoặc sceneId (tùy backend trả về)
        mediaGenerationId = mediaId;
        if (videoUrl) {
          videoRespone = {
            fifeUrl: videoUrl,
            mediaGenerationId: mediaGenerationId
          };
        }
        addToast('Video generation complete', 'success');
        setResultVideoUrl(videoUrl || '');
        setStatus('completed');
      } catch (e) {
        // Nếu lỗi (ví dụ FAILED), dừng polling, báo lỗi rõ ràng
        videoRespone = { error: e?.message || e };
        setStatus('failed');
        setStatusMsg(e?.message || 'Video generation failed');
        addToast('Video generation failed', 'error');
        return;
      }

      // Lưu video_config và video_respone vào tiktok_task (dạng mảng)
      if (sourceTask?.image_media_id) {
        // Lấy video_config và video_respone cũ nếu có
        let oldConfigArr = [];
        let oldRespArr = [];
        try {
          if (sourceTask.video_config) {
            const parsed = typeof sourceTask.video_config === 'string' ? JSON.parse(sourceTask.video_config) : sourceTask.video_config;
            if (Array.isArray(parsed)) oldConfigArr = parsed;
            else if (parsed) oldConfigArr = [parsed];
          }
          if (sourceTask.video_respone) {
            const parsed = typeof sourceTask.video_respone === 'string' ? JSON.parse(sourceTask.video_respone) : sourceTask.video_respone;
            if (Array.isArray(parsed)) oldRespArr = parsed;
            else if (parsed) oldRespArr = [parsed];
          }
        } catch {}
        const videoConfig = {
          prompt,
          mediaId,
          operationName,
          sceneId
        };
        const newConfigArr = [...oldConfigArr, videoConfig];
        const newRespArr = [...oldRespArr, videoRespone];
        await updateTiktokTaskVideoInfo(sourceTask.image_media_id, newConfigArr, newRespArr);
      }

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
          <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-2xl leading-7 font-bold text-black mb-4" id="modal-title">
                  Generate Video with Veo3
                </h3>
                <div className="mt-4 flex justify-center mb-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <img src={imageUrl} alt="Source" className="h-40 object-contain rounded shadow" />
                </div>
                <div className="mt-4">
                  <label className="block text-base font-semibold text-black mb-2">
                    Prompt
                  </label>
                  <textarea
                    rows={4}
                    className="shadow focus:ring-blue-400 focus:border-blue-400 block w-full text-base border border-gray-300 rounded-lg p-3 text-black bg-white placeholder-gray-400"
                    placeholder="Mô tả chuyển động, phong cách, thời lượng..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={status !== 'idle' && status !== 'failed' && status !== 'completed'}
                  />
                </div>
                {/* Status / Result Area */}
                <div className="mt-4">
                  {status === 'uploading' && <p className="text-blue-700 text-base animate-pulse">{statusMsg}</p>}
                  {status === 'generating' && <p className="text-purple-700 text-base animate-pulse">{statusMsg}</p>}
                  {status === 'polling' && <p className="text-indigo-700 text-base animate-pulse">{statusMsg}</p>}
                  {status === 'failed' && <p className="text-red-600 text-base font-semibold">Lỗi: {statusMsg}</p>}
                  {status === 'completed' && resultVideoUrl && (
                    <div className="mt-2">
                      <p className="text-green-700 font-bold mb-2">Tạo video thành công!</p>
                      <video controls className="w-full rounded-lg shadow bg-black" src={resultVideoUrl} />
                      <a
                        href={resultVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-center mt-2 text-blue-700 text-sm hover:underline"
                      >
                        Xem video ở tab mới
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            {(status === 'idle' || status === 'failed') && (
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow px-5 py-2 bg-blue-600 text-base font-bold text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-base transition"
                onClick={handleGenerate}
              >
                Generate Video
              </button>
            )}
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow px-5 py-2 bg-white text-base font-bold text-gray-800 hover:bg-gray-100 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-base transition"
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
