import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider';
import { profileKeys } from '@/features/profile/useProfile';
import { createQueryClient } from '@/lib/query/queryClient';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import type { ProfileRow } from '@/types/database';

import { completeProfile, testSession } from './fixtures';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

type ProviderOptions = {
  /** Signed-in profile placed in the query cache. `null` renders signed out. */
  profile?: ProfileRow | null;
  auth?: Partial<AuthContextValue>;
};

export function renderWithProviders(
  ui: ReactElement,
  { profile = completeProfile, auth, ...options }: ProviderOptions & RenderOptions = {},
) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  if (profile) queryClient.setQueryData(profileKeys.detail(profile.id), profile);

  const authValue: AuthContextValue = {
    status: profile ? 'signedIn' : 'signedOut',
    session: profile ? testSession : null,
    user: profile ? testSession.user : null,
    isRecoveringPassword: false,
    setRecoveringPassword: jest.fn(),
    ...auth,
  };

  function Providers({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return { ...render(ui, { wrapper: Providers, ...options }), queryClient, authValue };
}
