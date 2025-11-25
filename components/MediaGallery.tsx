
import React, { useState, useEffect } from 'react';
import { DbUploadRecord, DbTaskRecord } from '../types';
import { fetchUploadHistory, fetchTaskHistory, deleteUploadRecord, deleteTaskRecord } from '../services/dbService';
import { useToast } from './ToastProvider';
import { VideoGenerationModal } from './VideoGenerationModal';
import { ImagePreviewModal } from './ImagePreviewModal';
import { VideoPreviewModal } from './VideoPreviewModal';
import { DEFAULT_API_TOKENS } from '../constants';

interface MediaGalleryProps {
  refreshTrigger: number;
}

// Helper component to handle Image loading errors (e.g. expired signed URLs)
const ImageWithFallback = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
    const [error, setError] = useState(false);
    
    if (error || !src) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}>
                <div className="text-center p-2">
                    <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] block">No Image</span>
                </div>
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt} 
            className={className} 
            onError={() => setError(true)}
            loading="lazy"
        />
    );
};

export const MediaGallery: React.FC<MediaGalleryProps> = ({ refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState<'uploads' | 'history'>('uploads');
  const [uploads, setUploads] = useState<DbUploadRecord[]>([]);
  const [history, setHistory] = useState<DbTaskRecord[]>([]);
  const [veoVideoTasks, setVeoVideoTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Video Generation Modal State
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedImageForVideo, setSelectedImageForVideo] = useState<string>('');
  const [selectedSourceUpload, setSelectedSourceUpload] = useState<DbUploadRecord | undefined>(undefined);
  const [selectedSourceTask, setSelectedSourceTask] = useState<DbTaskRecord | undefined>(undefined);
  // Preview modal state
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState(false);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string>('');
  const [selectedPreviewTitle, setSelectedPreviewTitle] = useState<string | undefined>(undefined);
  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, [activeTab, refreshTrigger]);

  const loadData = async () => {
    setIsLoading(true);
    try {
        // Load both to show counts, but prioritize update logic if needed
        const [uploadsData, historyData, veoVideoData] = await Promise.all([
            fetchUploadHistory(),
            fetchTaskHistory(),
            // fetch veo video tasks for video generation history
            (await import('../services/dbService')).fetchVeoVideoTasks()
        ]);
        setUploads(uploadsData);
        setHistory(historyData);
        setVeoVideoTasks(veoVideoData || []);
    } catch (error) {
      console.error("Failed to load gallery data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const handleDeleteUpload = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Delete without confirmation (immediate)
    try {
      console.log('Requesting delete for upload id (no confirm):', id);
      const success = await deleteUploadRecord(id);
      console.log('deleteUploadRecord returned:', success);
      if (success) {
        const refreshed = await fetchUploadHistory();
        setUploads(refreshed);
        addToast('Upload deleted', 'success');
      } else {
        console.warn('Failed to delete upload (see console for details)');
        addToast('Failed to delete upload', 'error');
      }
    } catch (err) {
      console.error('Unhandled error deleting upload:', err);
      addToast('Error deleting upload', 'error');
    }
  };

  const handleDeleteTask = async (id: number | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;

    try {
      console.log('Requesting delete for task id (no confirm):', id);
      const success = await deleteTaskRecord(id);
      console.log('deleteTaskRecord returned:', success);
      if (success) {
        // Re-fetch history from DB to ensure UI matches DB state
        const refreshed = await fetchTaskHistory();
        setHistory(refreshed);
        addToast('Task history deleted', 'success');
      } else {
        console.warn('Failed to delete task history (see console for details)');
        addToast('Failed to delete task history (check permissions)', 'error');
      }
    } catch (err) {
      console.error('Unhandled error deleting task:', err);
      addToast('Error deleting task history', 'error');
    }
  };

    const handleOpenVideoGen = (imageUrl: string | undefined, sourceUpload?: DbUploadRecord, sourceTask?: DbTaskRecord, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!imageUrl) return;
      setSelectedImageForVideo(imageUrl);
      setSelectedSourceUpload(sourceUpload);
      setSelectedSourceTask(sourceTask);
      setIsVideoModalOpen(true);
    };

    const handleOpenImagePreview = (url?: string, title?: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!url) return;
      setSelectedPreviewUrl(url);
      setSelectedPreviewTitle(title);
      setIsImagePreviewOpen(true);
    };

    const handleOpenVideoPreview = (url?: string, title?: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!url) return;
      setSelectedPreviewUrl(url);
      setSelectedPreviewTitle(title);
      setIsVideoPreviewOpen(true);
    };

  const TabButton = ({ id, label, count }: { id: 'uploads' | 'history', label: string, count?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors duration-200 flex items-center justify-center gap-2
        ${activeTab === id 
          ? 'border-brand-600 text-brand-600 bg-brand-50/30' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
    >
      {label} 
      {count !== undefined && (
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
              {count}
          </span>
      )}
    </button>
  );

  const isVideoUrl = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('/video/') || lower.endsWith('.mp4') || lower.includes('videofx') || lower.includes('content-type=video');
  };

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <TabButton id="uploads" label="Uploaded Media" count={uploads.length} />
        <TabButton id="history" label="Generation History" count={history.length} />
      </div>

      {/* Content */}
      <div className="p-6 min-h-[300px]">
        {isLoading && uploads.length === 0 && history.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <svg className="animate-spin h-8 w-8 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : (
          <>
            {/* Uploads Grid */}
            {activeTab === 'uploads' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fadeIn">
                {uploads.length === 0 && (
                   <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                     <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                     </svg>
                     <p>No uploaded media yet.</p>
                   </div>
                )}
                {uploads.map((item) => (
                  <div key={item.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300">
                    
                    {/* Hien thi anh dua tren URL */}
                    <div onClick={(e) => handleOpenImagePreview(item.file_url, item.file_name, e)}>
                      <ImageWithFallback 
                          src={item.file_url || ''} 
                          alt={item.file_name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                    </div>
                    
                    {/* Actions - Visible on Hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-2">
                         {/* Generate Video Button */}
                         <button 
                           onClick={(e) => handleOpenVideoGen(item.file_url, item, undefined, e)}
                            className="bg-white/90 hover:bg-purple-50 text-gray-500 hover:text-purple-600 p-1.5 rounded-full shadow-sm transition-colors border border-transparent hover:border-purple-100"
                            title="Generate Video (Veo3)"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                        
                        {/* Delete Button */}
                        <button 
                            onClick={(e) => handleDeleteUpload(item.id, e)}
                            className="bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-600 p-1.5 rounded-full shadow-sm transition-colors border border-transparent hover:border-red-100"
                            title="Delete Media"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                      {/* Enable pointer events only for interactive elements */}
                      <div className="pointer-events-auto">
                        <p className="text-white text-xs font-medium truncate mb-2" title={item.file_name}>{item.file_name}</p>
                        <button 
                            onClick={() => copyToClipboard(item.upload_media_id || item.file_id)}
                            className="w-full bg-white/90 hover:bg-white text-brand-700 text-xs font-bold py-2 rounded shadow-sm transition-colors flex items-center justify-center"
                        >
                            <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Media ID
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generation History Grid */}
            {activeTab === 'history' && (
              <div className="space-y-6 animate-fadeIn">
                {/* VEO Video Tasks (separate from sora_tasks) */}
                {veoVideoTasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Video Generation History</h4>
                    <div className="grid gap-3">
                      {veoVideoTasks.map((vt: any) => (
                        <div key={vt.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center justify-between gap-4">
                          <div className="w-36 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-50 border">
                            {vt.serving_base_uri ? (
                              <img src={vt.serving_base_uri} alt={vt.operation_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No preview</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 font-mono">{new Date(vt.created_at || '').toLocaleString()}</div>
                            <div className="text-sm font-medium text-gray-800 truncate">{vt.operation_name}</div>
                            <div className="text-xs text-gray-500 mt-1">Status: {vt.status || 'UNKNOWN'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {vt.video_url ? (
                              <button onClick={(e) => { e.stopPropagation(); setSelectedPreviewUrl(vt.video_url); setSelectedPreviewTitle(vt.operation_name); setIsVideoPreviewOpen(true); }} className="px-3 py-1 text-xs bg-indigo-50 text-indigo-700 rounded">Play</button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Existing sora_tasks history */}
                <div>
                {history.length === 0 && (
                   <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                     <p>No generation tasks recorded yet.</p>
                   </div>
                )}
                {history.map((task) => {
                  let urls: string[] = [];
                  try {
                    // Parse URLs from JSON string
                    urls = task.result_urls ? JSON.parse(task.result_urls) : [];
                  } catch (e) { urls = []; }
                  
                  return (
                    <div key={task.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-brand-200 transition-colors shadow-sm relative group">
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex-1 mr-4">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border
                                    ${task.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                                      task.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                    {task.status}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                    {new Date(task.created_at || '').toLocaleString()}
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 hover:line-clamp-none transition-all cursor-help" title={task.prompt}>
                                <span className="font-semibold text-gray-900">Prompt:</span> {task.prompt}
                            </p>
                         </div>
                         
                         {/* Delete Task Button */}
                         <button 
                             onClick={(e) => handleDeleteTask(task.id, e)}
                             className="text-gray-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                             title="Delete History"
                         >
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                             </svg>
                         </button>
                      </div>

                      {/* Generated Images Grid based on URLs */}
                      {urls.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
                           {urls.map((url, idx) => (
                             <div key={idx} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group shadow-sm border border-gray-200">
                                    <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                     <button 
                                       onClick={(e) => handleOpenVideoGen(url, undefined, task, e)}
                                       className="bg-white/90 text-purple-600 p-1 rounded-full shadow hover:bg-purple-50"
                                       title="Animate this image (Veo3)"
                                     >
                                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                         </svg>
                                     </button>
                                     {isVideoUrl(url) && (
                                       <button
                                         onClick={(e) => handleOpenVideoPreview(url, `Preview ${idx+1}`, e)}
                                         className="bg-white/90 text-indigo-600 p-1 rounded-full shadow hover:bg-indigo-50"
                                         title="Preview Video"
                                       >
                                         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                           <path d="M8 5v14l11-7z" />
                                         </svg>
                                       </button>
                                     )}
                                </div>
                                
                                <div onClick={(e) => handleOpenImagePreview(url, `Result ${idx+1}`, e)}>
                                  <ImageWithFallback 
                                    src={url} 
                                    alt={`Result ${idx}`} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </div>
                                </div>
                             </div>
                           ))}
                        </div>
                      ) : task.error_message ? (
                        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 mt-2 font-mono">
                            Error: {task.error_message}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Video Generation Modal */}
      <VideoGenerationModal 
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        imageUrl={selectedImageForVideo}
        tokens={DEFAULT_API_TOKENS}
        sourceUpload={selectedSourceUpload}
        sourceTask={selectedSourceTask}
      />
      <ImagePreviewModal
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        imageUrl={selectedPreviewUrl}
        title={selectedPreviewTitle}
      />
      <VideoPreviewModal
        isOpen={isVideoPreviewOpen}
        onClose={() => setIsVideoPreviewOpen(false)}
        videoUrl={selectedPreviewUrl}
        title={selectedPreviewTitle}
      />
    </div>
    </>
  );
};