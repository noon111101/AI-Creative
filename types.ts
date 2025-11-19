export interface BatchInputItem {
  prompt: string;
  width?: number;
  height?: number;
  [key: string]: any;
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
  media_url?: string;
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
}