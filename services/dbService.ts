
import { getSupabaseClient } from './supabaseClient';
import { DbTaskRecord, DbUploadRecord, ProcessedTask, UploadResponse } from '../types';

/**
 * Checks if a filename already exists in the database
 */
export const checkFileNameExists = async (fileName: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('sora_uploads')
    .select('id')
    .eq('file_name', fileName)
    .limit(1);

  if (error) {
    console.error('Error checking filename:', error);
    return false;
  }

  return data && data.length > 0;
};

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
 * Fetches the task generation history from Supabase
 */
export const fetchTaskHistory = async (): Promise<DbTaskRecord[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sora_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching task history:', error);
    return [];
  }
  return data as DbTaskRecord[];
};

/**
 * Logs a new upload to Supabase
 * Extracts only the URL and ID from the response
 */
export const logUploadToDb = async (fileName: string, response: UploadResponse) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // Logic trích xuất dữ liệu từ response JSON của Sora
  const record = {
    file_name: fileName,
    file_id: response.id || response.file_id, 
    upload_media_id: response.id || response.upload_media_id,
    file_url: response.url // Chỉ lưu URL string
  };

  const { error } = await supabase.from('sora_uploads').insert([record]);

  if (error) {
    console.error('❌ Error saving upload to DB:', error);
  } else {
    console.log('✅ Upload saved to DB:', fileName);
  }
};

/**
 * Logs a completed or failed task to Supabase
 * Extracts specific image URLs from the complex task response
 */
export const logTaskToDb = async (task: ProcessedTask) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("⚠️ No Supabase client found, skipping DB log.");
    return;
  }

  console.log("💾 Logging Task to DB:", task.id);

  // Logic trích xuất URL từ Task Response
  let resultUrls: string[] = [];
  if (task.status === 'COMPLETED' && task.result && task.result.generations) {
     // Map qua mảng generations để lấy encodings.source.path hoặc url
     resultUrls = task.result.generations
        .map((gen: any) => gen.encodings?.source?.path || gen.url)
        .filter((url: any) => typeof url === 'string');
  }

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
    // Quan trọng: Cột result_urls trong DB là TEXT, nên cần JSON.stringify mảng URL
    result_urls: JSON.stringify(resultUrls), 
    error_message: task.error || null
  };

  const { error } = await supabase.from('sora_tasks').insert([record]);
  
  if (error) {
    console.error('❌ Error saving task to DB:', error);
  } else {
    console.log('✅ Task saved to DB successfully:', record);
  }
};

/**
 * Deletes an upload record from Supabase
 */
export const deleteUploadRecord = async (id: number): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('sora_uploads')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting upload:', error);
    return false;
  }
  return true;
};

/**
 * Deletes a task record from Supabase
 */
export const deleteTaskRecord = async (id: number): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('sora_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }
  return true;
};
