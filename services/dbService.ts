import { getSupabaseClient } from './supabaseClient';
import { DbTaskRecord, DbUploadRecord, ProcessedTask, UploadResponse } from '../types';

/**
 * Fetches the list of uploaded files from Supabase
 */
export const fetchUploadHistory = async (): Promise<DbUploadRecord[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sora_uploads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching uploads:', error);
    return [];
  }
  return data as DbUploadRecord[];
};

/**
 * Logs a new upload to Supabase
 */
export const logUploadToDb = async (fileName: string, response: UploadResponse) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const record = {
    file_name: fileName,
    file_id: response.file_id || null,
    upload_media_id: response.upload_media_id || null, // Ensure this field exists in API response
    raw_response: response
  };

  const { error } = await supabase.from('sora_uploads').insert([record]);

  if (error) {
    console.error('Error saving upload to DB:', error);
    throw new Error('Failed to save upload record to database');
  }
};

/**
 * Logs a completed or failed task to Supabase
 */
export const logTaskToDb = async (task: ProcessedTask) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const record: DbTaskRecord = {
    prompt: task.input.prompt,
    status: task.status,
    config: {
      width: task.input.width,
      height: task.input.height,
      n_variants: task.input.n_variants,
      model: task.input.model,
      operation: task.input.operation
    },
    result_data: task.result || null,
    error_message: task.error || null
  };

  const { error } = await supabase.from('sora_tasks').insert([record]);
  
  if (error) {
    console.error('Error saving task to DB:', error);
  }
};
