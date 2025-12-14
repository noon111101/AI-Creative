// Cập nhật video_config và video_respone cho tiktok_task theo image_media_id
export const updateTiktokTaskVideoInfo = async (
  imageMediaId: string,
  videoConfig: any,
  videoRespone: any
) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from('tiktok_task')
    .update({
      video_config: videoConfig ? JSON.stringify(videoConfig) : null,
      video_respone: videoRespone ? JSON.stringify(videoRespone) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('image_media_id', imageMediaId);
  if (error) {
    console.error('❌ Error updating tiktok_task video info:', error);
  } else {
    console.log('✅ Updated tiktok_task video info for', imageMediaId);
  }
};
/**
 * Normalize and save media API response to tiktok_task table.
 * Optionally supports saving a reference image URL.
 * @param mediaApiResponse The API response object (see screenshot)
 * @param referenceImageUrl (optional) Reference image URL to associate with the task
 */
export const saveTiktokTaskFromMedia = async (
  mediaApiResponse: any,
  referenceImageUrl?: string
) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // Defensive: handle array or object
  const mediaArr = Array.isArray(mediaApiResponse.media)
    ? mediaApiResponse.media
    : [mediaApiResponse.media];

  for (const media of mediaArr) {
    const image = media.image?.generatedImage;
    if (!image) continue;
    // Chuẩn hóa trường cho schema mới
    const prompt = image.requestData?.promptInputs?.[0]?.textInput || image.prompt || '';
    const modelMediaId = (image.requestData?.imageGenerationRequestData?.imageGenerationImageInputs?.[0]?.mediaGenerationId) || null;
    const imageFileUrl = image.fifeUrl || null;
    const imageMediaId = image.mediaGenerationId || null;
    // outfit_media_id sẽ được truyền vào hàm này khi tạo ảnh với outfit, mặc định null nếu chưa có
    // video_config, video_respone sẽ được cập nhật sau khi tạo video, mặc định null
    const now = new Date().toISOString();
    const record = {
      prompt,
      model_media_id: modelMediaId,
      image_file_url: imageFileUrl,
      outfit_media_id: referenceImageUrl || null, // tạm dùng referenceImageUrl làm outfit_media_id nếu truyền vào
      video_config: null,
      video_respone: null,
      created_at: now,
      updated_at: now,
      image_media_id: imageMediaId,
    };
    const { error } = await supabase.from('tiktok_task').insert([record]);
    if (error) {
      console.error('❌ Error saving tiktok_task from media:', error, record);
    } else {
      console.log('✅ Saved tiktok_task from media:', record);
    }
  }
};
// Lấy danh sách người mẫu từ bảng tiktok_models
export const fetchTiktokModels = async (): Promise<any[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('tiktok_models').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching tiktok_models:', error);
    return [];
  }
  return data || [];
};
// Lấy danh sách task TikTok theo type
export const fetchTiktokTasks = async (): Promise<any[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('tiktok_task')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching tiktok_task:', error);
    return [];
  }
  return data || [];
};

// Lưu người mẫu vào bảng tiktok_models
export const logTiktokModelToDb = async (model: {
  name: string,
  media_id: string,
  file_url?: string,
}) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.from('tiktok_models').insert([model]);
  if (error) {
    console.error('❌ Error saving tiktok model to DB:', error);
  } else {
    console.log('✅ Tiktok model saved to DB:', model);
  }
};
// Ghi task TikTok vào bảng tiktok_task
export const logTiktokTaskToDb = async (task: {
  type: string,
  prompt?: string,
  traits?: string,
  model_media_id?: string,
  model_file_url?: string,
  outfit_media_id?: string,
  outfit_file_url?: string,
  result_media_id?: string,
  result_file_url?: string,
  video_url?: string,
  status?: string,
  error_message?: string,
}) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.from('tiktok_task').insert([task]);
  if (error) {
    console.error('❌ Error saving tiktok task to DB:', error);
  } else {
    console.log('✅ Tiktok task saved to DB:', task);
  }
};
// Hàm cập nhật video_url cho veo_video_tasks bằng supabase-js client
import { getSupabaseClient } from './supabaseClient';
export async function updateVeoVideoUrl(operationName, videoUrl) {
  const supabase = getSupabaseClient();
  console.log("Updating Veo video URL in DB:", operationName, videoUrl);
  console.log("Supabase client:", supabase);
  if (!supabase) return;
  const { data, error } = await supabase
    .from('veo_video_tasks')
    .update({ video_url: videoUrl })
    .eq('operation_name', operationName);
  if (error) throw error;
  return data;
}
/**
 * Lưu kết quả tạo ảnh từ Veo3 vào bảng veo_images (type 'ai')
 */
