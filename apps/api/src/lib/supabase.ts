import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_TIMEOUT_MS = 5_000;

/** The part of the Supabase client the API uses. Keeps test fakes small. */
export type UserDataClient = Pick<SupabaseClient, 'from' | 'rpc'>;

/** Creates a Supabase client that acts as one signed-in user. */
export type UserDataClientFactory = (accessToken: string) => UserDataClient;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

/**
 * Per-request clients use only the publishable key plus the user's own access
 * token, so every query runs as that user and Row Level Security applies.
 * The service role key is never used here.
 */
export function createUserDataClientFactory(config: {
  supabaseUrl: string;
  publishableKey: string;
}): UserDataClientFactory {
  return (accessToken) =>
    createClient(config.supabaseUrl, config.publishableKey, {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
        fetch: fetchWithTimeout,
      },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}
