import React, { useRef, useState, useEffect } from 'react';
import { uploadImageToGoogleLabs, startVeoStartEndVideoGeneration, pollVeoVideoStatus } from '../services/apiService';
import { DEFAULT_API_TOKENS } from '../constants';

type Scene = {
  file?: File | null;
  url?: string | null;
  name?: string;
  mediaId?: string | null;
  uploadStatus?: 'idle' | 'uploading' | 'done' | 'failed';
};

type PairStatus = {
  status: 'idle' | 'uploading' | 'generating' | 'polling' | 'done' | 'failed';
  message?: string;
  videoUrl?: string | null;
};

const createEmptyScene = (): Scene => ({ file: null, url: null, name: undefined, mediaId: null, uploadStatus: 'idle' });

const fileToJpegBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
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

const StoryboardEditor: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([createEmptyScene(), createEmptyScene()]);
  const [transitions, setTransitions] = useState<string[]>(['']);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pairStatuses, setPairStatuses] = useState<PairStatus[]>([]);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const updateScene = (index: number, patch: Partial<Scene>) => {
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  };

  const handleFile = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    if (scenes[index]?.url) URL.revokeObjectURL(scenes[index].url as string);
    updateScene(index, { file, url, name: file.name, uploadStatus: 'uploading' });

    // immediately start uploading to Google Labs and save mediaId into scene
    (async () => {
      try {
        const googleToken = DEFAULT_API_TOKENS.googleToken;
        if (!googleToken) throw new Error('Google Labs token not configured');
        const base64 = await fileToJpegBase64(file);
          const mediaId = await uploadImageToGoogleLabs(base64, googleToken, file.name, undefined, 'flow');
        updateScene(index, { mediaId, uploadStatus: 'done' });
      } catch (err: any) {
        console.error('Immediate upload failed:', err);
        updateScene(index, { mediaId: null, uploadStatus: 'failed' });
      }
    })();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragIndex(null);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image')) {
      handleFile(index, file);
    }
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(index, file);
  };

  const addScene = (atIndex?: number) => {
    setScenes(prev => {
      const copy = [...prev];
      const newScene = createEmptyScene();
      if (typeof atIndex === 'number') copy.splice(atIndex + 1, 0, newScene);
      else copy.push(newScene);
      return copy;
    });
    setTransitions(prev => {
      const copy = [...prev];
      if (typeof atIndex === 'number') copy.splice(atIndex + 1, 0, '');
      else copy.push('');
      // ensure length matches scenes.length - 1 after update
      return copy;
    });
  };

  const removeScene = (index: number) => {
    // remove scene and clean up its object URL
    setScenes(prev => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (removed?.url) URL.revokeObjectURL(removed.url as string);
      // trim inputRefs to new length
      inputRefs.current = inputRefs.current.slice(0, next.length);
      return next;
    });

    setTransitions(prev => {
      const next = [...prev];
      // remove the transition slot corresponding to the removed scene
      if (index < next.length) next.splice(index, 1);
      else if (next.length) next.splice(next.length - 1, 1);
      // ensure transitions length equals new scenes.length - 1
      return next;
    });
  };

  // Keep inputRefs length in sync with scenes
  useEffect(() => {
    if (inputRefs.current.length > scenes.length) {
      inputRefs.current = inputRefs.current.slice(0, scenes.length);
    }
  }, [scenes.length]);

  // Ensure transitions and pairStatuses always match scenes length - 1
  useEffect(() => {
    const needed = Math.max(0, scenes.length - 1);
    setTransitions(prev => {
      if (prev.length === needed) return prev;
      if (prev.length < needed) return [...prev, ...Array(needed - prev.length).fill('')];
      return prev.slice(0, needed);
    });

    setPairStatuses(prev => {
      if (prev.length === needed) return prev;
      if (prev.length < needed) return [...prev, ...Array(needed - prev.length).fill({ status: 'idle' } as PairStatus)];
      return prev.slice(0, needed);
    });
  }, [scenes.length]);

  const canCreate = scenes.length >= 2
    && scenes.every(s => (s.file != null) || (s.mediaId != null))
    && transitions.length === Math.max(0, scenes.length - 1)
    && transitions.every(t => t.trim().length > 0);

  const handleCreate = async () => {
    if (!DEFAULT_API_TOKENS.googleToken) {
      alert('Google Labs token is not configured in environment (VITE_GOOGLE_LABS_TOKEN).');
      return;
    }

    const googleToken = DEFAULT_API_TOKENS.googleToken;
    const pairCount = scenes.length - 1;
    setPairStatuses(Array.from({ length: pairCount }, () => ({ status: 'idle' } as PairStatus)));

    try {
      setIsCreating(true);
      const results: string[] = [];

      for (let i = 0; i < pairCount; i++) {
        // update status
        setPairStatuses(prev => prev.map((p, ix) => ix === i ? { status: 'uploading', message: 'Uploading images...' } : p));

        let startMediaId = scenes[i].mediaId ?? null;
        let endMediaId = scenes[i + 1].mediaId ?? null;

        // If media isn't already uploaded, convert & upload now
        if (!startMediaId) {
          const startFile = scenes[i].file as File | undefined;
          if (!startFile) throw new Error(`Missing start image for scene ${i + 1}`);
          const startBase64 = await fileToJpegBase64(startFile);
            startMediaId = await uploadImageToGoogleLabs(startBase64, googleToken, scenes[i].name, undefined, 'flow');
          updateScene(i, { mediaId: startMediaId, uploadStatus: 'done' });
        }

        if (!endMediaId) {
          const endFile = scenes[i + 1].file as File | undefined;
          if (!endFile) throw new Error(`Missing end image for scene ${i + 2}`);
          const endBase64 = await fileToJpegBase64(endFile);
            endMediaId = await uploadImageToGoogleLabs(endBase64, googleToken, scenes[i + 1].name, undefined, 'flow');
          updateScene(i + 1, { mediaId: endMediaId, uploadStatus: 'done' });
        }

        setPairStatuses(prev => prev.map((p, ix) => ix === i ? { status: 'generating', message: 'Starting generation...' } : p));

        const prompt = transitions[i];
        const { operationName, sceneId } = await startVeoStartEndVideoGeneration(prompt, startMediaId, endMediaId, googleToken);

        setPairStatuses(prev => prev.map((p, ix) => ix === i ? { status: 'polling', message: 'Polling generation status...' } : p));

        // poll for result
        try {
          const videoUrl = await pollVeoVideoStatus(operationName, sceneId, googleToken, (msg) => {
            setPairStatuses(prev => prev.map((p, ix) => ix === i ? { ...p, message: msg } : p));
          });

          setPairStatuses(prev => prev.map((p, ix) => ix === i ? { status: 'done', message: 'Done', videoUrl } : p));
          results.push(videoUrl || '');
        } catch (pollErr: any) {
          setPairStatuses(prev => prev.map((p, ix) => ix === i ? { status: 'failed', message: (pollErr?.message || String(pollErr)) } : p));
          results.push('');
        }
      }

      alert('Storyboard generation finished. ' + results.filter(Boolean).length + ' clips ready.');
    } catch (err: any) {
      console.error('Create storyboard failed', err);
      alert('Failed to create storyboard: ' + (err?.message || err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Storyboard — sequence scenes</h3>

      <div className="space-y-4">
        {scenes.map((scene, idx) => (
          <div key={idx} className="flex gap-4 items-start">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragIndex(idx); }}
              onDragLeave={() => setDragIndex(null)}
              onDrop={(e) => handleDrop(e, idx)}
              className={`w-1/3 p-3 rounded-md border transition ${dragIndex === idx ? 'border-dashed border-brand-400 bg-brand-50' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start">
                <label className="text-sm font-medium text-gray-700">Scene {idx + 1}</label>
                <div className="flex gap-2">
                  <button onClick={() => addScene(idx)} className="text-xs px-2 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">+ Add</button>
                  {scenes.length > 2 && (
                    <button onClick={() => removeScene(idx)} className="text-xs px-2 py-1 bg-red-50 text-red-700 border rounded shadow-sm hover:bg-red-100">Remove</button>
                  )}
                </div>
              </div>

              {scene.url ? (
                <div className="mt-3">
                  <img src={scene.url} alt={`scene-${idx}`} className="w-full h-36 object-cover rounded-md mb-2" />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">{scene.name}</div>
                    <div className="text-xs text-gray-500">{scene.mediaId ? <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">Uploaded</span> : (scene.uploadStatus === 'uploading' ? <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">Uploading...</span> : (scene.uploadStatus === 'failed' ? <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded">Upload failed</span> : <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">Not uploaded</span>))}</div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => inputRefs.current[idx]?.click()} className="px-3 py-1 text-sm bg-white border rounded">Replace</button>
                    {scene.mediaId && <div className="text-xs text-gray-500">ID: {scene.mediaId.slice(0,8)}...</div>}
                  </div>
                </div>
              ) : (
                  <div className="mt-3 h-36 flex flex-col items-center justify-center text-center text-gray-500">
                    <div>Drag & drop image here</div>
                    <div className="mt-2">
                      <button onClick={() => inputRefs.current[idx]?.click()} className="px-3 py-1 text-sm bg-brand-600 text-white rounded shadow">Upload</button>
                    </div>
                    <div className="mt-2 text-xs">
                      {scene.uploadStatus === 'uploading' && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">Uploading...</span>}
                      {scene.uploadStatus === 'failed' && <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded">Upload failed</span>}
                    </div>
                  </div>
              )}

              <input ref={el => inputRefs.current[idx] = el} type="file" accept="image/*" onChange={(e) => handleSelectFile(e, idx)} className="hidden" />
            </div>

            {idx < scenes.length - 1 ? (
              <div className="flex-1 p-3 rounded-md border border-gray-100 bg-gray-50">
                <label className="text-sm font-medium text-gray-700">Prompt between Scene {idx + 1} and {idx + 2}</label>
                <textarea
                  value={transitions[idx] || ''}
                  onChange={(e) => setTransitions(prev => prev.map((t, i) => i === idx ? e.target.value : t))}
                  rows={4}
                  placeholder="Describe the transformation between these two frames..."
                  className="w-full mt-2 rounded-md border border-gray-200 p-2 text-sm"
                />
                {idx < pairStatuses.length && (
                  <div className="mt-2 text-xs text-gray-600">Status: {pairStatuses[idx]?.status} {pairStatuses[idx]?.message ? `— ${pairStatuses[idx]?.message}` : ''}</div>
                )}
              </div>
            ) : (
              <div className="flex-1 p-3 rounded-md border border-dashed border-gray-200 bg-white text-sm text-gray-500 flex items-center justify-center">
                Final Scene
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end">
          <button onClick={() => addScene()} className="px-4 py-2 mr-3 bg-white border rounded">Add Scene</button>
          <button onClick={handleCreate} disabled={!canCreate || isCreating} className={`px-4 py-2 rounded ${canCreate ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {isCreating ? 'Creating...' : 'Create Full Video'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryboardEditor;
