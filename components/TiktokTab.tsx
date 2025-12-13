
import React, { useState, useEffect } from 'react';
import { fetchVeoImages, logVeoImageTaskToDb } from '../services/dbService';
import { uploadImageToGoogleLabs } from '../services/apiService';

const PROMPT_CONST = 'Ảnh người mẫu TikTok, phong cách hiện đại, ánh sáng studio';

export default function TiktokTab() {
  const [prompt, setPrompt] = useState('');
  const [traits, setTraits] = useState('');
  const [models, setModels] = useState<any[]>([]); // Lấy từ veo_images, type=model
  const [selectedModelId, setSelectedModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelFile, setNewModelFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Lấy danh sách người mẫu từ veo_images (type=model)
  useEffect(() => {
    fetchVeoImages().then(data => {
      setModels(Array.isArray(data) ? data.filter((v: any) => v.type === 'model') : []);
    });
  }, []);

  // Tạo ảnh người mẫu (lưu vào veo_images type=model)
  const handleAddModel = async () => {
    if (!newModelName || !newModelFile) return;
    setStatus('Đang upload người mẫu...');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(newModelFile);
      });
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      const mediaId = await uploadImageToGoogleLabs(base64, googleToken, newModelName, undefined, 'model');
      // Lấy lại danh sách models
      fetchVeoImages().then(data => {
        setModels(Array.isArray(data) ? data.filter((v: any) => v.type === 'model') : []);
      });
      setNewModelName('');
      setNewModelFile(null);
      setStatus('Thêm người mẫu thành công!');
    } catch (err) {
      setStatus('Lỗi upload người mẫu: ' + (err?.message || err));
    }
  };

  // Tạo ảnh TikTok với người mẫu đã chọn
  const handleSubmit = async () => {
    if (!prompt || !selectedModelId) {
      setStatus('Vui lòng nhập prompt và chọn người mẫu!');
      return;
    }
    setSubmitting(true);
    setStatus('Đang tạo ảnh...');
    try {
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      const finalPrompt = `${PROMPT_CONST}. ${traits}. ${prompt}`;
      // Gọi API tạo ảnh với referenceImageId là người mẫu
      const mediaId = await uploadImageToGoogleLabs(finalPrompt, googleToken, undefined, selectedModelId, 'ai');
      // TODO: lấy file_url từ API Google nếu cần
      const file_url = '';
      await logVeoImageTaskToDb(mediaId, finalPrompt, selectedModelId, file_url, {});
      setStatus('Tạo ảnh thành công!');
    } catch (err) {
      setStatus('Lỗi tạo ảnh: ' + (err?.message || err));
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700 text-gray-100">
      <h2 className="text-2xl font-extrabold mb-6 text-white">Tiktok Tab</h2>
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2 text-gray-200">Tạo ảnh người mẫu TikTok</h3>
        <div className="flex flex-col gap-3 mb-4">
          <input
            type="text"
            placeholder="Prompt mô tả ảnh (ví dụ: cô gái tóc dài, váy đỏ...)"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          <input
            type="text"
            placeholder="Các nét người (ví dụ: mặt trái xoan, mắt to, môi đỏ...)"
            value={traits}
            onChange={e => setTraits(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          <select
            value={selectedModelId}
            onChange={e => setSelectedModelId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            <option value="">Chọn người mẫu</option>
            {models.map(model => (
              <option key={model.media_generation_id} value={model.media_generation_id}>{model.file_name || model.media_generation_id}</option>
            ))}
          </select>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-pink-600 text-white font-semibold shadow hover:bg-pink-700 transition disabled:opacity-60"
          >{submitting ? 'Đang tạo...' : 'Tạo ảnh người mẫu'}</button>
        </div>
        {status && <div className="text-base text-pink-400 font-medium mb-2">{status}</div>}
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2 text-gray-200">Tạo người mẫu mới (lưu vào danh sách)</h3>
        <div className="flex flex-col gap-3 mb-4">
          <input
            type="text"
            placeholder="Tên người mẫu mới"
            value={newModelName}
            onChange={e => setNewModelName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          <input
            type="file"
            accept="image/*"
            onChange={e => setNewModelFile(e.target.files?.[0] || null)}
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          <button
            onClick={handleAddModel}
            className="px-4 py-2 rounded-lg bg-pink-500 text-white font-semibold shadow hover:bg-pink-600 transition"
          >Tạo người mẫu mới</button>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-gray-300">Danh sách người mẫu:</h4>
          <ul className="space-y-2">
            {models.map(model => (
              <li key={model.media_generation_id} className="flex items-center gap-3 p-2 border border-gray-700 rounded-lg bg-gray-800">
                {model.file_url && <img src={model.file_url} alt={model.file_name || model.media_generation_id} className="w-12 h-12 object-cover rounded-lg border border-gray-600" />}
                <span className="font-medium text-gray-100">{model.file_name || model.media_generation_id}</span>
                <span className="text-xs text-gray-400">ID: {model.media_generation_id}</span>
              </li>
            ))}
            {models.length === 0 && <li className="text-gray-500">Chưa có người mẫu nào.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
