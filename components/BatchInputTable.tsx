import React, { useState, useEffect, useRef } from 'react';
import { fetchVeo3ImageResult, uploadImageToGoogleLabs, ensureValidMediaUrl } from '../services/apiService';
import { fetchVeoImages } from '../services/dbService';
import { logVeoImageTaskToDb } from '../services/dbService';
import { DbVeoImageRecord } from '../types';

interface BatchRow {
  imagePrompt: string;
  referenceImageId: string; // comma-separated mediaGenerationIds
  videoPrompt: string;
}

const emptyRow: BatchRow = {
  imagePrompt: '',
  referenceImageId: '',
  videoPrompt: '',
};

export default function BatchInputTable() {
  const [rows, setRows] = useState<BatchRow[]>([{ ...emptyRow }]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [veoImages, setVeoImages] = useState<DbVeoImageRecord[]>([]);
  const [showPaste, setShowPaste] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'image' | 'video' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewOperationName, setPreviewOperationName] = useState<string | null>(null);
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

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
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load error'));
      };
      img.src = url;
    });
  };

  // Upload ảnh lên Veo3 và lưu vào DB
  const handleUploadImage = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      // Chuyển mọi file sang JPEG base64
      const base64 = await fileToJpegBase64(uploadFile);
      // Lấy token từ biến môi trường
      const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
      // Sử dụng customFileName nếu có, nếu không lấy tên file gốc
      const fileNameToUse = customFileName.trim() ? customFileName.trim() : uploadFile.name;
      const mediaId = await uploadImageToGoogleLabs(base64, googleToken, fileNameToUse, undefined, 'reference');
      // Reload lại danh sách ảnh
      setUploadFile(null);
      setCustomFileName('');
      fetchVeoImages().then(setVeoImages);
      alert('Upload thành công!');
    } catch (err) {
      alert('Lỗi upload: ' + (err?.message || err));
    }
    setUploading(false);
  };


  useEffect(() => {
    fetchVeoImages().then(data => {
      console.log('fetchVeoImages result:', data);
      setVeoImages(data);
    });
  }, []);

  const handleChange = (idx: number, field: keyof BatchRow, value: any) => {
    const newRows = [...rows];
    newRows[idx][field] = value;
    setRows(newRows);
  };

  const addRow = () => setRows([...rows, { ...emptyRow }]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  // Parse pasted text (tab/csv) and add rows
  const handlePaste = () => {
    const text = pasteRef.current?.value || '';
    if (!text.trim()) return;
    let newRows: BatchRow[] = [];
    // Nếu là JSON array, parse luôn
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        newRows = json.map(obj => ({
          imagePrompt: obj.propmtImage || obj.promptImage || '',
          referenceImageId: Array.isArray(obj.reference) ? obj.reference.join(',') : (obj.reference || ''),
          videoPrompt: obj.promptVideo || '',
        }));
      }
    } catch {
      // Nếu không phải JSON, xử lý như cũ
      const lines = text.trim().split(/\r?\n/);
      newRows = lines.map(line => {
        const parts = line.split(/\t|,|;/);
        return {
          imagePrompt: parts[0] || '',
          referenceImageId: parts[1] || '',
          videoPrompt: parts[2] || '',
        };
      });
    }
    setRows([...rows, ...newRows]);
    setShowPaste(false);
    if (pasteRef.current) pasteRef.current.value = '';
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus([]);
    // Gọi trực tiếp API Google Labs cho từng row: gen ảnh -> upload lại ảnh -> gen video
    const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
    const results: string[] = [];
    // Thêm fetchUrlToDataUrl vào import list
    const { generateVeo3Image, fetchVeo3ImageResult, uploadImageToGoogleLabs, startVeoVideoGeneration, pollVeoVideoStatus, fetchUrlToDataUrl } = await import('../services/apiService');
    // Lưu ý: fetchUrlToDataUrl là hàm mới, cần được bạn định nghĩa trong apiService

    for (const row of rows) {
      try {
        // 1. Gen ảnh
        const genRes = await generateVeo3Image({
          prompt: row.imagePrompt,
          referenceImageId: row.referenceImageId,
        }, googleToken);
        const mediaGenId = genRes?.media?.[0]?.image?.generatedImage?.mediaGenerationId;
        if (!mediaGenId) {
          results.push('Lỗi: Không có mediaGenerationId sau khi gen ảnh');
          continue;
        }
        // 2. Lấy URL ảnh vừa gen
        const imgRes = await fetchVeo3ImageResult(mediaGenId, googleToken);
        const imgUrl = imgRes?.image?.fifeUrl || null;
        await logVeoImageTaskToDb(
          mediaGenId,
          row.imagePrompt || '',
          null,
          imgUrl,
          imgRes
        );
        if (!imgUrl) {
          results.push('Lỗi: Không lấy được URL ảnh vừa gen');
          continue;
        }
        // 3. 🔥 FIX LỖI CORS: Gọi service API để fetch ảnh (Server-Side) và trả về Base64
        // Hàm này phải được định nghĩa trong apiService để dùng fetch/axios Node.js, VƯỢT QUA CORS.
        const imgBase64 = await fetchUrlToDataUrl(imgUrl);
        // Lưu ý: imgBase64 lúc này phải có tiền tố "data:image/jpeg;base64,..."

        // 4. Upload lại ảnh lên Google Labs để lấy mediaId mới
        const uploadedMediaId = await uploadImageToGoogleLabs(imgBase64, googleToken, undefined, undefined, 'ai');
        // 5. Dùng mediaId vừa upload để gen video với prompt video
        const videoPrompt = row.videoPrompt || row.imagePrompt;
        const videoRes = await startVeoVideoGeneration(videoPrompt, uploadedMediaId, googleToken);
        // 6. Polling liên tục để lấy video file url
        let videoUrl = '';
        try {
          videoUrl = await pollVeoVideoStatus(videoRes.operationName, videoRes.sceneId, googleToken);
        } catch (pollErr) {
          results.push(`Gen video: ${videoRes?.operationName || 'Thành công'} nhưng polling lỗi: ${pollErr?.message || pollErr}`);
          continue;
        }
        // 7. Cập nhật video_url vào DB
        if (videoUrl) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
          await supabase.from('veo_video_tasks').update({ video_url: videoUrl }).eq('operation_name', videoRes.operationName);
          results.push(`Gen ảnh: ${mediaGenId} | Upload lại: ${uploadedMediaId} | Gen video: ${videoRes?.operationName} | Video URL: ${videoUrl}`);
        } else {
          results.push(`Gen ảnh: ${mediaGenId} | Upload lại: ${uploadedMediaId} | Gen video: ${videoRes?.operationName} | Không lấy được video URL`);
        }
      } catch (err) {
        results.push('Lỗi: ' + (err?.message || err));
      }
    }
    setStatus(results);
    setSubmitting(false);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-2xl font-extrabold mb-6 text-brand-700">Batch Flow Input</h2>
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg px-4 py-6 flex flex-col items-center justify-center transition ${dragActive ? 'border-purple-600 bg-purple-50' : 'border-gray-300 bg-gray-100'}`}
          style={{ minWidth: 220 }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={e => setUploadFile(e.target.files?.[0] || null)}
            className="mb-2"
          />
          <span className="text-sm text-gray-600">Kéo thả ảnh vào đây hoặc chọn file</span>
          {uploadFile && <span className="mt-2 text-xs text-brand-700">Đã chọn: {uploadFile.name}</span>}
        </div>
        <input
          type="text"
          placeholder="Tên file tuỳ chọn (không bắt buộc)"
          value={customFileName}
          onChange={e => setCustomFileName(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-brand-300"
          style={{ minWidth: 200 }}
        />
        <button
          onClick={handleUploadImage}
          disabled={!uploadFile || uploading}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 transition disabled:opacity-60"
        >{uploading ? 'Đang upload...' : 'Upload ảnh lên Veo3'}</button>
        <button onClick={addRow} disabled={submitting} className="px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold shadow hover:bg-brand-700 transition disabled:opacity-60">Thêm dòng</button>
        <button onClick={() => setShowPaste(v => !v)} className="px-4 py-2 rounded-lg bg-gray-100 font-semibold shadow hover:bg-gray-200 transition">Paste từ clipboard</button>
        <button onClick={handleSubmit} disabled={submitting || rows.length === 0} className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition disabled:opacity-60">
          {submitting ? 'Đang gửi...' : 'Gửi batch'}
        </button>
      </div>
      {showPaste && (
        <div className="mb-6">
          <textarea
            ref={pasteRef}
            rows={6}
            className="w-full border border-brand-200 rounded-lg p-3 mb-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-300"
            placeholder={`Prompt ảnh[TAB]ID ảnh tham chiếu[TAB]Prompt video\nMỗi dòng 1 batch, phân tách bằng tab hoặc dấu phẩy.\nHoặc paste JSON:\n[\n  {\n    \"propmtImage\": \"Prompt ảnh\",\n    \"reference\": [\"id1\", \"id2\"],\n    \"promptVideo\": \"Prompt video\"\n  }\n]`}
          />
          <button onClick={handlePaste} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">Thêm từ clipboard</button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="bg-brand-50">
              <th className="px-4 py-3 rounded-tl-xl text-left font-bold text-brand-700">Prompt Ảnh</th>
              <th className="px-4 py-3 text-left font-bold text-brand-700">Ảnh Tham Chiếu</th>
              <th className="px-4 py-3 text-left font-bold text-brand-700">Prompt Video</th>
              <th className="px-4 py-3 rounded-tr-xl"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="bg-gray-50 hover:bg-brand-50 shadow rounded-xl transition">
                <td className="px-4 py-2 align-middle">
                  <input
                    type="text"
                    value={row.imagePrompt}
                    onChange={e => handleChange(idx, 'imagePrompt', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </td>
                <td className="px-4 py-2 align-middle">
                  <div className="flex flex-wrap gap-2">
                    {veoImages.map(img => {
                      const checked = row.referenceImageId.split(',').includes(img.media_generation_id);
                      return (
                        <label key={img.media_generation_id} className="relative cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const ids = row.referenceImageId ? row.referenceImageId.split(',').filter(Boolean) : [];
                              let newIds;
                              if (e.target.checked) {
                                newIds = [...ids, img.media_generation_id];
                              } else {
                                newIds = ids.filter(id => id !== img.media_generation_id);
                              }
                              handleChange(idx, 'referenceImageId', newIds.join(','));
                            }}
                            className="absolute top-1 left-1 z-10 w-4 h-4"
                          />
                          <img
                            src={img.file_url || ''}
                            alt={img.file_name || img.media_generation_id}
                            className={`w-16 h-16 object-cover rounded-lg border ${checked ? 'border-blue-600 ring-2 ring-blue-400' : 'border-gray-300'}`}
                            style={{ filter: checked ? 'brightness(0.85)' : 'none' }}
                            onError={async (e) => {
                              const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
                              const newUrl = await ensureValidMediaUrl({
                                type: 'image',
                                mediaId: img.media_generation_id,
                                url: img.file_url || '', // Nếu null, vẫn gọi để fetch URL mới
                                googleToken,
                                updateDb: async (newUrl) => {
                                  const { createClient } = await import('@supabase/supabase-js');
                                  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
                                  await supabase.from('veo_images').update({ file_url: newUrl }).eq('media_generation_id', img.media_generation_id);
                                },
                              });
                              e.target.src = newUrl;
                            }}
                          />
                          <span className="block text-xs text-center mt-1 max-w-[64px] truncate">{img.file_name || img.media_generation_id}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-2 align-middle">
                  <input
                    type="text"
                    value={row.videoPrompt}
                    onChange={e => handleChange(idx, 'videoPrompt', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </td>
                <td className="px-4 py-2 align-middle text-center flex gap-2 justify-center">
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(idx)} disabled={submitting} className="text-red-600 hover:underline font-semibold">Xóa</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6">
        {status.map((s, i) => (
          <div key={i} className="text-base text-green-700 font-medium mb-1">{s}</div>
        ))}
      </div>

      {/* Modal preview ảnh/video */}
      {previewOpen && previewType === 'image' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setPreviewOpen(false)}>&times;</button>
            <h3 className="text-lg font-bold mb-4">{previewTitle}</h3>
            <img src={previewUrl} alt={previewTitle} className="w-full rounded-lg" />
            {/* Kiểm tra link previewUrl hết hạn khi mở modal */}
            {/* Nếu hết hạn, tự động lấy lại link mới và cập nhật DB */}
            {/* Chỉ áp dụng cho ảnh, video xử lý ở modal video */}
            {previewUrl && previewType === 'image' && (
              <React.Fragment>
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  className="w-full rounded-lg"
                  onError={async (e) => {
                    const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
                    const imgRecord = veoImages.find(v => v.file_url === previewUrl || !v.file_url);
                    if (!imgRecord) return;
                    const newUrl = await ensureValidMediaUrl({
                      type: 'image',
                      mediaId: imgRecord.media_generation_id,
                      url: previewUrl || '', // Nếu null, vẫn gọi để fetch URL mới
                      googleToken,
                      updateDb: async (newUrl) => {
                        const { createClient } = await import('@supabase/supabase-js');
                        const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
                        await supabase.from('veo_images').update({ file_url: newUrl }).eq('media_generation_id', imgRecord.media_generation_id);
                      },
                    });
                    e.target.src = newUrl;
                  }}
                />
              </React.Fragment>
            )}
          </div>
        </div>
      )}
      {previewOpen && previewType === 'video' && previewUrl && previewOperationName && previewSceneId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setPreviewOpen(false)}>&times;</button>
            <h3 className="text-lg font-bold mb-4">{previewTitle}</h3>
            <video
              src={previewUrl}
              controls
              className="w-full rounded-lg"
              onError={async (e) => {
                const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;
                const newUrl = await ensureValidMediaUrl({
                  type: 'video',
                  operationName: previewOperationName,
                  sceneId: previewSceneId,
                  url: previewUrl,
                  googleToken,
                  updateDb: async (newUrl) => {
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
                    await supabase.from('veo_video_tasks').update({ video_url: newUrl }).eq('operation_name', previewOperationName);
                  },
                });
                e.target.src = newUrl;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
