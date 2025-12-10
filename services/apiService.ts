import axios from 'axios';
// Payload chuẩn cho batchGenerateImages Google Labs
export interface Veo3GenerateImageRequest {
  clientContext: {
    sessionId: string;
  };
  seed: number;
  imageModelName: string;
  imageAspectRatio: string;
  prompt: string;
  imageInputs: Array<{
    name: string; // mediaId của ảnh đã upload
    imageInputType: "IMAGE_INPUT_TYPE_REFERENCE";
  }>;
}

export async function fetchUrlToDataUrl(url) {
    try {
      const localProxyUrl = url.replace('https://storage.googleapis.com', '/api/storage');
        // Tải dữ liệu ảnh dưới dạng Buffer (dùng Node.js fetch/axios để vượt CORS)
        const response = await axios.get(localProxyUrl, { responseType: 'arraybuffer' });
        
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const buffer = Buffer.from(response.data);
        const base64 = buffer.toString('base64');
        
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error("Lỗi khi fetch URL sang Base64:", error.message);
        throw new Error("Lỗi fetch server-side: Không thể tải ảnh để chuyển đổi Base64.");
    }
}
/**
 * Generate Veo3 image (batchGenerateImages) with standardized payload
 * Accepts prompt, referenceImageId, and optional params
 */
import { GOOGLE_GEN_IMAGE_URL, GOOGLE_FETCH_IMAGE_URL } from '../constants';

export const generateVeo3Image = async (
  {
    prompt,
    referenceImageId,
    sessionId = ';' + Date.now(),
    seed = Math.floor(Math.random() * 1000000),
    imageModelName = 'GEM_PIX_2',
    imageAspectRatio = 'IMAGE_ASPECT_RATIO_LANDSCAPE',
  }: {
    prompt: string;
    referenceImageId?: string;
    sessionId?: string;
    seed?: number;
    imageModelName?: string;
    imageAspectRatio?: string;
  },
  googleToken: string
): Promise<any> => {
  const payload: Veo3GenerateImageRequest = {
    clientContext: {
      sessionId,
    },
    seed,
    imageModelName,
    imageAspectRatio,
    prompt,
    imageInputs: referenceImageId
      ? [{
          name: referenceImageId,
          imageInputType: "IMAGE_INPUT_TYPE_REFERENCE",
        }]
      : [],
  };

  const response = await fetch(GOOGLE_GEN_IMAGE_URL, {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'authorization': `Bearer ${googleToken}`,
      'content-type': 'text/plain;charset=UTF-8'
    },
    body: JSON.stringify({ requests: [payload] }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Veo3 image generation failed: ${txt}`);
  }

  return await response.json();
};

/**
 * Fetches the result of a generated Veo3 image by mediaGenerationId
 * Returns the raw response (including fifeUrl, etc)
 */
export const fetchVeo3ImageResult = async (
  mediaGenerationId: string,
  googleToken: string
): Promise<any> => {
  let url = `${GOOGLE_FETCH_IMAGE_URL}/${mediaGenerationId}`;
  url += `?key=AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY&clientContext.tool=PINHOLE`;

  try {
    const response = await axios.get(url, {
      headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${googleToken}`,
        // Axios sẽ tôn trọng tuyệt đối các header này
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        
        // Mẹo: Thêm Header Host nếu server bên kia check kỹ
        // 'Host': 'labs.google' 
      }
    });

  return response.data;
  } catch (error: any) {
    // Xử lý lỗi của axios
    if (error.response) {
       throw new Error(`Veo3 fetch failed [${error.response.status}]: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Veo3 fetch failed: ${error.message}`);
  }
};

