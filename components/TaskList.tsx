
import React, { useState } from 'react';
import { ProcessedTask, TaskStatus, DbTaskRecord } from '../types';
import { StatusBadge } from './StatusBadge';
import { ImagePreviewModal } from './ImagePreviewModal';
import { VideoPreviewModal } from './VideoPreviewModal';
import { VideoGenerationModal } from './VideoGenerationModal';
import { DEFAULT_API_TOKENS } from '../constants';
import { useToast } from './ToastProvider';

interface TaskListProps {
  tasks: ProcessedTask[];
}

export const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  if (tasks.length === 0) return null;

  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState(false);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState('');
  const [selectedPreviewTitle, setSelectedPreviewTitle] = useState<string | undefined>(undefined);
  // Video generation modal state (reuse existing media_id_video if present on task record)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedImageForVideo, setSelectedImageForVideo] = useState<string>('');
  const [selectedSourceTask, setSelectedSourceTask] = useState<DbTaskRecord | undefined>(undefined);

  const isVideoUrl = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('/video/') || lower.endsWith('.mp4') || lower.includes('videofx') || lower.includes('content-type=video');
  };

  const openImage = (url: string, title?: string) => { setSelectedPreviewUrl(url); setSelectedPreviewTitle(title); setIsImagePreviewOpen(true); };
  const openVideo = (url: string, title?: string) => { setSelectedPreviewUrl(url); setSelectedPreviewTitle(title); setIsVideoPreviewOpen(true); };

  const handleOpenVideoGen = (imageUrl: string | undefined, task?: ProcessedTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!imageUrl) return;
    setSelectedImageForVideo(imageUrl);
    // Attempt to pass through any media_id_video if the task already includes it (best-effort)
    setSelectedSourceTask(task as unknown as DbTaskRecord);
    const { addToast } = useToast();
    addToast('Opening Veo3 video modal...', 'info');
    setIsVideoModalOpen(true);
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Queue</h3>
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {tasks.map((task) => {
             // Logic trích xuất URL từ result
             let resultUrls: string[] = [];
             if (task.status === TaskStatus.COMPLETED && task.result?.generations) {
                 resultUrls = task.result.generations
                    .map((g: any) => g.encodings?.source?.path || g.url)
                    .filter(Boolean);
             }

             return (
                <li key={task.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-xs font-mono text-gray-400">#{task.index}</span>
                         {task.apiId && (
                            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                ID: {task.apiId.split('-')[0]}...
                            </span>
                         )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {task.input.prompt}
                      </p>
                      
                      {/* Result / Error Display */}
                      <div className="mt-2">
                        {task.status === TaskStatus.FAILED && (
                            <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                Error: {task.error}
                            </p>
                        )}
                        {task.status === TaskStatus.COMPLETED && resultUrls.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {resultUrls.map((url, idx) => (
                                  <div key={idx} className="flex gap-2">
                                    <button
                                      onClick={() => isVideoUrl(url) ? openVideo(url, `Result ${idx+1}`) : openImage(url, `Result ${idx+1}`)}
                                      className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-100 rounded-md text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                                    >
                                      View Result {resultUrls.length > 1 ? idx + 1 : ''}
                                    </button>
                                    {/* Animate this result with Veo3 - best-effort reuse of media_id_video on task record */}
                                    <button
                                      onClick={(e) => handleOpenVideoGen(url, task, e)}
                                      className="inline-flex items-center px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-md text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                                    >
                                      Animate
                                    </button>
                                  </div>
                                ))}
                            </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusBadge status={task.status} attempt={task.attemptCount} />
                    </div>
                  </div>
                </li>
             );
          })}
        </ul>
        {/* Preview Modals */}
        <ImagePreviewModal isOpen={isImagePreviewOpen} onClose={() => setIsImagePreviewOpen(false)} imageUrl={selectedPreviewUrl} title={selectedPreviewTitle} />
        <VideoPreviewModal isOpen={isVideoPreviewOpen} onClose={() => setIsVideoPreviewOpen(false)} videoUrl={selectedPreviewUrl} title={selectedPreviewTitle} />
        {/* Video Generation Modal (reuse media_id_video when available) */}
        <VideoGenerationModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          imageUrl={selectedImageForVideo}
          tokens={DEFAULT_API_TOKENS}
          sourceTask={selectedSourceTask}
        />
      </div>
    </div>
  );
};
