import React from 'react';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ isOpen, onClose, videoUrl, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-w-4xl w-full mx-4">
        <div className="bg-white rounded-lg overflow-hidden shadow-xl">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="font-semibold text-sm">{title || 'Video Preview'}</div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
          </div>
          <div className="p-4 bg-black flex items-center justify-center">
            <video controls className="max-h-[75vh] w-full rounded" src={videoUrl} />
          </div>
        </div>
      </div>
    </div>
  );
};
