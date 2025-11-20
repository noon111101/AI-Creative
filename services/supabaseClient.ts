import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Initializes or returns the existing Supabase client.
 * Prioritizes passed arguments, then falls back to environment variables/constants.
 */
export const getSupabaseClient = (manualUrl?: string, manualKey?: string): SupabaseClient | null => {
  // 1. Try to use manual credentials if provided (e.g., from UI)
  if (manualUrl && manualKey) {
    // If instance exists but with different credentials, recreate it
    // Note: accessing private properties like 'supabaseUrl' isn't standard in TS type, 
    // so we just create a new one if manual keys are passed to be safe.
    supabaseInstance = createClient(manualUrl, manualKey);
    return supabaseInstance;
  }

  // 2. Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // 3. Fallback to Config/Env variables
  if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
    try {
      supabaseInstance = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      return supabaseInstance;
    } catch (error) {
      console.error("Failed to initialize Supabase client from Env:", error);
      return null;
    }
  }

  return null;
};

/**
 * Simple check to see if connection parameters are valid format
 */
export const validateSupabaseConfig = (url: string, key: string) => {
  return url.startsWith('https://') && key.length > 20;
};