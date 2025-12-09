import React, { useEffect, useState } from 'react';
import { fetchVeoImages } from '../services/dbService';
import { createClient } from '@supabase/supabase-js';
import { ensureValidMediaUrl } from '../services/apiService';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function HistoryTab() {
  const [veoImages, setVeoImages] = useState([]);
  const [veoImageTasks, setVeoImageTasks] = useState([]);
  const [veoVideoTasks, setVeoVideoTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [images, imageTasks, videoTasks] = await Promise.all([
        supabase.from('veo_images').select('*').order('created_at', { ascending: false }),
        supabase.from('veo_image_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('veo_video_tasks').select('*').order('created_at', { ascending: false })
      ]);

      // Kiểm tra và cập nhật lại link ảnh hết hạn hoặc null
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      const veoImagesChecked = await Promise.all((images.data || []).map(async img => {
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

      // Kiểm tra và cập nhật lại link video hết hạn hoặc null, đồng thời lưu trạng thái lỗi nếu có
      const veoVideoTasksChecked = await Promise.all((videoTasks.data || []).map(async task => {
        let updatedTask = { ...task };
        // Hàm updateDb nhận 1 hoặc 2 tham số (newUrl, statusInfo)
        const updateDb = async (newUrl, statusInfo) => {
          if (statusInfo?.status === 'MEDIA_GENERATION_STATUS_FAILED') {
            await supabase.from('veo_video_tasks').update({ status: statusInfo.status, error_message: statusInfo.error?.message || null }).eq('operation_name', task.operation_name);
            updatedTask = { ...updatedTask, status: statusInfo.status, error_message: statusInfo.error?.message || null };
          }
          await supabase.from('veo_video_tasks').update({ video_url: newUrl }).eq('operation_name', task.operation_name);
          updatedTask = { ...updatedTask, video_url: newUrl };
        };
        if (!task.video_url) {
          const newUrl = await ensureValidMediaUrl({
            type: 'video',
            operationName: task.operation_name,
            sceneId: task.scene_id,
            url: '',
            googleToken,
            updateDb,
          });
          updatedTask.video_url = newUrl;
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
              updatedTask.video_url = newUrl;
            }
          } catch {}
        }
        return updatedTask;
      }));

      setVeoImages(veoImagesChecked);
      setVeoImageTasks(imageTasks.data || []);
      setVeoVideoTasks(veoVideoTasksChecked);
      setLoading(false);
    }
    fetchAll();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Lịch sử Media (Images & Videos)</h2>
      {loading ? <div>Đang tải...</div> : (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">veo_images</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {veoImages.map(img => (
                <div key={img.media_generation_id} className="border rounded-lg p-2 bg-white shadow">
                  <img src={img.file_url} alt={img.file_name || img.media_generation_id} className="w-full h-32 object-cover rounded" />
                  <div className="text-xs mt-2">{img.file_name || img.media_generation_id}</div>
                  <div className="text-xs text-gray-500">Type: {img.type}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">veo_image_tasks</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {veoImageTasks.map(task => (
                <div key={task.media_generation_id} className="border rounded-lg p-2 bg-white shadow">
                  <img src={task.image_url} alt={task.file_name || task.media_generation_id} className="w-full h-32 object-cover rounded" />
                  <div className="text-xs mt-2">{task.file_name || task.media_generation_id}</div>
                  <div className="text-xs text-gray-500">Prompt: {task.prompt}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">veo_video_tasks</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {veoVideoTasks.map(task => (
                <div key={task.operation_name} className="border rounded-lg p-2 bg-white shadow">
                  {task.video_url ? (
                    <video src={task.video_url} controls className="w-full h-32 object-cover rounded" />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded">No video</div>
                  )}
                  <div className="text-xs mt-2">Scene: {task.scene_id}</div>
                  <div className="text-xs text-gray-500">Status: {task.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
