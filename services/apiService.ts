import { 
  GEN_API_URL, 
  STATUS_API_URL, 
  POLLING_INTERVAL_MS, 
  MAX_POLLING_ATTEMPTS 
} from '../constants';
import { ApiResponse, BatchInputItem, PollingResult, ApiTokens } from '../types';

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
      const response = await fetch(`${STATUS_API_URL}?limit=10`, {
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