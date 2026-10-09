/**
 * In-memory Supabase fake for Jest (auto-used via jest.mock in jest.setup.ts).
 * No test ever talks to a real server.
 */
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import type { ProfileRow } from '@/types/database';

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const listeners = new Set<Listener>();

export const fakeDb: {
  session: Session | null;
  profile: ProfileRow | null;
  profileError: Error | null;
} = {
  session: null,
  profile: null,
  profileError: null,
};

function profileResult() {
  return Promise.resolve(
    fakeDb.profileError
      ? { data: null, error: fakeDb.profileError }
      : { data: fakeDb.profile, error: null },
  );
}

type FakeQuery = {
  select: jest.Mock<FakeQuery, []>;
  eq: jest.Mock<FakeQuery, [string, unknown]>;
  update: jest.Mock<FakeQuery, [Partial<ProfileRow>]>;
  single: jest.Mock<ReturnType<typeof profileResult>, []>;
};

function createQuery(): FakeQuery {
  const query: FakeQuery = {
    select: jest.fn(() => query),
    eq: jest.fn((_column: string, _value: unknown) => query),
    update: jest.fn((changes: Partial<ProfileRow>) => {
      if (fakeDb.profile && !fakeDb.profileError) {
        fakeDb.profile = { ...fakeDb.profile, ...changes, updated_at: new Date().toISOString() };
      }
      return query;
    }),
    single: jest.fn(profileResult),
  };
  return query;
}

export const supabase = {
  auth: {
    getSession: jest.fn(async () => ({ data: { session: fakeDb.session }, error: null })),
    onAuthStateChange: jest.fn((listener: Listener) => {
      listeners.add(listener);
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    }),
    startAutoRefresh: jest.fn(async () => undefined),
    stopAutoRefresh: jest.fn(async () => undefined),
    signInWithPassword: jest.fn(async () => ({ data: {}, error: null })),
    signUp: jest.fn(async () => ({ data: { session: null, user: null }, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
    verifyOtp: jest.fn(async () => ({ data: {}, error: null })),
    updateUser: jest.fn(async () => ({ data: {}, error: null })),
  },
  from: jest.fn(() => createQuery()),
};

export function requireSupabase() {
  return supabase;
}

/** Simulate Supabase reporting an auth change (sign in, sign out, refresh). */
export function emitAuthChange(event: AuthChangeEvent, session: Session | null): void {
  fakeDb.session = session;
  listeners.forEach((listener) => listener(event, session));
}

export function resetFakeSupabase(): void {
  fakeDb.session = null;
  fakeDb.profile = null;
  fakeDb.profileError = null;
  listeners.clear();
}
