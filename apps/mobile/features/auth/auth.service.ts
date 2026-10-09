import * as Linking from 'expo-linking';

import { requireSupabase } from '@/lib/supabase/client';
import type { UiLanguage } from '@/types/database';

import { toAuthActionError } from './auth.errors';

async function run<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw toAuthActionError(error);
  }
}

export function signIn(email: string, password: string): Promise<void> {
  return run(async () => {
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  });
}

/**
 * Creates the account. Returns `needsEmailConfirmation: true` when the
 * Supabase project requires email confirmation (no session yet).
 */
export function signUp(
  email: string,
  password: string,
  uiLanguage: UiLanguage,
): Promise<{ needsEmailConfirmation: boolean }> {
  return run(async () => {
    const { data, error } = await requireSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { ui_language: uiLanguage },
        emailRedirectTo: Linking.createURL('/sign-in'),
      },
    });
    if (error) throw error;
    return { needsEmailConfirmation: !data.session };
  });
}

/** Ends the session everywhere; if the server is unreachable, ends it on this device. */
export function signOut(): Promise<void> {
  return run(async () => {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) {
      const { error: localError } = await client.auth.signOut({ scope: 'local' });
      if (localError) throw localError;
    }
  });
}

/** Sends the password reset email (with a one-time code). Same response for unknown emails. */
export function requestPasswordReset(email: string): Promise<void> {
  return run(async () => {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email);
    if (error) throw error;
  });
}

/** Verifies the emailed reset code. Success signs the user in for the reset. */
export function verifyRecoveryCode(email: string, code: string): Promise<void> {
  return run(async () => {
    const { error } = await requireSupabase().auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });
    if (error) throw error;
  });
}

/** Sets a new password for the signed-in user. */
export function updatePassword(newPassword: string): Promise<void> {
  return run(async () => {
    const { error } = await requireSupabase().auth.updateUser({ password: newPassword });
    if (error) throw error;
  });
}
