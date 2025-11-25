import React from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-w-3xl w-full mx-4">
        <div className="bg-white rounded-lg overflow-hidden shadow-xl">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="font-semibold text-sm">{title || 'Image Preview'}</div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
          </div>
          <div className="p-4 bg-gray-900 flex items-center justify-center">
            <img src={imageUrl} alt={title || 'Preview'} className="max-h-[70vh] w-auto max-w-full object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
};
