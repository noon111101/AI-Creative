import React, { useEffect, useState } from 'react';
import { fetchVeoImages } from '../services/dbService';
import { createClient } from '@supabase/supabase-js';
import { ensureValidMediaUrl } from '../services/apiService';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function HistoryTab() {
  const [activeTab, setActiveTab] = useState<'images' | 'imageTasks' | 'videoTasks'>('images');
  const [veoImages, setVeoImages] = useState([]);
  const [veoImageTasks, setVeoImageTasks] = useState([]);
  const [veoVideoTasks, setVeoVideoTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageImages, setPageImages] = useState(1);
  const [pageImageTasks, setPageImageTasks] = useState(1);
  const [pageVideoTasks, setPageVideoTasks] = useState(1);
  const [pageSize] = useState(6);
  const [totalImages, setTotalImages] = useState(0);
  const [totalImageTasks, setTotalImageTasks] = useState(0);
  const [totalVideoTasks, setTotalVideoTasks] = useState(0);

  // Chỉ fetch dữ liệu của tab đang active
  useEffect(() => {
    async function fetchTabData() {
      setLoading(true);
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      if (activeTab === 'images') {
        const imagesRes = await supabase.from('veo_images').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((pageImages-1)*pageSize, pageImages*pageSize-1);
        setTotalImages(imagesRes.count || 0);
        const veoImagesChecked = await Promise.all((imagesRes.data || []).map(async img => {
          if (!img.file_url) {
            const newUrl = await ensureValidMediaUrl({
              type: 'image',
              mediaId: img.media_generation_id,
              url: '',
              googleToken,
              updateDb: async (newUrl) => {
                await supabase.from('veo_images').update({ file_url: newUrl }).eq('media_generation_id', img.media_generation_id);
              },
            });
            return { ...img, file_url: newUrl };
          } else {
            try {
              const res = await fetch(img.file_url, { method: 'HEAD' });
              if (!res.ok) {
                const newUrl = await ensureValidMediaUrl({
                  type: 'image',
                  mediaId: img.media_generation_id,
                  url: img.file_url,
                  googleToken,
                  updateDb: async (newUrl) => {
                    await supabase.from('veo_images').update({ file_url: newUrl }).eq('media_generation_id', img.media_generation_id);
                  },
                });
                return { ...img, file_url: newUrl };
              }
            } catch {}
          }
          return img;
        }));
        setVeoImages(veoImagesChecked);
      } else if (activeTab === 'imageTasks') {
        const imageTasksRes = await supabase.from('veo_image_tasks').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((pageImageTasks-1)*pageSize, pageImageTasks*pageSize-1);
        setTotalImageTasks(imageTasksRes.count || 0);
        setVeoImageTasks(imageTasksRes.data || []);
      } else if (activeTab === 'videoTasks') {
        // Fetch and display immediately
        const videoTasksRes = await supabase.from('veo_video_tasks').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((pageVideoTasks-1)*pageSize, pageVideoTasks*pageSize-1);
        setTotalVideoTasks(videoTasksRes.count || 0);
        setVeoVideoTasks(videoTasksRes.data || []);
        // Background update for video_url if needed (do not poll if FAILED)
        (videoTasksRes.data || []).forEach(async (task) => {
          if (task.status === 'MEDIA_GENERATION_STATUS_FAILED') return; // Do not poll or update
          let updatedTask = { ...task };
          const updateDb = async (newUrl, statusInfo) => {
            if (statusInfo?.status === 'MEDIA_GENERATION_STATUS_FAILED') {
              await supabase.from('veo_video_tasks')
                .upsert([{ operation_name: task.operation_name, status: statusInfo.status, error_message: statusInfo.error?.message || null }], { onConflict: 'operation_name' });
              updatedTask = { ...updatedTask, status: statusInfo.status, error_message: statusInfo.error?.message || null };
            }
            await supabase.from('veo_video_tasks')
              .upsert([{ operation_name: task.operation_name, video_url: newUrl }], { onConflict: 'operation_name' });
            updatedTask = { ...updatedTask, video_url: newUrl };
          };
          if (task.status === 'MEDIA_GENERATION_STATUS_ACTIVE') {
            try {
              const { pollVeoVideoStatus } = await import('../services/apiService');
              const videoUrl = await pollVeoVideoStatus(task.operation_name, task.scene_id, googleToken);
              if (videoUrl) {
                await supabase.from('veo_video_tasks')
                  .upsert([{ operation_name: task.operation_name, video_url: videoUrl, status: 'MEDIA_GENERATION_STATUS_SUCCESSFUL' }], { onConflict: 'operation_name' });
                // Optionally update UI state here if you want to reflect new video_url immediately
              }
            } catch (err) {
              // Nếu poll lỗi thì giữ nguyên trạng thái
            }
          } else if (!task.video_url) {
            const newUrl = await ensureValidMediaUrl({
              type: 'video',
              operationName: task.operation_name,
              sceneId: task.scene_id,
              url: '',
              googleToken,
              updateDb,
            });
            // Optionally update UI state here if you want to reflect new video_url immediately
          } else {
            try {
              const res = await fetch(task.video_url, { method: 'HEAD' });
              if (!res.ok) {
                const newUrl = await ensureValidMediaUrl({
                  type: 'video',
                  operationName: task.operation_name,
                  sceneId: task.scene_id,
                  url: task.video_url,
                  googleToken,
                  updateDb,
                });
                // Optionally update UI state here if you want to reflect new video_url immediately
              }
            } catch {}
          }
        });
      }
      setLoading(false);
    }
    fetchTabData();
  }, [activeTab, pageImages, pageImageTasks, pageVideoTasks, pageSize]);

  // Phân trang riêng cho từng bảng
  const totalPagesImages = Math.max(Math.ceil(totalImages / pageSize), 1);
  const totalPagesImageTasks = Math.max(Math.ceil(totalImageTasks / pageSize), 1);
  const totalPagesVideoTasks = Math.max(Math.ceil(totalVideoTasks / pageSize), 1);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Lịch sử Media (Images & Videos)</h2>
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('images')} className={`px-4 py-2 rounded-lg font-semibold shadow transition ${activeTab === 'images' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Ảnh đã upload</button>
        <button onClick={() => setActiveTab('imageTasks')} className={`px-4 py-2 rounded-lg font-semibold shadow transition ${activeTab === 'imageTasks' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Ảnh AI tạo</button>
        <button onClick={() => setActiveTab('videoTasks')} className={`px-4 py-2 rounded-lg font-semibold shadow transition ${activeTab === 'videoTasks' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Video AI tạo</button>
      </div>
      {loading ? <div className="text-lg text-gray-500 font-semibold">Đang tải...</div> : (
        <div className="space-y-8">
          {activeTab === 'images' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">veo_images</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {veoImages.filter(img => img.type === 'reference').map(img => (
                  <div key={img.media_generation_id} className="border rounded-xl p-3 bg-white shadow flex flex-col items-center relative group">
                    <img src={img.file_url} alt={img.file_name || img.media_generation_id} className="w-full h-32 object-cover rounded-lg mb-2 cursor-pointer transition duration-200 group-hover:scale-105" />
                    {/* Preview lớn khi hover */}
                    <div className="absolute left-1/2 top-1/2 z-20 hidden group-hover:flex items-center justify-center" style={{ transform: 'translate(-50%, -50%)' }}>
                      <img src={img.file_url} alt={img.file_name || img.media_generation_id} className="max-w-xs max-h-96 rounded-xl shadow-2xl border-4 border-white" />
                    </div>
                    <div className="text-xs font-bold mb-1">{img.file_name || img.media_generation_id}</div>
                    <div className="text-xs text-gray-500 mb-2">Type: {img.type}</div>
                    <a href={img.file_url} download target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded bg-purple-600 text-white text-xs font-semibold shadow hover:bg-purple-700 transition">Tải ảnh</a>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <button onClick={() => setPageImages(p => Math.max(1, p - 1))} disabled={pageImages === 1} className="px-3 py-2 rounded bg-gray-200 mx-1">Trước</button>
                <span className="px-4 py-2 font-semibold">Trang {pageImages} / {totalPagesImages}</span>
                <button onClick={() => setPageImages(p => Math.min(totalPagesImages, p + 1))} disabled={pageImages === totalPagesImages} className="px-3 py-2 rounded bg-gray-200 mx-1">Sau</button>
              </div>
            </div>
          )}
          {activeTab === 'imageTasks' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">veo_image_tasks</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {veoImageTasks.map(task => (
                  <div key={task.media_generation_id} className="border rounded-xl p-3 bg-white shadow flex flex-col items-center relative group">
                    <img src={task.image_url} alt={task.file_name} className="w-full h-32 object-cover rounded-lg mb-2 cursor-pointer transition duration-200 group-hover:scale-105" />
                    {/* Preview lớn khi hover */}
                    <div className="absolute left-1/2 top-1/2 z-20 hidden group-hover:flex items-center justify-center" style={{ transform: 'translate(-50%, -50%)' }}>
                      <img src={task.image_url} alt={task.file_name} className="max-w-xs max-h-96 rounded-xl shadow-2xl border-4 border-white" />
                    </div>
                    <div className="text-xs font-bold mb-1">{task.file_name}</div>
                    <div className="text-xs text-gray-500 mb-2">Prompt: {task.prompt}</div>
                    <a href={task.image_url} download target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 transition">Tải ảnh</a>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <button onClick={() => setPageImageTasks(p => Math.max(1, p - 1))} disabled={pageImageTasks === 1} className="px-3 py-2 rounded bg-gray-200 mx-1">Trước</button>
                <span className="px-4 py-2 font-semibold">Trang {pageImageTasks} / {totalPagesImageTasks}</span>
                <button onClick={() => setPageImageTasks(p => Math.min(totalPagesImageTasks, p + 1))} disabled={pageImageTasks === totalPagesImageTasks} className="px-3 py-2 rounded bg-gray-200 mx-1">Sau</button>
              </div>
            </div>
          )}
          {activeTab === 'videoTasks' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">veo_video_tasks</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {veoVideoTasks.map(task => (
                  <div key={task.operation_name} className="border rounded-xl p-3 bg-white shadow flex flex-col items-center">
                    {task.video_url ? (
                      <video src={task.video_url} controls className="w-full h-32 object-cover rounded-lg mb-2" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded-lg mb-2">No video</div>
                    )}
                    <div className="text-xs font-bold mb-1">Scene: {task.scene_id}</div>
                    <div className="text-xs text-gray-500 mb-2">Status: {task.status}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <button onClick={() => setPageVideoTasks(p => Math.max(1, p - 1))} disabled={pageVideoTasks === 1} className="px-3 py-2 rounded bg-gray-200 mx-1">Trước</button>
                <span className="px-4 py-2 font-semibold">Trang {pageVideoTasks} / {totalPagesVideoTasks}</span>
                <button onClick={() => setPageVideoTasks(p => Math.min(totalPagesVideoTasks, p + 1))} disabled={pageVideoTasks === totalPagesVideoTasks} className="px-3 py-2 rounded bg-gray-200 mx-1">Sau</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
