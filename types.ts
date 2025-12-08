
export interface BatchInputItem {
  prompt: string;
  width?: number;
  height?: number;
  n_variants?: number;
  type?: string;
  operation?: string;
  model?: string;
  is_storyboard?: boolean;
  n_frames?: number;
  inpaint_items?: any[];
  [key: string]: any;
}

export interface SimpleBatchItem {
  prompt: string;
  upload_media_id?: string; // Comma separated IDs
}

export interface GlobalBatchConfig {
  aspectRatio: '3:2' | '2:3';
  nVariants: 1 | 2;
}

export enum TaskStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',     // In queue
  PROCESSING = 'PROCESSING', // Sent to API, waiting for ID/Initial response
  RUNNING = 'RUNNING',     // Polling status
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ProcessedTask {
  id: string; // Internal frontend UUID
  index: number;
  apiId?: string; // Backend ID
  input: BatchInputItem;
  status: TaskStatus;
  result?: any;
  error?: string;
  attemptCount: number;
}

export interface ApiResponse {
  id: string;
  status?: string;
  failure_reason?: string;
  generations?: any[]; // Array of generation results
  [key: string]: any;
}

export interface PollingResult {
  status: 'completed' | 'failed' | 'running';
  data?: ApiResponse;
  error?: string;
}

export interface ApiTokens {
  authToken: string;
  sentinelToken: string;
  googleToken?: string;
}

export interface UploadResponse {
  id?: string; // Media ID (media_...)
  url?: string; // Direct URL
  type?: string;
  file_id?: string;
  upload_media_id?: string; 
  [key: string]: any;
}

export interface UploadLogItem {
  fileName: string;
  timestamp: string;
  response: any;
}

// --- Database Records ---

export interface DbTaskRecord {
  id?: number;
  created_at?: string;
  prompt: string;
  status: string;
  config: any;
  result_urls?: string; // Changed to string to match Postgres TEXT column (JSON stringified)
  error_message?: string | null;
  media_id_video?: string | null; // Optional Google Labs mediaGenerationId if this task used a VEO image
}

export interface DbUploadRecord {
  id: number;
  created_at: string;
  file_name: string;
  file_id?: string;
  upload_media_id?: string;
  file_url?: string; // Changed to matches Postgres TEXT column
  media_id_video?: string | null; // Google Labs mediaGenerationId (if uploaded to VEO3)
}

export interface DbVeoImageRecord {
  media_generation_id: string;
  width?: number | null;
  height?: number | null;
  file_name?: string | null;
  google_response?: any;
  type?: string | null;
  file_url?: string | null;
}

export interface DbVeoVideoRecord {
  id?: number;
  created_at?: string;
  operation_name: string; // operation.name returned by start video API
  scene_id?: string | null; // sceneId associated with the operation
  status?: string | null; // current status e.g., MEDIA_GENERATION_STATUS_PENDING
  google_response?: any; // full JSON response stored as JSONB
  video_url?: string | null; // extracted playable video URL when available
  serving_base_uri?: string | null; // thumbnail/preview image for the video task
}