export const logVeoImageTaskToDb = async (
  media_generation_id: string,
  prompt: string,
  file_name: string | null,
  image_url: string | null,
  google_response: any
) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const record = {
    media_generation_id,
    prompt,
    file_name,
    image_url,
    google_response
  };
  const { error } = await supabase.from('veo_images').insert([{ ...record, type: 'ai' }]);
  if (error) {
    console.error('❌ Error saving veo image task to DB:', error);
  } else {
    console.log('✅ Veo image task saved to DB:', media_generation_id);
  }
};
/**
 * Fetches all veo_images from Supabase for use as reference images
 */
/**
 * Fetch veo_images with optional filter, limit, and order
 * @param params { type?: string, limit?: number, order?: string }
 */
export const fetchVeoImages = async (params?: { type?: string; limit?: number; order?: string }): Promise<DbVeoImageRecord[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  let query = supabase.from('veo_images').select('*');
  if (params?.type) {
    query = query.eq('type', params.type);
  }
  if (params?.order) {
    // order: 'created_at.desc' or 'created_at.asc'
    const [col, dir] = params.order.split('.');
    query = query.order(col, { ascending: dir !== 'desc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching veo_images:', error);
    return [];
  }
  return data as DbVeoImageRecord[];
};

import { DbTaskRecord, DbUploadRecord, ProcessedTask, UploadResponse, DbVeoImageRecord, DbVeoVideoRecord } from '../types';

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
export const logUploadToDb = async (fileName: string, response: UploadResponse, mediaIdVideo?: string | null) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // Logic trích xuất dữ liệu từ response JSON của Sora
  const record = {
    file_name: fileName,
    file_id: response.id || response.file_id, 
    upload_media_id: response.id || response.upload_media_id,
    file_url: response.url, // Chỉ lưu URL string
    media_id_video: mediaIdVideo ?? null
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
 * Link an existing `sora_tasks` row to a VEO media generation id.
 * Provide either `dbTaskId` (numeric) or `prompt` to find the task record.
 */
export const linkTaskToVeo = async (mediaIdVideo: string, dbTaskId?: number, prompt?: string): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('⚠️ No Supabase client available, skipping linkTaskToVeo.');
    return;
  }

  if (!dbTaskId && !prompt) {
    console.warn('⚠️ linkTaskToVeo requires dbTaskId or prompt');
    return;
  }

  let query = supabase.from('sora_tasks').update({ media_id_video: mediaIdVideo }).limit(1);
  if (dbTaskId) {
    query = query.eq('id', dbTaskId);
  } else if (prompt) {
    query = query.eq('prompt', prompt);
  }

  const { error } = await query;
  if (error) {
    console.error('❌ Error linking task to veo media id:', error);
  } else {
    console.log('✅ Linked task to veo media id:', mediaIdVideo);
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

  try {
    // Ask Supabase to return the deleted row(s) so we can be sure a row was actually removed.
    const { data, error } = await supabase
      .from('sora_tasks')
      .delete()
      .eq('id', id)
      .select('*');

    if (error) {
      console.error('Error deleting task:', error, { id });
      return false;
    }

    console.log('Deleted task record result:', { id, data });

    // If Supabase returned no rows, the delete didn't remove anything (likely RLS or mismatch).
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn('Delete reported success but no rows were returned. This usually means the delete was blocked by RLS or the id did not match.', { id, data });
      return false;
    }

    return true;
  } catch (e) {
    console.error('Exception deleting task record:', e, { id });
    return false;
  }
};

