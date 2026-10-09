import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { envResult } from '@/lib/env';
import type { Database } from '@/types/database';

import { sessionStorage } from './secure-session-storage';

export type AppSupabaseClient = SupabaseClient<Database>;

/**
 * The single Supabase client. `null` when public configuration is missing;
 * the app then shows a configuration screen instead of crashing.
 * Only the publishable key is used here — never a service key.
 */
export const supabase: AppSupabaseClient | null = envResult.ok
  ? createClient<Database>(
      envResult.env.EXPO_PUBLIC_SUPABASE_URL,
      envResult.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          storage: sessionStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    )
  : null;

export function requireSupabase(): AppSupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}
