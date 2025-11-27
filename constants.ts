


// Helper to safely access import.meta.env without crashing
const getSafeEnv = (): any => {
  try {
    // @ts-ignore
    return (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  } catch (e) {
    return {};
  }
};

const safeEnv = getSafeEnv();

// Determine environment
// If DEV is true, we are in local development (Vite).
const IS_DEV = !!safeEnv.DEV;

// Logic:
// - Development (Local): Use relative path '/backend' to trigger Vite Proxy (with Header Spoofing)
// - Production (Vercel): Use absolute URL to bypass Vercel IP blocking (Requires CORS Extension)
const API_BASE = IS_DEV ? '/backend' : 'https://sora.chatgpt.com/backend';

export const GEN_API_URL = `${API_BASE}/video_gen`;
export const STATUS_API_URL = `${API_BASE}/v2/recent_tasks`;
export const UPLOAD_API_URL = `${API_BASE}/uploads`;

// Google Labs API Endpoints (Proxied via /v1 in vite.config.ts)
export const GOOGLE_UPLOAD_URL = '/v1:uploadUserImage';
export const GOOGLE_GEN_VIDEO_URL = '/v1/video:batchAsyncGenerateVideoStartImage';
// Endpoint that supports both start and end images for start+end frame generation
export const GOOGLE_GEN_VIDEO_STARTEND_URL = '/v1/video:batchAsyncGenerateVideoStartAndEndImage';
export const GOOGLE_CHECK_STATUS_URL = '/v1/video:batchCheckAsyncVideoGenerationStatus';

export const POLLING_INTERVAL_MS = 8000;
export const MAX_POLLING_ATTEMPTS = 100;

// Removed Auth/Supabase storage keys to enforce ENV usage
export const STORAGE_KEYS = {
  // Only keeping keys that are strictly UI preferences if any (none for now)
};

// --- CONFIGURATION / ENVIRONMENT VARIABLES ---
const getEnv = (key: string) => {
  try {
    const val = safeEnv[key];
    return val || '';
  } catch (e) {
    console.warn('Environment variable access failed', e);
    return '';
  }
};

export const DEFAULT_API_TOKENS = {
  authToken: getEnv('VITE_AUTH_TOKEN'),      
  sentinelToken: getEnv('VITE_SENTINEL_TOKEN'),
  googleToken: getEnv('VITE_GOOGLE_LABS_TOKEN')
};

export const SUPABASE_CONFIG = {
  url: getEnv('VITE_SUPABASE_URL'),
  anonKey: getEnv('VITE_SUPABASE_ANON_KEY')
};

export const ASPECT_RATIOS = {
  '3:2': { width: 720, height: 480 },
  '2:3': { width: 360, height: 540 }
};

export const VARIANT_OPTIONS = [1, 2];

export const INITIAL_JSON_TEMPLATE = `[
  {
    "prompt": "A cinematic, 3D realistic, live-action movie still of Spider-Man (Miles Morales variant)..."
  },
  {
    "prompt": "A cinematic, 3D realistic, live-action movie still of Naruto Uzumaki...",
    "upload_media_id": "media_01k922f2sben1tfpm6ch0t184z"
  }
]`;