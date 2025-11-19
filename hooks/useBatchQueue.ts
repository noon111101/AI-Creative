import { useState, useCallback } from 'react';
import { TaskStatus, ProcessedTask, BatchInputItem, ApiTokens } from '../types';
import { submitGenerationTask, pollTaskUntilComplete } from '../services/apiService';

export const useBatchQueue = () => {
  const [tasks, setTasks] = useState<ProcessedTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);

  const initializeQueue = useCallback((jsonInput: string) => {
    setGlobalError(null);
    setCompletedCount(0);
    try {
      const parsed: BatchInputItem[] = JSON.parse(jsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Input must be a non-empty JSON array.");
      }

      const newTasks: ProcessedTask[] = parsed.map((item, idx) => ({
        id: crypto.randomUUID(),
        index: idx + 1,
        input: item,
        status: TaskStatus.PENDING,
        attemptCount: 0
      }));

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

      try {
        // 1. Submit
        const apiId = await submitGenerationTask(task.input, tokens);
        updateTask(task.id, { apiId, status: TaskStatus.RUNNING });

        // 2. Poll
        const result = await pollTaskUntilComplete(apiId, (attempt) => {
          updateTask(task.id, { attemptCount: attempt });
        }, tokens);

        // 3. Finalize
        if (result.status === 'completed') {
          updateTask(task.id, { status: TaskStatus.COMPLETED, result: result.data });
        } else {
          updateTask(task.id, { status: TaskStatus.FAILED, error: result.error });
        }

      } catch (err: any) {
        updateTask(task.id, { status: TaskStatus.FAILED, error: err.message });
      } finally {
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