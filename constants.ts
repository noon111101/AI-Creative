
// Changed to Absolute URLs for Direct Browser Access (requires CORS Extension)
export const GEN_API_URL = 'https://sora.chatgpt.com/backend/video_gen';
export const STATUS_API_URL = 'https://sora.chatgpt.com/backend/recent_tasks';
export const UPLOAD_API_URL = 'https://sora.chatgpt.com/backend/uploads';
export const POLLING_INTERVAL_MS = 8000;
export const MAX_POLLING_ATTEMPTS = 100;

// Removed Auth/Supabase storage keys to enforce ENV usage
export const STORAGE_KEYS = {
  // Only keeping keys that are strictly UI preferences if any (none for now)
};

// --- CONFIGURATION / ENVIRONMENT VARIABLES ---
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    const env = import.meta.env;
    return (env && env[key]) || '';
  } catch (e) {
    console.warn('Environment variable access failed', e);
    return '';
  }
};

export const DEFAULT_API_TOKENS = {
  authToken: getEnv('VITE_AUTH_TOKEN'),      
  sentinelToken: getEnv('VITE_SENTINEL_TOKEN')   
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