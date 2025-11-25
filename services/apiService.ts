
import { 
  GEN_API_URL, 
  STATUS_API_URL, 
  UPLOAD_API_URL,
  GOOGLE_UPLOAD_URL,
  GOOGLE_GEN_VIDEO_URL,
  GOOGLE_CHECK_STATUS_URL,
  POLLING_INTERVAL_MS, 
  MAX_POLLING_ATTEMPTS 
} from '../constants';
import { ApiResponse, BatchInputItem, PollingResult, ApiTokens, UploadResponse } from '../types';

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
export const uploadImageToGoogleLabs = async (jpegBase64: string, googleToken: string): Promise<string> => {
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
  // Expecting data.imageResult.mediaId
  if (data?.imageResult?.mediaId) {
    return data.imageResult.mediaId;
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
        projectId: "6544d32f-ac52-499d-8ec2-0eb0e1588330", // Fixed ID from example
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
  // Expecting data.responses[0].operation.name
  const opName = data?.responses?.[0]?.operation?.name;
  if (!opName) throw new Error("No operation name returned for video gen");

  return { operationName: opName, sceneId };
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
    if (resultOp?.done) {
       // Check for success data
       const videoUri = resultOp?.response?.videoResult?.video?.uri;
       if (videoUri) return videoUri;

       // Check for error
       if (resultOp?.error) {
         throw new Error(`Video Gen Failed: ${JSON.stringify(resultOp.error)}`);
       }
       
       // Fallback
       if (resultOp?.response) {
         // Sometimes structure varies
         return resultOp.response.videoResult?.video?.uri || "";
       }
    }
  }
  
  throw new Error("Polling timed out for video generation");
};
