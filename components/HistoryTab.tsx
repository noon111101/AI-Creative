import React, { useEffect, useState, useCallback } from 'react';
import { fetchVeoImages } from '../services/dbService';
import { createClient } from '@supabase/supabase-js';
import { ensureValidMediaUrl } from '../services/apiService';
import { updateVeoVideoUrl } from '../services/dbService';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function HistoryTab() {
  const [activeTab, setActiveTab] = useState<'images' | 'aiImages' | 'videoTasks'>('images');
  const [pageImages, setPageImages] = useState(1);
  const [pageAiImages, setPageAiImages] = useState(1);
  const [pageVideoTasks, setPageVideoTasks] = useState(1);
  const pageSize = 8;
  const [totalImages, setTotalImages] = useState(0);
  const [totalAiImages, setTotalAiImages] = useState(0);
  const [totalVideoTasks, setTotalVideoTasks] = useState(0);
  const [veoImages, setVeoImages] = useState([]);
  const [veoAiImages, setVeoAiImages] = useState([]);
  const [veoVideoTasks, setVeoVideoTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reset page khi chuyển tab sang aiImages, chỉ khi page hiện tại khác 1
  useEffect(() => {
    if (activeTab === 'aiImages' && pageAiImages !== 1) setPageAiImages(1);
    if (activeTab === 'images' && pageImages !== 1) setPageImages(1);
    if (activeTab === 'videoTasks' && pageVideoTasks !== 1) setPageVideoTasks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  // Hàm resolve URL hợp lệ cho ảnh/video, chỉ tạo 1 lần
  const resolveImageUrl = useCallback(async (img, googleToken, supabase) => {
    let url = img.file_url;
    let expired = false;
    if (!url) expired = true;
    else {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        if (!head.ok && head.status !== 304) expired = true;
      } catch {
        // Nếu bị CORS hoặc network error, coi như KHÔNG hết hạn
        expired = true;
      }
    }
    if (expired) {
      url = await ensureValidMediaUrl({
        type: 'image',
        mediaId: img.media_generation_id,
        url: url || '',
        googleToken,
        updateDb: async (newUrl) => {
          await supabase.from('veo_images').update({ file_url: newUrl }).eq('media_generation_id', img.media_generation_id);
        },
      });
    }
    return { ...img, file_url: url };
  }, []);

  const resolveVideoUrl = useCallback(async (task, googleToken) => {
    let url = task.video_url;
    let expired = false;
    if (!url) expired = true;
    else {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        if (!head.ok && head.status !== 304) expired = true;
      } catch {
        expired = true;
      }
    }
    if (expired) {
      url = await ensureValidMediaUrl({
        type: 'video',
        operationName: task.operation_name,
        sceneId: task.scene_id,
        url: url || '',
        googleToken,
        updateDb: async (newUrl) => {
          await updateVeoVideoUrl(task.operation_name, newUrl);
        },
      });
    }
    return { ...task, video_url: url };
  }, []);

  // Chỉ fetch dữ liệu của tab đang active, chỉ set state sau khi resolve xong URL hợp lệ
  useEffect(() => {
    let isMounted = true;
    async function fetchTabData() {
      setLoading(true);
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      if (activeTab === 'images') {
        const res = await supabase.from('veo_images').select('*', { count: 'exact' }).eq('type', 'reference').order('created_at', { ascending: false }).range((pageImages-1)*pageSize, pageImages*pageSize-1);
        setTotalImages(res.count || 0);
        const checked = await Promise.all((res.data || []).map(img => resolveImageUrl(img, googleToken, supabase)));
        if (isMounted) setVeoImages(checked);
      } else if (activeTab === 'aiImages') {
        const res = await supabase.from('veo_images').select('*', { count: 'exact' }).eq('type', 'ai').order('created_at', { ascending: false }).range((pageAiImages-1)*pageSize, pageAiImages*pageSize-1);
        setTotalAiImages(res.count || 0);
        const checked = await Promise.all((res.data || []).map(img => resolveImageUrl(img, googleToken, supabase)));
        if (isMounted) setVeoAiImages(checked);
      } else if (activeTab === 'videoTasks') {
        const res = await supabase.from('veo_video_tasks').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((pageVideoTasks-1)*pageSize, pageVideoTasks*pageSize-1);
        setTotalVideoTasks(res.count || 0);
        const checked = await Promise.all((res.data || []).map(task => resolveVideoUrl(task, googleToken)));
        if (isMounted) setVeoVideoTasks(checked);
      }
      if (isMounted) setLoading(false);
    }
    fetchTabData();
    return () => { isMounted = false; };
  }, [activeTab, pageImages, pageAiImages, pageVideoTasks, resolveImageUrl, resolveVideoUrl]);

  // Phân trang riêng cho từng bảng
  const totalPagesImages = Math.max(Math.ceil(totalImages / pageSize), 1);
  const totalPagesAiImages = Math.max(Math.ceil(totalAiImages / pageSize), 1);
  const totalPagesVideoTasks = Math.max(Math.ceil(totalVideoTasks / pageSize), 1);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Lịch sử Media (Images & Videos)</h2>
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('images')} className={`px-4 py-2 rounded-lg font-semibold shadow transition ${activeTab === 'images' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Ảnh đã upload</button>
        <button onClick={() => setActiveTab('aiImages')} className={`px-4 py-2 rounded-lg font-semibold shadow transition ${activeTab === 'aiImages' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Ảnh AI tạo</button>
        <button onClick={() => setActiveTab('videoTasks')} className={`px-4 py-2 rounded-lg font-semibold shadow transition ${activeTab === 'videoTasks' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Video AI tạo</button>
      </div>
      {loading ? <div className="text-lg text-gray-500 font-semibold">Đang tải...</div> : (
        <div className="space-y-8">
          {activeTab === 'images' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">veo_images (reference)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {veoImages.map(img => (
                  <div key={img.media_generation_id} className="border rounded-xl p-3 bg-white shadow flex flex-col items-center relative group">
                    <img src={img.file_url} alt={img.file_name || 'Ảnh'} className="w-full h-32 object-cover rounded-lg mb-2 cursor-pointer transition duration-200 group-hover:scale-105" />
                    {/* Preview lớn khi hover */}
                    <div className="absolute left-1/2 top-1/2 z-20 hidden group-hover:flex items-center justify-center" style={{ transform: 'translate(-50%, -50%)' }}>
                      <img src={img.file_url} alt={img.file_name || 'Ảnh'} className="max-w-xs max-h-96 rounded-xl shadow-2xl border-4 border-white" />
                    </div>
                    <div className="text-xs font-bold mb-1">{img.file_name || 'Không tên'}</div>
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
          {activeTab === 'aiImages' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">veo_images (AI tạo)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {veoAiImages.map(img => (
                  <div key={img.media_generation_id} className="border rounded-xl p-3 bg-white shadow flex flex-col items-center relative group">
                    <img src={img.file_url} alt={img.file_name || 'Ảnh'} className="w-full h-32 object-cover rounded-lg mb-2 cursor-pointer transition duration-200 group-hover:scale-105" />
                    {/* Preview lớn khi hover */}
                    <div className="absolute left-1/2 top-1/2 z-20 hidden group-hover:flex items-center justify-center" style={{ transform: 'translate(-50%, -50%)' }}>
                      <img src={img.file_url} alt={img.file_name || 'Ảnh'} className="max-w-xs max-h-96 rounded-xl shadow-2xl border-4 border-white" />
                    </div>
                    <div className="text-xs font-bold mb-1">{img.file_name || 'Không tên'}</div>
                    <div className="text-xs text-gray-500 mb-2">Type: {img.type}</div>
                    <a href={img.file_url} download target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 transition">Tải ảnh</a>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <button onClick={() => setPageAiImages(p => Math.max(1, p - 1))} disabled={pageAiImages === 1} className="px-3 py-2 rounded bg-gray-200 mx-1">Trước</button>
                <span className="px-4 py-2 font-semibold">Trang {pageAiImages} / {totalPagesAiImages}</span>
                <button onClick={() => setPageAiImages(p => Math.min(totalPagesAiImages, p + 1))} disabled={pageAiImages === totalPagesAiImages} className="px-3 py-2 rounded bg-gray-200 mx-1">Sau</button>
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
                    {/* Nếu status FAILED, hiển thị nút thử lại */}
                    {task.status === 'MEDIA_GENERATION_STATUS_FAILED' && (
                      <button
                        className="mt-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold shadow hover:bg-red-700 transition"
                        onClick={async () => {
                          // Lấy lại cấu hình từ DB
                          const videoPrompt = task.video_prompt || '';
                          const mediaId = task.media_id || '';
                          const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
                          if (!videoPrompt || !mediaId) {
                            alert('Không đủ thông tin để tạo lại video!');
                            return;
                          }
                          // Gọi lại API tạo video
                          const { startVeoVideoGeneration } = await import('../services/apiService');
                          try {
                            const videoRes = await startVeoVideoGeneration(videoPrompt, mediaId, googleToken);
                            // Lưu lại task mới vào DB
                            await supabase.from('veo_video_tasks').upsert([
                              {
                                operation_name: videoRes.operationName,
                                scene_id: videoRes.sceneId,
                                status: 'MEDIA_GENERATION_STATUS_ACTIVE',
                                video_url: null,
                                video_prompt: videoPrompt,
                                media_id: mediaId
                              }
                            ], { onConflict: 'operation_name' });
                            // Xoá bản ghi lỗi cũ
                            await supabase.from('veo_video_tasks').delete().eq('operation_name', task.operation_name);
                            alert('Đã gửi lại yêu cầu tạo video!');
                          } catch (err) {
                            alert('Lỗi tạo lại video: ' + (err?.message || err));
                          }
                        }}
                      >Thử lại tạo video</button>
                    )}
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
