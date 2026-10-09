import '@/lib/i18n';

// Never talk to a real Supabase project from tests: lib/supabase/__mocks__/client.ts.
jest.mock('@/lib/supabase/client');

// Public config is inlined at build time; tests use fixed placeholder values.
jest.mock('@/lib/env', () => ({
  envResult: {
    ok: true,
    env: {
      EXPO_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_placeholder_key',
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from(require('crypto').randomBytes(count) as Uint8Array),
}));

// Jest has no Expo manifest, so expo-linking cannot read the app scheme.
jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  createURL: (path: string) => `aimentor://${path.replace(/^\//, '')}`,
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

beforeEach(() => {
  const { resetFakeSupabase } = jest.requireMock('@/lib/supabase/client') as {
    resetFakeSupabase: () => void;
  };
  resetFakeSupabase();
  // Onboarding drafts persist in a module-level store; start every test empty.
  (
    jest.requireActual(
      '@/stores/onboardingDraft.store',
    ) as typeof import('@/stores/onboardingDraft.store')
  ).useOnboardingDraftStore
    .getState()
    .clearAll();
  // The app-wide query cache is a module singleton; start every test empty.
  (
    jest.requireActual('@/lib/query/queryClient') as typeof import('@/lib/query/queryClient')
  ).queryClient.clear();
});