/**
 * Fetches VEO video task records from the DB
 */
export const fetchVeoVideoTasks = async (): Promise<DbVeoVideoRecord[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('veo_video_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching veo video tasks:', error);
    return [];
  }

  return data as DbVeoVideoRecord[];
};

/**
 * Find a media_id_video by the stored file URL in `sora_uploads`.
 * Returns the media_id_video string or null if not found.
 */
export const findMediaIdByFileUrl = async (fileUrl: string): Promise<string | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('sora_uploads')
    .select('media_id_video')
    .eq('file_url', fileUrl)
    .limit(1);

  if (error) {
    console.error('Error finding media_id_video by file_url:', error);
    return null;
  }

  if (data && data.length > 0) {
    return data[0].media_id_video || null;
  }
  return null;
};

/**
 * Logs a Veo3 uploaded image (mediaGenerationId + metadata) into Supabase
 */
export const logVeoImageToDb = async (
  mediaGenerationId: string,
  width?: number | null,
  height?: number | null,
  fileName?: string | null,
  rawResponse?: any,
  type?: string | null,
  fileUrl?: string | null
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('⚠️ No Supabase client available, skipping veo image DB log.');
    return;
  }

  const record: DbVeoImageRecord = {
    media_generation_id: mediaGenerationId,
    width: width ?? null,
    height: height ?? null,
    file_name: fileName ?? null,
    google_response: rawResponse ?? null,
    type: type ?? null,
    file_url: fileUrl ?? null
  };

  const { error } = await supabase.from('veo_images').insert([record]);
  if (error) {
    // Non-fatal, just log
    console.error('❌ Error saving veo image to DB:', error);
  } else {
    console.log('✅ Veo image saved to DB:', mediaGenerationId);
  }
};

/**
 * Logs a Veo3 video task (operation + sceneId + response) into Supabase
 */
export const logVeoVideoTaskToDb = async (
  operationName: string,
  sceneId?: string | null,
  status?: string | null,
  rawResponse?: any
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('⚠️ No Supabase client available, skipping veo video task DB log.');
    return;
  }

  const record: DbVeoVideoRecord = {
    operation_name: operationName,
    scene_id: sceneId ?? null,
    status: status ?? null,
    google_response: rawResponse ?? null,
    serving_base_uri: rawResponse?.operations?.[0]?.operation?.metadata?.video?.servingBaseUri || rawResponse?.operations?.[0]?.response?.videoResult?.video?.servingBaseUri || null
  };

  const { error } = await supabase.from('veo_video_tasks').insert([record]);
  if (error) {
    console.error('❌ Error saving veo video task to DB:', error);
  } else {
    console.log('✅ Veo video task saved to DB:', operationName);
  }
};

/**
 * Upsert (insert or update) a Veo video task by operation_name.
 * This is safe to call repeatedly from pollers.
 */
export const upsertVeoVideoTask = async (
  operationName: string,
  sceneId?: string | null,
  status?: string | null,
  rawResponse?: any,
  videoUrl?: string | null,
  servingBaseUri?: string | null
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('⚠️ No Supabase client available, skipping veo video task upsert.');
    return;
  }

  const record: DbVeoVideoRecord = {
    operation_name: operationName,
    scene_id: sceneId ?? null,
    status: status ?? null,
    google_response: rawResponse ?? null,
    video_url: videoUrl ?? null,
    serving_base_uri: servingBaseUri ?? null
  };

  // Use upsert to avoid unique constraint failures and to update status over time
  const { error } = await supabase.from('veo_video_tasks').upsert([record], { onConflict: 'operation_name' });

  if (error) {
    console.error('❌ Error upserting veo video task to DB:', error);
  } else {
    console.log('🔁 Veo video task upserted to DB:', operationName, status);
  }
};