import { 
  GEN_API_URL, 
  STATUS_API_URL, 
  UPLOAD_API_URL,
  GOOGLE_UPLOAD_URL,
  GOOGLE_GEN_VIDEO_URL,
  GOOGLE_GEN_VIDEO_STARTEND_URL,
  GOOGLE_CHECK_STATUS_URL,
  POLLING_INTERVAL_MS, 
  MAX_POLLING_ATTEMPTS 
} from '../constants';
import { ApiResponse, BatchInputItem, PollingResult, ApiTokens, UploadResponse } from '../types';
import { logVeoImageToDb, logVeoVideoTaskToDb, upsertVeoVideoTask } from './dbService';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Modified getHeaders to optionally include/exclude sentinel token
const getHeaders = (tokens?: ApiTokens, includeSentinel: boolean = true) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (tokens?.authToken) {
    headers['authorization'] = `Bearer ${tokens.authToken}`;
  }
  // Only add sentinel token if specifically requested (defaults to true)
  if (includeSentinel && tokens?.sentinelToken) {
    headers['openai-sentinel-token'] = tokens.sentinelToken;
  }
  return headers;
};

/**
 * Sends the generation request to the backend
 * Requires both Authorization and Sentinel Token
 */
export const submitGenerationTask = async (payload: BatchInputItem, tokens?: ApiTokens): Promise<string> => {
  try {
    const response = await fetch(GEN_API_URL, {
      method: 'POST',
      headers: getHeaders(tokens, true), // Include sentinel for generation
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data?.id) {
      throw new Error('No Task ID received from server response');
    }

    return data.id;
  } catch (error) {
    console.error("Submit Generation Error:", error);
    throw error;
  }
};

/**
 * Submits a storyboard-style generation request.
 * Expects `scenes` to be an array of objects like { prompt, upload_media_id }
 */
export const createStoryboardGeneration = async (scenes: any[], tokens?: ApiTokens): Promise<any> => {
  try {
    const payload = {
      is_storyboard: true,
      scenes
    };

    const response = await fetch(GEN_API_URL, {
      method: 'POST',
      headers: getHeaders(tokens, true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Storyboard generation failed: ${txt}`);
    }

    return await response.json();
  } catch (err) {
    console.error('createStoryboardGeneration error:', err);
    throw err;
  }
};

/**
 * Polls the status of a specific task ID
 * Requires ONLY Authorization, NO Sentinel Token
 */
export const pollTaskUntilComplete = async (
  taskId: string, 
  onUpdate: (attempt: number) => void,
  tokens?: ApiTokens
): Promise<PollingResult> => {
  let status: 'running' | 'completed' | 'failed' = 'running';
  let attempt = 0;

  while (status === 'running' && attempt < MAX_POLLING_ATTEMPTS) {
    await delay(POLLING_INTERVAL_MS);
    attempt++;
    onUpdate(attempt);

    try {
      // Fetch recent tasks to find our specific task
      // Important: Do NOT send sentinel token here
      const response = await fetch(`${STATUS_API_URL}?limit=1`, {
        method: 'GET',
        headers: getHeaders(tokens, false) 
      });

      if (!response.ok) {
         // If the poll request fails, we don't fail the task immediately, just continue
         console.warn(`Poll request failed, retrying... (${attempt})`);
         continue;
      }

      const data = await response.json();
      const tasks: ApiResponse[] = data.task_responses || [];
      const currentTask = tasks.find(t => t.id === taskId);

      if (currentTask) {
        const apiStatus = currentTask.status;

        if (apiStatus === 'succeeded') {
          return { status: 'completed', data: currentTask };
        } else if (apiStatus === 'failed') {
          return { status: 'failed', error: currentTask.failure_reason || "Unknown failure reason" };
        }
        // If still running/pending, loop continues
      } 
      
    } catch (err: any) {
      console.error(`Polling exception for ${taskId}:`, err);
      // Do not throw here, let the loop continue to be robust against transient network issues
    }
  }

  return { 
    status: 'failed', 
    error: `Task timed out after ${MAX_POLLING_ATTEMPTS} attempts.` 
  };
};

/**
 * Uploads a file to the backend
 * Uses FormData and specific headers
 */
export const uploadFile = async (file: File, customName?: string, tokens?: ApiTokens): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    // Use custom name if provided, otherwise fallback to original filename
    formData.append('file_name', customName || file.name);

    const headers: HeadersInit = {};
    if (tokens?.authToken) {
      headers['authorization'] = `Bearer ${tokens.authToken}`;
    }
    // Note: Do NOT set Content-Type for FormData, browser sets it with boundary automatically

    const response = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload Failed ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Upload Error:", error);
    throw error;
  }
};


// --- VEO3 VIDEO GENERATION SERVICES ---

/**
 * Uploads an image (as base64) to Google Labs for video generation
 */
/**
 * @param type string: 'reference' | 'ai' | 'flow'
 */
export const uploadImageToGoogleLabs = async (
  jpegBase64: string,
  googleToken: string,
  originalFileName?: string,
  originalFileId?: string,
  type?: 'reference' | 'ai' | 'flow'
): Promise<string> => {
  // Ensure we have raw base64 (remove data:image/jpeg;base64, prefix if present)
  const rawBase64 = jpegBase64.includes(',') ? jpegBase64.split(',')[1] : jpegBase64;

  const payload = {
    imageInput: {
      rawImageBytes: rawBase64,
      mimeType: "image/jpeg", // We strictly convert to JPEG in the UI before sending
      isUserUploaded: true,
      aspectRatio: "IMAGE_ASPECT_RATIO_LANDSCAPE"
    },
    clientContext: {
      sessionId: `;${Date.now()}`,
      tool: "ASSET_MANAGER"
    }
  };

  const response = await fetch(GOOGLE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${googleToken}`,
      'content-type': 'text/plain;charset=UTF-8', // Google Labs specific
      'accept': '*/*'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const txt = await response.text();
    // Try to parse error for better message
    try {
        const errJson = JSON.parse(txt);
        throw new Error(`Google Upload Error: ${errJson.error?.message || txt}`);
    } catch (e) {
        throw new Error(`Google Upload Failed (${response.status}): ${txt}`);
    }
  }

  const data = await response.json();
  console.log('Google Upload Response:', data);
  const mediaId = data?.mediaGenerationId?.mediaGenerationId || data?.imageResult?.mediaId;
  if (mediaId) {
    // Best-effort: persist veo image metadata into Supabase
    try {
      // Fetch file_url từ API fetchVeo3ImageResult
      let fileUrl: string | null = null;
      try {
        const googleToken = import.meta.env.VITE_GOOGLE_LABS_TOKEN;;
        const imgRes = await fetchVeo3ImageResult(mediaId, googleToken);
        console.log('Fetched Veo3 image recsult for logging:', imgRes);
        fileUrl = imgRes?.image?.fifeUrl || imgRes?.media?.[0]?.image?.fifeUrl || imgRes?.userUploadedImage?.fifeUrl || null;
        console.log('Extracted fileUrl for veo image:', fileUrl);
      } catch (e) {
        console.warn('Failed to fetch Veo3 image result for fileUrl extraction', e);
      }
      await logVeoImageToDb(mediaId, data?.width ?? null, data?.height ?? null, originalFileName, data, type, fileUrl);  
    } catch (e) {
      console.warn('Failed to log veo image to DB:', e);
    }

    return mediaId;
  }

  throw new Error("No mediaId returned from Google Upload");
};

/**
 * Starts the Veo3 video generation task
 */
export const startVeoVideoGeneration = async (
  prompt: string, 
  googleMediaId: string, 
  googleToken: string
): Promise<{ operationName: string, sceneId: string }> => {
  
  const sceneId = crypto.randomUUID();

  const payload = {
    clientContext: {
        sessionId: `;${Date.now()}`,
        projectId: "89ce78f2-876e-4c07-ae58-f2226d1ac578", // Fixed ID from example
        tool: "PINHOLE",
        userPaygateTier: "PAYGATE_TIER_ONE"
    },
    requests: [
        {
            aspectRatio: "VIDEO_ASPECT_RATIO_LANDSCAPE",
            seed: Math.floor(Math.random() * 100000), // Random seed
            textInput: { prompt: prompt },
            videoModelKey: "veo_3_1_i2v_s_fast",
            startImage: { mediaId: googleMediaId },
            metadata: { sceneId: sceneId }
        }
    ]
  };

  const response = await fetch(GOOGLE_GEN_VIDEO_URL, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${googleToken}`,
      'content-type': 'text/plain;charset=UTF-8',
      'accept': '*/*'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Start Video Gen Failed: ${txt}`);
  }

  const data = await response.json();
  // Handle multiple response shapes:
  // Legacy: data.responses[0].operation.name
  // New: data.operations[0].operation.name and data.operations[0].sceneId
  const opName = data?.responses?.[0]?.operation?.name || data?.operations?.[0]?.operation?.name;
  const returnedSceneId = data?.operations?.[0]?.sceneId || sceneId;

  if (!opName) {
    throw new Error("No operation name returned for video gen");
  }

  // Best-effort: persist the start response to DB (veo_video_tasks)
  try {
    await logVeoVideoTaskToDb(opName, returnedSceneId, data?.operations?.[0]?.status || null, data);
  } catch (e) {
    console.warn('Failed to log veo video task to DB:', e);
  }

  return { operationName: opName, sceneId: returnedSceneId };
};

/**
 * Starts the Veo3 video generation task using a start AND end image.
 * Uses the Google Labs start+end endpoint which accepts both `startImage` and `endImage`.
 * Returns { operationName, sceneId } similar to startVeoVideoGeneration.
 */
export const startVeoStartEndVideoGeneration = async (
  prompt: string,
  startMediaId: string,
  endMediaId: string,
  googleToken: string,
  options?: {
    projectId?: string;
    tool?: string;
    userPaygateTier?: string;
    videoModelKey?: string;
  }
): Promise<{ operationName: string, sceneId: string }> => {
  const sceneId = crypto.randomUUID();

  const payload = {
    clientContext: {
      sessionId: `;${Date.now()}`,
      projectId: options?.projectId || "89ce78f2-876e-4c07-ae58-f2226d1ac578",
      tool: options?.tool || "PINHOLE",
      userPaygateTier: options?.userPaygateTier || "PAYGATE_TIER_TWO"
    },
    requests: [
      {
        aspectRatio: "VIDEO_ASPECT_RATIO_LANDSCAPE",
        seed: Math.floor(Math.random() * 100000),
        textInput: { prompt },
        videoModelKey: "veo_3_1_i2v_s_fast_ultra_fl",
        startImage: { mediaId: startMediaId },
        endImage: { mediaId: endMediaId },
        metadata: { sceneId }
      }
    ]
  };

  const response = await fetch(GOOGLE_GEN_VIDEO_STARTEND_URL, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${googleToken}`,
      'content-type': 'text/plain;charset=UTF-8',
      'accept': '*/*'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Start+End Video Gen Failed: ${txt}`);
  }

  const data = await response.json();
  const opName = data?.responses?.[0]?.operation?.name || data?.operations?.[0]?.operation?.name;
  const returnedSceneId = data?.operations?.[0]?.sceneId || sceneId;

  if (!opName) {
    throw new Error("No operation name returned for start+end video gen");
  }

  try {
    await logVeoVideoTaskToDb(opName, returnedSceneId, data?.operations?.[0]?.status || null, data);
  } catch (e) {
    console.warn('Failed to log veo video task to DB (start+end):', e);
  }

  return { operationName: opName, sceneId: returnedSceneId };
};

/**
 * Polls the Veo3 task status
 */
export const pollVeoVideoStatus = async (
  operationName: string, 
  sceneId: string,
  googleToken: string,
  onUpdate?: (msg: string) => void
): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 60; // 60 * 5s = 5 mins

  while (attempts < maxAttempts) {
    await delay(5000); // 5 sec delay
    attempts++;
    if (onUpdate) onUpdate(`Polling attempt ${attempts}/${maxAttempts}...`);

    const payload = {
      operations: [
        {
          operation: { name: operationName },
          sceneId: sceneId,
          status: "MEDIA_GENERATION_STATUS_PENDING"
        }
      ]
    };

    const response = await fetch(GOOGLE_CHECK_STATUS_URL, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${googleToken}`,
        'content-type': 'text/plain;charset=UTF-8',
        'accept': '*/*'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn("Poll check failed, retrying...");
      continue;
    }

    const data = await response.json();
    const resultOp = data?.operations?.[0];
    
    // Check for done
    // Success structure typically has `response` with `videoResult`
    // Persist status for this operation (best-effort)
    try {
      const opName = resultOp?.operation?.name || operationName;
      const opSceneId = resultOp?.sceneId || sceneId;
      const opStatus = resultOp?.status || (resultOp?.done ? 'MEDIA_GENERATION_STATUS_DONE' : null);

      // If status indicates success, extract video URL(s) and serving/preview URI
      let extractedUrl: string | null = null;
      let servingBaseUri: string | null = null;
      if (opStatus === 'MEDIA_GENERATION_STATUS_SUCCESSFUL' || resultOp?.done) {
        extractedUrl = resultOp?.response?.videoResult?.video?.uri
          || resultOp?.response?.fifeUrl
          || resultOp?.operation?.metadata?.video?.fifeUrl
          || resultOp?.operation?.metadata?.video?.mediaUri
          || null;

        servingBaseUri = resultOp?.operation?.metadata?.video?.servingBaseUri
          || resultOp?.response?.videoResult?.video?.servingBaseUri
          || resultOp?.response?.servingBaseUri
          || null;
      }

      await upsertVeoVideoTask(opName, opSceneId, opStatus, resultOp, extractedUrl, servingBaseUri);
      // If the operation status is explicitly successful, stop polling and return URL (if available)
      if (opStatus === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
        if (extractedUrl) return extractedUrl;
        // If no URL found yet, return empty string to indicate success but no URL
        return '';
      }
    } catch (e) {
      console.warn('Failed to upsert veo video task status:', e);
    }
  }
  

  throw new Error("Polling timed out for video generation");
};

// --- EXPORT HÀM KIỂM TRA LINK HẾT HẠN ---
export async function ensureValidMediaUrl({
  type,
  mediaId,
  url,
  googleToken,
  operationName,
  sceneId,
  updateDb,
}: {
  type: 'image' | 'video';
  mediaId?: string;
  url: string;
  googleToken: string;
  operationName?: string;
  sceneId?: string;
  updateDb: (newUrl: string, statusInfo?: { status?: string; error?: { code?: number; message?: string } }) => Promise<void>;
}): Promise<string> {
  async function isUrlExpired(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return !res.ok;
    } catch {
      return true;
    }
  }

  // Nếu URL ban đầu là null, bỏ qua kiểm tra và lấy URL mới
  if (!url) {
    console.warn('URL is null, attempting to fetch a new URL...');
  } else if (!(await isUrlExpired(url))) {
    return url;
  }

  if (type === 'image' && mediaId) {
    try {
      const imgRes = await fetchVeo3ImageResult(mediaId, googleToken);
      const newUrl = imgRes?.image?.fifeUrl || imgRes?.media?.[0]?.image?.fifeUrl || imgRes?.userUploadedImage?.fifeUrl || null;
      if (newUrl) {
        await updateDb(newUrl);
        return newUrl;
      }
    } catch (e) {
      console.warn('Failed to refetch image URL:', e);
    }
  }

  if (type === 'video' && operationName && sceneId) {
    try {
      const payload = {
        operations: [
          {
            operation: { name: operationName },
            sceneId: sceneId,
            status: 'MEDIA_GENERATION_STATUS_PENDING',
          },
        ],
      };
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
        let extractedUrl: string | null = null;
        let statusInfo: { status?: string; error?: { code?: number; message?: string } } = {};
        statusInfo.status = resultOp?.status;
        statusInfo.error = resultOp?.operation?.error || resultOp?.error || undefined;
        if (
          resultOp?.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL' ||
          resultOp?.done
        ) {
          extractedUrl =
            resultOp?.response?.videoResult?.video?.uri ||
            resultOp?.response?.fifeUrl ||
            resultOp?.operation?.metadata?.video?.fifeUrl ||
            resultOp?.operation?.metadata?.video?.mediaUri ||
            null;
        }
        if (extractedUrl) {
          await updateDb(extractedUrl, statusInfo);
          return extractedUrl;
        } else {
          // Nếu status là FAILED thì vẫn gọi updateDb để lưu trạng thái lỗi
          if (statusInfo.status === 'MEDIA_GENERATION_STATUS_FAILED') {
            await updateDb('', statusInfo);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to refetch video URL:', e);
    }
  }

  // Trả về URL cũ nếu không lấy được URL mới
  return url || '';
}
