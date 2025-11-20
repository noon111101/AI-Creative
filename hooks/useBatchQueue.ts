
import { useState, useCallback } from 'react';
import { TaskStatus, ProcessedTask, BatchInputItem, ApiTokens, SimpleBatchItem, GlobalBatchConfig } from '../types';
import { submitGenerationTask, pollTaskUntilComplete } from '../services/apiService';
import { logTaskToDb } from '../services/dbService';
import { ASPECT_RATIOS } from '../constants';

export const useBatchQueue = () => {
  const [tasks, setTasks] = useState<ProcessedTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);

  const initializeQueue = useCallback((jsonInput: string, config: GlobalBatchConfig) => {
    setGlobalError(null);
    setCompletedCount(0);
    try {
      const parsed: SimpleBatchItem[] = JSON.parse(jsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Input must be a non-empty JSON array.");
      }

      const dimensions = ASPECT_RATIOS[config.aspectRatio];

      const newTasks: ProcessedTask[] = parsed.map((item, idx) => {
        const hasMedia = !!item.upload_media_id;
        
        // --- Base Payload Construction ---
        let payload: BatchInputItem = {
            prompt: item.prompt,
            width: dimensions.width,
            height: dimensions.height,
            n_variants: config.nVariants,
            n_frames: 1,
            type: "image_gen",
            inpaint_items: []
        };

        if (hasMedia) {
            // --- Remix Mode Payload ---
            payload.operation = "remix";
            payload.model = "turbo";
            payload.is_storyboard = false;
            
            // Process Media IDs
            const mediaIds = item.upload_media_id!.split(',').map(id => id.trim()).filter(id => id);
            payload.inpaint_items = mediaIds.map(id => ({
                type: "image",
                frame_index: 0,
                preset_id: null,
                generation_id: null,
                upload_media_id: id,
                uploaded_file_id: null, // User prompt implies using upload_media_id for uploads
                source_start_frame: 0,
                source_end_frame: 0,
                crop_bounds: null,
                cameo_file_id: null
            }));

        } else {
            // --- Simple Compose Mode Payload ---
            payload.operation = "simple_compose";
            // Simple compose payload typically doesn't require 'model' or 'is_storyboard' based on provided sample,
            // but they often don't hurt. Keeping strictly to sample:
            // payload.model = "turbo"; // Uncomment if API requires it for simple_compose too
        }

        return {
            id: crypto.randomUUID(),
            index: idx + 1,
            input: payload,
            status: TaskStatus.PENDING,
            attemptCount: 0
        };
      });

      setTasks(newTasks);
      return newTasks;
    } catch (err: any) {
      setGlobalError(err.message);
      return null;
    }
  }, []);

  const updateTask = useCallback((internalId: string, updates: Partial<ProcessedTask>) => {
    setTasks(prev => prev.map(t => t.id === internalId ? { ...t, ...updates } : t));
  }, []);

  const runBatch = useCallback(async (queuedTasks: ProcessedTask[], tokens?: ApiTokens) => {
    setIsProcessing(true);
    
    // Sequential processing loop
    for (const task of queuedTasks) {
      updateTask(task.id, { status: TaskStatus.PROCESSING });
      
      let currentTaskState = { ...task, status: TaskStatus.PROCESSING };

      try {
        // 1. Submit
        const apiId = await submitGenerationTask(task.input, tokens);
        updateTask(task.id, { apiId, status: TaskStatus.RUNNING });
        currentTaskState = { ...currentTaskState, apiId, status: TaskStatus.RUNNING };

        // 2. Poll
        const result = await pollTaskUntilComplete(apiId, (attempt) => {
          updateTask(task.id, { attemptCount: attempt });
        }, tokens);

        // 3. Finalize
        if (result.status === 'completed') {
          const updates = { status: TaskStatus.COMPLETED, result: result.data };
          updateTask(task.id, updates);
          currentTaskState = { ...currentTaskState, ...updates };
        } else {
          const updates = { status: TaskStatus.FAILED, error: result.error };
          updateTask(task.id, updates);
          currentTaskState = { ...currentTaskState, ...updates };
        }

      } catch (err: any) {
        const updates = { status: TaskStatus.FAILED, error: err.message };
        updateTask(task.id, updates);
        currentTaskState = { ...currentTaskState, ...updates };
      } finally {
        // --- DB LOGGING ---
        // Log the final state to Supabase
        await logTaskToDb(currentTaskState);
        
        setCompletedCount(prev => prev + 1);
      }
    }

    setIsProcessing(false);
  }, [updateTask]);

  return {
    tasks,
    isProcessing,
    globalError,
    completedCount,
    initializeQueue,
    runBatch
  };
};
