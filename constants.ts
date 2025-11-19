export const GEN_API_URL = '/backend/video_gen';
export const STATUS_API_URL = '/backend/recent_tasks';
export const POLLING_INTERVAL_MS = 8000;
export const MAX_POLLING_ATTEMPTS = 100;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'batchgen_auth_token',
  SENTINEL_TOKEN: 'batchgen_sentinel_token',
};

// --- CONFIGURATION / ENVIRONMENT VARIABLES ---
// Safe access to import.meta.env to prevent "Cannot read properties of undefined"
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

export const INITIAL_JSON_TEMPLATE = `[
  {
    "prompt": "A cinematic, 3D realistic, live-action movie still of Spider-Man (Miles Morales variant). He is crouching on a wet, neon-lit rooftop in a futuristic New York City, looking down at the street below. Rain is falling, catching the light from his suit. The focus is on the reflection of the city lights in his mask. The scene should be dynamic, capturing the feeling of 'The Leap' of faith. 8K, cinematic volumetric lighting, high detail, shallow depth of field.",
    "width": 720,
    "height": 480,
    "n_variants": 1,
    "inpaint_items": [],
    "operation": "remix",
    "model": "turbo",
    "is_storyboard": false,
    "type": "image_gen",
    "n_frames": 1
  },
  {
    "prompt": "A cinematic, 3D realistic, live-action movie still of Darth Vader standing alone on the bridge of a massive Imperial Star Destroyer. He is silhouetted against a distant, pale blue nebula visible through the enormous viewport. His red lightsaber is ignited, casting a deep crimson glow on his helmet and armor. The atmosphere is cold, imposing, and oppressive. Focus on the highly detailed textures of his suit and the metallic reflections. 8K, high detail, dramatic backlighting.",
    "width": 720,
    "height": 480,
    "n_variants": 1,
    "inpaint_items": [],
    "operation": "remix",
    "model": "turbo",
    "is_storyboard": false,
    "type": "image_gen",
    "n_frames": 1
  }
]`;