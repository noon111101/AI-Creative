// Convert mọi ảnh sang JPEG base64 trước khi upload
const fileToJpegBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');
        ctx.drawImage(img, 0, 0);
        const jpeg = canvas.toDataURL('image/jpeg', 0.92);
        URL.revokeObjectURL(url);
        resolve(jpeg);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

import React, { useState, useEffect } from 'react';
import { generateVeo3Image, fetchVeo3ImageResult, uploadImageToGoogleLabs, isUrlExpired } from '../services/apiService';
import { VideoGenerationModal } from './VideoGenerationModal';
import { saveTiktokTaskFromMedia, fetchTiktokTasks, fetchVeoImages } from '../services/dbService';

const PROMPT_CONST = 'Ảnh người mẫu TikTok, phong cách hiện đại, ánh sáng studio';

export default function TiktokTab() {
  // Video modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModalModel, setVideoModalModel] = useState<any>(null);
  // Outfit reference
  const [outfitImages, setOutfitImages] = useState<any[]>([]);
  const [selectedOutfitId, setSelectedOutfitId] = useState('');
  const [outfitImageFile, setOutfitImageFile] = useState<File | null>(null);
  // Lấy danh sách outfit (type tiktok_outfit_reference) và kiểm tra file_url hết hạn
  useEffect(() => {
    const checkAndUpdateOutfitImages = async () => {
      const data = await fetchVeoImages({ type: 'tiktok_outfit_reference', order: 'created_at.desc' });
      if (!Array.isArray(data)) {
        setOutfitImages([]);
        return;
      }
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      const updated = await Promise.all(data.map(async img => {
        if (!img.file_url || !img.media_generation_id) return img;
        const expired = await isUrlExpired(img.file_url);
        if (!expired) return img;
        // Fetch lại URL mới
        try {
          const res = await fetchVeo3ImageResult(img.media_generation_id, googleToken);
          const newUrl = res?.image?.fifeUrl || res?.media?.[0]?.image?.fifeUrl || res?.userUploadedImage?.fifeUrl || null;
          if (newUrl && newUrl !== img.file_url) {
            // Update DB
            const supabase = (await import('../services/supabaseClient')).getSupabaseClient();
            await supabase.from('veo_images').update({ file_url: newUrl }).eq('media_generation_id', img.media_generation_id);
            return { ...img, file_url: newUrl };
          }
        } catch (e) { /* ignore */ }
        return img;
      }));
      setOutfitImages(updated);
    };
    checkAndUpdateOutfitImages();
  }, []);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [models, setModels] = useState<any[]>([]);
  // Bỏ input ID ảnh tham chiếu, chỉ dùng file upload
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [veoImages, setVeoImages] = useState<any[]>([]);
  const [selectedVeoImageId, setSelectedVeoImageId] = useState('');
  // Lấy danh sách ảnh tham chiếu type tiktok_model_reference và kiểm tra file_url hết hạn
  useEffect(() => {
    const checkAndUpdateVeoImages = async () => {
      const data = await fetchVeoImages({ type: 'tiktok_model_reference', order: 'created_at.desc' });
      if (!Array.isArray(data)) {
        setVeoImages([]);
        return;
      }
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      const updated = await Promise.all(data.map(async img => {
        if (!img.file_url || !img.media_generation_id) return img;
        const expired = await isUrlExpired(img.file_url);
        if (!expired) return img;
        // Fetch lại URL mới
        try {
          const res = await fetchVeo3ImageResult(img.media_generation_id, googleToken);
          const newUrl = res?.image?.fifeUrl || res?.media?.[0]?.image?.fifeUrl || res?.userUploadedImage?.fifeUrl || null;
          if (newUrl && newUrl !== img.file_url) {
            // Update DB
            const supabase = (await import('../services/supabaseClient')).getSupabaseClient();
            await supabase.from('veo_images').update({ file_url: newUrl }).eq('media_generation_id', img.media_generation_id);
            return { ...img, file_url: newUrl };
          }
        } catch (e) { /* ignore */ }
        return img;
      }));
      setVeoImages(updated);
    };
    checkAndUpdateVeoImages();
  }, []);

  // Lấy danh sách ảnh tiktok task đã tạo và kiểm tra image_file_url hết hạn
    // State cho việc show/collapse prompt preview
    const [showFullPrompt, setShowFullPrompt] = useState(false);
  useEffect(() => {
    const checkAndUpdateTiktokTasks = async () => {
      const data = await fetchTiktokTasks();
      if (!Array.isArray(data)) {
        setModels([]);
        return;
      }
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      const updated = await Promise.all(data.map(async model => {
        let changed = false;
        let newModel = { ...model };
        // 1. Check image_file_url (chuẩn schema: image_file_url ứng với image_media_id)
        if (model.image_media_id) {
          let needUpdate = false;
          let currentUrl = model.image_file_url || '';
          // Nếu chưa có image_file_url hoặc đã hết hạn thì lấy lại
          if (!currentUrl || await isUrlExpired(currentUrl)) {
            try {
              const res = await fetchVeo3ImageResult(model.image_media_id, googleToken);
              const newUrl = res?.image?.fifeUrl || res?.media?.[0]?.image?.fifeUrl || res?.userUploadedImage?.fifeUrl || null;
              if (newUrl && newUrl !== currentUrl) {
                const supabase = (await import('../services/supabaseClient')).getSupabaseClient();
                await supabase.from('tiktok_task').update({ image_file_url: newUrl }).eq('image_media_id', model.image_media_id);
                newModel.image_file_url = newUrl;
                needUpdate = true;
              }
            } catch (e) { /* ignore */ }
          }
        }
        // 2. Check video_url in video_respone (json string)
        if (model.video_respone) {
          try {
            const resp = typeof model.video_respone === 'string' ? JSON.parse(model.video_respone) : model.video_respone;
            // Chỉ xử lý nếu có cả video_id (operationName) và sceneId
            if (resp && resp.video_id && resp.scene_id && resp.video_url) {
              const expired = await isUrlExpired(resp.video_url);
              if (expired) {
                // Gọi API để lấy lại video_url mới từ video_id (operationName) và sceneId
                const payload = {
                  operations: [
                    {
                      operation: { name: resp.video_id },
                      sceneId: resp.scene_id,
                      status: 'MEDIA_GENERATION_STATUS_PENDING',
                    },
                  ],
                };
                const GOOGLE_CHECK_STATUS_URL = '/ai-sandbox-videofx/video:batchGetStatus';
                const response = await fetch(GOOGLE_CHECK_STATUS_URL, {
                  method: 'POST',
                  headers: {
                    'authorization': `Bearer ${googleToken}`,
                    'content-type': 'text/plain;charset=UTF-8',
                    'accept': '*/*',
                  },
                  body: JSON.stringify(payload),
                });
                if (response.ok) {
                  const data = await response.json();
                  const resultOp = data?.operations?.[0];
                  let newVideoUrl = resultOp?.response?.videoResult?.video?.uri
                    || resultOp?.response?.fifeUrl
                    || resultOp?.operation?.metadata?.video?.fifeUrl
                    || resultOp?.operation?.metadata?.video?.mediaUri
                    || null;
                  if (newVideoUrl && newVideoUrl !== resp.video_url) {
                    // Update DB
                    const supabase = (await import('../services/supabaseClient')).getSupabaseClient();
                    const newResp = { ...resp, video_url: newVideoUrl };
                    await supabase.from('tiktok_task').update({ video_respone: JSON.stringify(newResp) }).eq('id', model.id);
                    newModel.video_respone = JSON.stringify(newResp);
                    changed = true;
                  }
                }
              }
            }
          } catch (e) { /* ignore */ }
        }
        return newModel;
      }));
      setModels(updated);
    };
    checkAndUpdateTiktokTasks();
  }, [submitting]);

  // Tạo ảnh người mẫu (có thể có ảnh tham chiếu)
  // Upload outfit mới
  const handleUploadOutfit = async (file: File) => {
    const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
    const base64 = await fileToJpegBase64(file);
    await uploadImageToGoogleLabs(base64, googleToken, file.name, undefined, 'tiktok_outfit_reference');
    // Refresh outfit list
    fetchVeoImages({ type: 'tiktok_outfit_reference', order: 'created_at.desc' }).then(data => {
      setOutfitImages(Array.isArray(data) ? data : []);
    });
  };

  const handleSubmit = async () => {
    if (!prompt) {
      setStatus('Vui lòng nhập prompt!');
      return;
    }
    setSubmitting(true);
    setStatus('Đang tạo ảnh...');
    try {
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      const finalPrompt = `${PROMPT_CONST}. ${prompt}`;
      let refImageId = undefined;
      // Ưu tiên chọn từ veoImages nếu có
      if (selectedVeoImageId) {
        refImageId = selectedVeoImageId;
      } else if (referenceImageFile) {
        // Nếu upload file mới
        const file = referenceImageFile;
        const base64 = await fileToJpegBase64(file);
        refImageId = await uploadImageToGoogleLabs(base64, googleToken, file.name, undefined, 'tiktok_model_reference');
      }
      // Lấy id outfit nếu có
      let outfitId = selectedOutfitId || null;
      if (outfitImageFile) {
        const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
        const base64 = await fileToJpegBase64(outfitImageFile);
        outfitId = await uploadImageToGoogleLabs(base64, googleToken, outfitImageFile.name, undefined, 'reference');
        // Refresh outfit list
        fetchVeoImages({ type: 'tiktok_outfit_reference', order: 'created_at.desc' }).then(data => {
          setOutfitImages(Array.isArray(data) ? data : []);
        });
      }
      // Chuẩn bị mảng imageInputs cho generateVeo3Image
      const imageInputs = [];
      if (refImageId) {
        imageInputs.push({ name: refImageId, imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE' });
      }
      if (outfitId) {
        imageInputs.push({ name: outfitId, imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE' });
      }
      const genRes = await generateVeo3Image({
        prompt: finalPrompt,
        imageAspectRatio: 'IMAGE_ASPECT_RATIO_PORTRAIT',
        imageInputs,
      }, googleToken);
      // Lưu kết quả vào bảng tiktok_task (chuẩn hóa), truyền outfit_media_id
      await saveTiktokTaskFromMedia(genRes, outfitId);
      setStatus('Tạo ảnh người mẫu thành công!');
      setPrompt('');
      setReferenceImageFile(null);
      setSelectedVeoImageId('');
      setOutfitImageFile(null);
      setSelectedOutfitId('');
    } catch (err) {
      setStatus('Lỗi tạo ảnh: ' + (err?.message || err));
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-5xl mx-auto bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700 text-gray-100">
      <h2 className="text-2xl font-extrabold mb-6 text-white">Tạo ảnh người mẫu TikTok</h2>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Form tạo ảnh bên trái */}
        <div className="flex-1 min-w-[320px] max-w-md">
          <input
            type="text"
            placeholder="Prompt mô tả ảnh (ví dụ: cô gái tóc dài, váy đỏ...)"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-pink-400 w-full mb-4"
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300 mb-1">Chọn ảnh tham chiếu đã upload (nếu có):</label>
            {/* Gallery preview */}
            <div className="flex flex-wrap gap-2 mb-2">
              {veoImages.length === 0 && <span className="text-xs text-gray-400">Chưa có ảnh tham chiếu nào.</span>}
              {veoImages.map(img => (
                <div
                  key={img.media_generation_id}
                  onClick={() => {
                    setSelectedVeoImageId(img.media_generation_id);
                    setReferenceImageFile(null);
                  }}
                  className={`cursor-pointer border rounded p-1 ${selectedVeoImageId === img.media_generation_id ? 'border-pink-500 ring-2 ring-pink-400' : 'border-gray-600'}`}
                  title={img.file_name || img.media_generation_id}
                >
                  <img
                    src={img.file_url}
                    alt={img.file_name || img.media_generation_id}
                    className="w-16 h-16 object-cover rounded"
                    style={{ opacity: selectedVeoImageId === img.media_generation_id ? 1 : 0.7 }}
                  />
                </div>
              ))}
            </div>
            <select
              value={selectedVeoImageId}
              onChange={e => {
                setSelectedVeoImageId(e.target.value);
                setReferenceImageFile(null);
              }}
              className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
            >
              <option value="">-- Không chọn, dùng ảnh upload mới --</option>
              {veoImages.map(img => (
                <option key={img.media_generation_id} value={img.media_generation_id}>
                  {img.file_name || img.media_generation_id}
                </option>
              ))}
            </select>
            <label className="text-sm text-gray-300">Hoặc upload ảnh tham chiếu mới:</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setReferenceImageFile(file);
                setSelectedVeoImageId('');
              }}
              className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Outfit chọn/tham chiếu */}
          <div className="flex flex-col gap-2 mt-4 p-3 rounded-xl border border-gray-700 bg-gray-800">
            <label className="text-sm text-pink-300 mb-1">Chọn outfit tham chiếu (nếu có):</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {outfitImages.length === 0 && <span className="text-xs text-gray-400">Chưa có outfit nào.</span>}
              {outfitImages.map(img => (
                <div
                  key={img.media_generation_id}
                  onClick={() => {
                    setSelectedOutfitId(img.media_generation_id);
                    setOutfitImageFile(null);
                  }}
                  className={`cursor-pointer border rounded p-1 ${selectedOutfitId === img.media_generation_id ? 'border-blue-500 ring-2 ring-blue-400' : 'border-gray-600'}`}
                  title={img.file_name || img.media_generation_id}
                >
                  <img
                    src={img.file_url}
                    alt={img.file_name || img.media_generation_id}
                    className="w-16 h-16 object-cover rounded"
                    style={{ opacity: selectedOutfitId === img.media_generation_id ? 1 : 0.7 }}
                  />
                </div>
              ))}
            </div>
            <select
              value={selectedOutfitId}
              onChange={e => {
                setSelectedOutfitId(e.target.value);
                setOutfitImageFile(null);
              }}
              className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
            >
              <option value="">-- Không chọn, dùng outfit upload mới --</option>
              {outfitImages.map(img => (
                <option key={img.media_generation_id} value={img.media_generation_id}>
                  {img.file_name || img.media_generation_id}
                </option>
              ))}
            </select>
            <label className="text-sm text-gray-300">Hoặc upload outfit mới:</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setOutfitImageFile(file);
                setSelectedOutfitId('');
                if (file) handleUploadOutfit(file);
              }}
              className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-pink-600 text-white font-semibold shadow hover:bg-pink-700 transition disabled:opacity-60 w-full mt-4"
          >{submitting ? 'Đang tạo...' : 'Tạo ảnh người mẫu'}</button>
          {status && <div className="text-base text-pink-400 font-medium mb-2 mt-2">{status}</div>}
        </div>
        {/* Preview phản hồi bên phải */}
        <div className="flex-1 min-w-[320px]">
          <h4 className="font-semibold mb-2 text-gray-300">Preview ảnh người mẫu đã tạo:</h4>
          <ul className="space-y-4">
            {models.map(model => {
              // Lấy video fifeUrl từ video_respone nếu có
              // Chuẩn hóa video_respone thành mảng
              let videoList = [];
              try {
                if (model.video_respone) {
                  const resp = typeof model.video_respone === 'string' ? JSON.parse(model.video_respone) : model.video_respone;
                  if (Array.isArray(resp)) {
                    videoList = resp;
                  } else if (resp && (resp.fifeUrl || resp.mediaGenerationId)) {
                    videoList = [resp];
                  }
                }
              } catch {}
              return (
                <li key={model.id || model.model_media_id} className="flex flex-col md:flex-row items-center gap-4 p-3 border border-gray-700 rounded-lg bg-gray-800">
                  <div className="flex flex-col items-center">
                    {model.image_file_url && (
                      <img
                        src={model.image_file_url}
                        alt={model.prompt}
                        className="w-32 h-32 object-cover rounded-xl border-2 border-pink-400 shadow-lg cursor-pointer hover:scale-105 transition mb-2"
                        style={{ background: '#222' }}
                        onClick={() => {
                          setPreviewImage(model.image_file_url);
                          setPreviewPrompt(model.prompt);
                        }}
                      />
                    )}
                    {/* Hiển thị danh sách video nếu có */}
                    {videoList.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2 w-32">
                        {videoList.map((v, idx) => (
                          v.fifeUrl ? (
                            <div key={v.fifeUrl + idx} className="relative group">
                              <video
                                src={v.fifeUrl}
                                controls={false}
                                className="w-32 h-20 object-cover rounded-xl border-2 border-blue-400 shadow-lg bg-black"
                                style={{ background: '#111', pointerEvents: 'none' }}
                                poster={model.image_file_url}
                              />
                              {/* Overlay clickable to open preview */}
                              <button
                                type="button"
                                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-40 rounded-xl transition group"
                                style={{ outline: 'none', border: 'none', cursor: 'pointer' }}
                                tabIndex={0}
                                aria-label="Xem to video"
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPreviewVideo(v.fifeUrl);
                                }}
                              >
                                <span className="text-white text-xs group-hover:opacity-100 opacity-80">Xem to</span>
                              </button>
                            </div>
                          ) : null
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-gray-100 text-lg flex-1">{model.prompt?.slice(0, 80)}...</span>
                  <button
                    className="ml-auto px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
                    onClick={() => {
                      setVideoModalModel(model);
                      setVideoModalOpen(true);
                    }}
                  >Tạo video từ ảnh này</button>
                </li>
              );
            })}
            {models.length === 0 && <li className="text-gray-500">Chưa có ảnh người mẫu nào.</li>}
          </ul>

          {/* Modal preview ảnh lớn */}
          {previewImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" onClick={() => { setPreviewImage(null); setShowFullPrompt(false); }}>
              <div className="relative bg-gray-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center max-w-full max-h-full min-w-[350px]" onClick={e => e.stopPropagation()}>
                <img
                  src={previewImage}
                  alt="Preview"
                  className="max-w-[95vw] max-h-[80vh] rounded-2xl border-4 border-pink-500 shadow-2xl mb-4"
                  style={{ background: '#222' }}
                />
                <div className="flex flex-col items-center w-full">
                  <div className="flex gap-3 mb-3 w-full justify-center">
                    <a
                      href={previewImage}
                      download
                      className="px-4 py-2 bg-pink-600 text-white rounded-lg font-semibold shadow hover:bg-pink-700 transition"
                      onClick={e => e.stopPropagation()}
                    >Tải xuống</a>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
                      onClick={e => {
                        e.stopPropagation();
                        const win = window.open(previewImage, '_blank');
                        if (win) win.focus();
                      }}
                    >Xem full màn hình</button>
                    <button
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold shadow hover:bg-gray-800 transition"
                      onClick={() => { setPreviewImage(null); setShowFullPrompt(false); }}
                    >Đóng</button>
                  </div>
                  {previewPrompt && (
                    <div className="relative w-full max-w-2xl mx-auto mt-2">
                      <button
                        className="absolute right-2 top-2 px-2 py-1 bg-gray-800 text-xs text-white rounded hover:bg-gray-700"
                        title="Copy prompt"
                        onClick={() => {
                          navigator.clipboard.writeText(previewPrompt);
                        }}
                      >Copy</button>
                      <div
                        className={`w-full bg-gray-900 text-white rounded-lg p-3 text-base border border-gray-700 mt-2 ${showFullPrompt ? 'overflow-y-auto max-h-80' : 'line-clamp-2 overflow-hidden cursor-pointer'}`}
                        style={{ minHeight: 48, transition: 'max-height 0.2s', whiteSpace: showFullPrompt ? 'pre-wrap' : 'pre-line' }}
                        tabIndex={-1}
                        onClick={() => setShowFullPrompt(v => !v)}
                        title={showFullPrompt ? 'Ẩn bớt' : 'Nhấn để xem đầy đủ'}
                      >
                        {previewPrompt}
                      </div>
                      {previewPrompt.split('\n').length > 2 || previewPrompt.length > 120 ? (
                        <button
                          className="mt-2 px-3 py-1 bg-gray-800 text-xs text-white rounded hover:bg-gray-700"
                          onClick={() => setShowFullPrompt(v => !v)}
                        >{showFullPrompt ? 'Ẩn bớt' : 'Hiện đầy đủ'}</button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal preview video lớn */}
          {previewVideo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" onClick={() => setPreviewVideo(null)}>
              <div className="relative bg-gray-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center max-w-full max-h-full min-w-[350px]" onClick={e => e.stopPropagation()}>
                <video
                  key={previewVideo}
                  src={previewVideo}
                  controls
                  className="max-w-[95vw] max-h-[80vh] rounded-2xl border-4 border-blue-500 shadow-2xl mb-4 bg-black"
                  style={{ background: '#111' }}
                  onClick={e => e.stopPropagation()}
                />
                <div className="flex flex-col items-center w-full">
                  <div className="flex gap-3 mb-3 w-full justify-center">
                    <a
                      href={previewVideo}
                      download
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
                      onClick={e => e.stopPropagation()}
                    >Tải video</a>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
                      onClick={e => {
                        e.stopPropagation();
                        const win = window.open(previewVideo, '_blank');
                        if (win) win.focus();
                      }}
                    >Xem full màn hình</button>
                    <button
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold shadow hover:bg-gray-800 transition"
                      onClick={() => setPreviewVideo(null)}
                    >Đóng</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal tạo video từ ảnh người mẫu */}
          {videoModalOpen && videoModalModel && (
            <VideoGenerationModal
              isOpen={videoModalOpen}
              onClose={() => setVideoModalOpen(false)}
              imageUrl={videoModalModel.image_file_url}
              tokens={{ googleToken: import.meta.env.VITE_GOOGLE_LABS_TOKEN, authToken: '', sentinelToken: '' }}
              sourceTask={videoModalModel}
            />
          )}
        </div>
      </div>
    </div>
  );
}
