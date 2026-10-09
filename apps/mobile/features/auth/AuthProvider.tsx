import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { queryClient } from '@/lib/query/queryClient';
import { supabase } from '@/lib/supabase/client';
import { useOnboardingDraftStore } from '@/stores/onboardingDraft.store';

export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  /**
   * True while the password reset flow runs. Verifying the reset code signs
   * the user in, but they must stay on the reset screen until the new
   * password is saved, so protected routes stay closed meanwhile.
   */
  isRecoveringPassword: boolean;
  setRecoveringPassword: (value: boolean) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'initializing' : 'signedOut');
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    // Restore the stored session (refreshing it if the access token expired).
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setStatus(data.session ? 'signedIn' : 'signedOut');
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setStatus('signedOut');
      });

    // Keep state in sync with sign in, sign out and token refresh.
    // Only synchronous work here: Supabase warns against awaiting inside this callback.
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setStatus(nextSession ? 'signedIn' : 'signedOut');
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        // Drafts may hold personal answers; do not leave them on a shared device.
        useOnboardingDraftStore.getState().clearAll();
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Refresh tokens only while the app is in the foreground (Supabase guidance for mobile).
  useEffect(() => {
    const client = supabase;
    if (!client || Platform.OS === 'web') return;
    if (AppState.currentState === 'active') void client.auth.startAutoRefresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
    return () => subscription.remove();
  }, []);

  const setRecoveringPassword = useCallback((value: boolean) => setIsRecoveringPassword(value), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      isRecoveringPassword,
      setRecoveringPassword,
    }),
    [status, session, isRecoveringPassword, setRecoveringPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
