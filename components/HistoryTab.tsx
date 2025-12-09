import React, { useEffect, useState } from 'react';
import { fetchVeoImages } from '../services/dbService';
import { createClient } from '@supabase/supabase-js';

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
      setVeoImages(images.data || []);
      setVeoImageTasks(imageTasks.data || []);
      setVeoVideoTasks(videoTasks.data || []);
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
