import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { queryClient } from './queryClient';

/** TanStack Query with React Native focus handling (refetch when the app returns). */
export function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
